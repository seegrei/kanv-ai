import { useState, useRef, useEffect, useMemo, memo, useCallback, useImperativeHandle } from 'react'
import { Editor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import SlashCommands from '../../../lib/tiptap/SlashCommands'
import CustomDocument from '../../../lib/tiptap/CustomDocument'
import { getSuggestionItems, renderItems } from '../../../lib/tiptap/SlashCommandsSuggestion/SlashCommandsSuggestion'
import Block from '../Block/Block'
import GeneratePopup from '../../dialogs/GeneratePopup/GeneratePopup'
import useBlock from '../../../hooks/useBlock'
import useAIGeneration from '../../../hooks/useAIGeneration'
import useSelectionStore from '../../../store/useSelectionStore'
import useHistoryStore from '../../../store/useHistoryStore'
import { ELEMENT } from '../../../constants'
import UpdateContentCommand from '../../../commands/UpdateContentCommand'
import './TextBlock.css'
import './TiptapEditor.css'
import '../../dialogs/SlashCommandMenu/SlashCommandMenu.css'
import 'tippy.js/dist/tippy.css'

const TextBlock = memo(({ id, x, y, width, height, content, isSelected, isMultipleSelected, selectedIds, onClick, onMouseDown, onUpdate, onUpdateMultiple, onDragEnd, onResizeEnd, onAddBlockAt, onRuntimeBoundsChange, zoomRef, offsetRef, multipleDrag }) => {
    // Edit mode state
    const [isEditMode, _setIsEditMode] = useState(false)
    const { setEditMode: setStoreEditMode, clearEditMode: clearStoreEditMode } = useSelectionStore()
    const initialContentRef = useRef(null)

    // Wrapper to sync local and store edit mode
    const setIsEditMode = useCallback((editMode) => {
        if (editMode) {
            // Entering edit mode - save initial content
            initialContentRef.current = content
            _setIsEditMode(true)
            setStoreEditMode(id)
        } else {
            // Exiting edit mode - check if content changed and create command
            const currentContent = tiptapEditorRef.current?.getHTML() || content

            if (initialContentRef.current !== null && initialContentRef.current !== currentContent) {
                // Content changed - create and execute UpdateContentCommand
                const command = new UpdateContentCommand(
                    id,
                    initialContentRef.current,
                    currentContent
                )
                useHistoryStore.getState().executeCommand(command)
            }

            initialContentRef.current = null
            _setIsEditMode(false)
            clearStoreEditMode()
        }
    }, [id, content, setStoreEditMode, clearStoreEditMode])

    // Tiptap Editor state and refs
    const [isEditorReady, setIsEditorReady] = useState(false)
    const editorRef = useRef(null)
    const tiptapEditorRef = useRef(null)
    const isUpdatingRef = useRef(false)
    const onChangeRef = useRef(null)
    const clickPositionRef = useRef(null)

    // Use common block logic
    const block = useBlock({
        id,
        x,
        y,
        width,
        height,
        isSelected,
        isMultipleSelected,
        onClick,
        onMouseDown,
        onUpdate,
        onDragEnd,
        onResizeEnd,
        zoomRef,
        offsetRef,
        multipleDrag,
        resizeConfig: {
            minWidth: ELEMENT.TEXT_BLOCK.MIN_WIDTH,
            minHeight: ELEMENT.TEXT_BLOCK.MIN_HEIGHT,
            horizontalOnly: true
        }
    })

    // Calculate display coordinates (runtime position during drag/resize)
    const displayWidth = block.localSize ? block.localSize.width : (width || ELEMENT.TEXT_BLOCK.MIN_WIDTH)
    const displayHeight = height || ELEMENT.TEXT_BLOCK.MIN_HEIGHT
    const displayX = block.resizeLocalPosition ? block.resizeLocalPosition.x : (block.localPosition ? block.localPosition.x : x)
    const displayY = block.resizeLocalPosition ? block.resizeLocalPosition.y : (block.localPosition ? block.localPosition.y : y)

    // AI Generation logic - use display coordinates for real-time positioning
    const generation = useAIGeneration({
        type: 'text',
        id,
        x: displayX,
        y: displayY,
        width: displayWidth,
        height: displayHeight,
        currentContent: content,
        onUpdate,
        onAddBlockAt,
        onClick,
        isSelected
    })

    // Content change handler
    const handleContentChange = useCallback((html) => {
        onUpdate(id, { content: html })
    }, [id, onUpdate])

    // Keep onChange ref up to date
    useEffect(() => {
        onChangeRef.current = handleContentChange
    }, [handleContentChange])

    // Memoize Tiptap extensions to avoid unnecessary recreations
    const editorExtensions = useMemo(() => [
        CustomDocument,
        StarterKit.configure({
            heading: {
                levels: [1, 2, 3]
            },
            document: false
        }),
        Placeholder.configure({
            placeholder: `Write, type '/' for commands...`,
        }),
        TaskList,
        TaskItem.configure({
            nested: true,
            HTMLAttributes: {
                class: 'task-item'
            }
        }),
        SlashCommands.configure({
            suggestion: {
                items: getSuggestionItems,
                render: renderItems
            }
        })
    ], [])

    // Initialize Tiptap editor once
    useEffect(() => {
        if (!tiptapEditorRef.current) {
            tiptapEditorRef.current = new Editor({
                extensions: editorExtensions,
                content: content || '',
                editable: isEditMode,
                onUpdate: ({ editor }) => {
                    const html = editor.getHTML()
                    if (onChangeRef.current && !isUpdatingRef.current) {
                        onChangeRef.current(html)
                    }
                },
                editorProps: {
                    attributes: {
                        class: 'tiptap-editor',
                        'data-editable': 'false'
                    }
                }
            })
            setIsEditorReady(true)
        }

        return () => {
            if (tiptapEditorRef.current) {
                tiptapEditorRef.current.destroy()
                tiptapEditorRef.current = null
            }
        }
    }, [editorExtensions])

    // Expose focus method via ref
    useImperativeHandle(editorRef, () => ({
        focus: () => {
            tiptapEditorRef.current?.commands.focus()
        },
        getElement: () => {
            return tiptapEditorRef.current?.view.dom
        }
    }))

    // Update content when it changes externally
    useEffect(() => {
        if (tiptapEditorRef.current && content !== tiptapEditorRef.current.getHTML()) {
            isUpdatingRef.current = true
            tiptapEditorRef.current.commands.setContent(content || '', false)
            setTimeout(() => {
                isUpdatingRef.current = false
            }, 0)
        }
    }, [content])

    // Update editable state and attributes
    useEffect(() => {
        if (tiptapEditorRef.current) {
            tiptapEditorRef.current.setEditable(isEditMode)
            const editorElement = tiptapEditorRef.current.view.dom
            if (editorElement) {
                editorElement.setAttribute('data-editable', isEditMode ? 'true' : 'false')
            }

            // Clear text selection when exiting edit mode
            if (!isEditMode) {
                tiptapEditorRef.current.commands.blur()
            }
        }
    }, [isEditMode])

    // Focus when entering edit mode
    useEffect(() => {
        if (tiptapEditorRef.current && isEditMode) {
            setTimeout(() => {
                if (clickPositionRef.current) {
                    // Set cursor position based on click coordinates
                    const { clientX, clientY } = clickPositionRef.current
                    const pos = tiptapEditorRef.current.view.posAtCoords({ left: clientX, top: clientY })
                    if (pos) {
                        tiptapEditorRef.current.commands.focus()
                        tiptapEditorRef.current.commands.setTextSelection(pos.pos)
                    }
                    clickPositionRef.current = null
                } else {
                    // Fallback to end if no click position
                    tiptapEditorRef.current.commands.focus('end')
                }
            }, 10)
        }
    }, [isEditMode])

    // Manage edit mode state
    useEffect(() => {
        if (isSelected && !isMultipleSelected && isEditMode) {
            if (editorRef.current) {
                editorRef.current.focus()
            }
        } else if (!isSelected) {
            setIsEditMode(false)
        } else if (isMultipleSelected) {
            setIsEditMode(false)
        }
    }, [isSelected, isMultipleSelected, isEditMode])

    // Text block specific click handler
    const handleClick = useCallback((e) => {
        if (block.wasDragged?.current || block.wasResized?.current) {
            return
        }
        if (e.target.closest('.tiptap-editor') || e.target.closest('.generate-popup') || e.target.classList.contains('resize-handle') || e.target.classList.contains('resize-edge')) {
            return
        }

        // Only enter edit mode if element was already selected BEFORE the mouseDown event
        if (block.wasSelectedBeforeMouseDownRef.current && isSelected && !isMultipleSelected) {
            // Save click position for cursor placement
            clickPositionRef.current = { clientX: e.clientX, clientY: e.clientY }
            setIsEditMode(true)
        } else {
            block.baseHandleClick()
        }
    }, [isSelected, isMultipleSelected, block])

    // Text block specific mouse down handler
    const handleMouseDown = useCallback((e) => {
        // Skip if clicking on editor or input
        if (e.target.closest('.tiptap-editor') || e.target.tagName === 'INPUT') {
            return
        }
        block.handleMouseDown(e)
    }, [block])

    // Report runtime bounds to parent for toolbar position updates
    useEffect(() => {
        if (onRuntimeBoundsChange && isSelected && !isMultipleSelected) {
            // Only report if block is being dragged or resized
            if (block.isDragging || block.isResizing) {
                onRuntimeBoundsChange(id, {
                    x: displayX,
                    y: displayY,
                    width: displayWidth,
                    height: displayHeight
                })
            }
        }
    }, [displayX, displayY, displayWidth, displayHeight, block.isDragging, block.isResizing, isSelected, isMultipleSelected, id, onRuntimeBoundsChange])

    // Track display width for height recalculation
    const prevWidthRef = useRef(displayWidth)

    // Auto-adjust height based on content
    useEffect(() => {
        if (!tiptapEditorRef.current) return

        const editorElement = tiptapEditorRef.current.view.dom
        if (!editorElement) return

        let timeoutId = null
        const updateHeight = () => {
            if (timeoutId) clearTimeout(timeoutId)
            timeoutId = setTimeout(() => {
                // Force reflow to ensure width is applied before reading scrollHeight
                editorElement.offsetHeight

                // Get the actual content height based on current width
                // scrollHeight already includes the padding of tiptap-editor (16px * 2)
                const contentHeight = editorElement.scrollHeight
                const newHeight = Math.max(contentHeight, ELEMENT.TEXT_BLOCK.MIN_HEIGHT)

                const currentHeight = height || ELEMENT.TEXT_BLOCK.MIN_HEIGHT

                // Update if height difference is significant (> 1px to avoid micro-adjustments)
                if (Math.abs(newHeight - currentHeight) > 1) {
                    onUpdate(id, { height: newHeight })
                }
            }, 100)
        }

        const resizeObserver = new ResizeObserver(updateHeight)
        resizeObserver.observe(editorElement)

        return () => {
            if (timeoutId) clearTimeout(timeoutId)
            resizeObserver.disconnect()
        }
    }, [id, onUpdate])

    // Separate effect to handle width changes during resize
    useEffect(() => {
        const widthChanged = Math.abs(displayWidth - prevWidthRef.current) > 1

        if (widthChanged && tiptapEditorRef.current) {
            prevWidthRef.current = displayWidth

            const editorElement = tiptapEditorRef.current.view.dom
            if (!editorElement) return

            // Recalculate height when width changes
            requestAnimationFrame(() => {
                // Force reflow
                editorElement.offsetHeight

                // scrollHeight already includes the padding of tiptap-editor (16px * 2)
                const contentHeight = editorElement.scrollHeight
                const newHeight = Math.max(contentHeight, ELEMENT.TEXT_BLOCK.MIN_HEIGHT)
                const currentHeight = height || ELEMENT.TEXT_BLOCK.MIN_HEIGHT

                if (Math.abs(newHeight - currentHeight) > 1) {
                    onUpdate(id, { height: newHeight })
                }
            })
        }
    }, [displayWidth, id, onUpdate, height])

    return (
        <>
            <Block
                ref={block.blockRef}
                type='text'
                isSelected={isSelected}
                isMultipleSelected={isMultipleSelected}
                isDragging={block.isDragging}
                isResizing={block.isResizing}
                position={{ x: displayX, y: displayY }}
                size={{ width: displayWidth, height: displayHeight }}
                onClick={handleClick}
                onMouseDown={handleMouseDown}
                onResizeMouseDown={block.handleResizeMouseDown}
                resizeEdges={['l', 'r', 'tl', 'tr', 'bl', 'br']}
                className=''
                style={{
                    zIndex: block.isDragging ? 'var(--z-block-dragging)' : (isSelected ? 'var(--z-block-selected)' : 'var(--z-block-default)')
                }}
            >
                {isEditorReady && tiptapEditorRef.current && (
                    <EditorContent editor={tiptapEditorRef.current} />
                )}
            </Block>
            {generation.showPopup && (
                <GeneratePopup {...generation.popupProps} />
            )}
        </>
    )
})

TextBlock.displayName = 'TextBlock'

export default TextBlock
