import { useEffect, useRef, useCallback } from 'react'
import useSelectionStore from '../store/useSelectionStore'
import useToolStore from '../store/useToolStore'
import useHistoryStore from '../store/useHistoryStore'
import useCanvasActions from '../store/useCanvasActions'

const useKeyboardShortcuts = (offsetRef, zoomRef, onPaste, elements, focusOnElement) => {
    const isSpacePressed = useRef(false)

    const selectedIds = useSelectionStore((state) => state.selectedIds)
    const setSelectedIds = useSelectionStore((state) => state.setSelectedIds)

    const setToolMode = useToolStore((state) => state.setToolMode)

    const undo = useHistoryStore((state) => state.undo)
    const redo = useHistoryStore((state) => state.redo)

    const {
        deleteSelectedElements,
        copySelectedElements,
        duplicateSelectedElements,
        selectAllElements,
        createTextBlock,
        createImageBlock,
        createChatBlock
    } = useCanvasActions()

    const handleDeleteElement = useCallback(() => {
        if (selectedIds.length === 0) return
        deleteSelectedElements()
    }, [selectedIds, deleteSelectedElements])

    const handleCopy = useCallback(() => {
        if (selectedIds.length === 0) return
        copySelectedElements()
    }, [selectedIds, copySelectedElements])

    const handleDuplicate = useCallback(() => {
        if (selectedIds.length === 0) return
        duplicateSelectedElements()
    }, [selectedIds, duplicateSelectedElements])

    const handleSelectNextBlock = useCallback(() => {
        if (!elements || elements.length === 0) return

        // If no block is selected, select the first one
        if (selectedIds.length === 0) {
            const firstBlockId = elements[0].id
            setSelectedIds([firstBlockId])
            if (focusOnElement) {
                setTimeout(() => focusOnElement(firstBlockId, elements), 50)
            }
            return
        }

        // Find currently selected block
        const currentId = selectedIds[0]
        const currentIndex = elements.findIndex(el => el.id === currentId)

        // Select next block (wrap around to first if at end)
        const nextIndex = currentIndex >= elements.length - 1 ? 0 : currentIndex + 1
        const nextBlockId = elements[nextIndex].id

        setSelectedIds([nextBlockId])
        if (focusOnElement) {
            setTimeout(() => focusOnElement(nextBlockId, elements), 50)
        }
    }, [elements, selectedIds, setSelectedIds, focusOnElement])

    useEffect(() => {
        const handlePasteEvent = (e) => {
            const activeElement = document.activeElement
            const isTyping = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.isContentEditable ||
                activeElement.closest('.tiptap-editor')
            )

            if (isTyping) return

            const items = e.clipboardData?.items
            if (!items) return

            // Check for images first
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    e.preventDefault()
                    const blob = items[i].getAsFile()
                    const reader = new FileReader()
                    reader.onload = (event) => {
                        onPaste(event.target.result)
                    }
                    reader.readAsDataURL(blob)
                    return
                }
            }

            // Check for text/HTML
            const htmlItem = Array.from(items).find(item => item.type === 'text/html')
            const textItem = Array.from(items).find(item => item.type === 'text/plain')

            if (htmlItem || textItem) {
                e.preventDefault()

                if (htmlItem) {
                    htmlItem.getAsString((html) => {
                        onPaste(null, { type: 'html', content: html })
                    })
                } else if (textItem) {
                    textItem.getAsString((text) => {
                        onPaste(null, { type: 'text', content: text })
                    })
                }
                return
            }

            onPaste()
        }

        const handleKeyDown = (e) => {
            const activeElement = document.activeElement
            const isTyping = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.isContentEditable ||
                activeElement.closest('.tiptap-editor')
            )

            // Handle spacebar for pan mode
            if (e.code === 'Space' && !isSpacePressed.current) {
                if (isTyping) return

                e.preventDefault()
                isSpacePressed.current = true
                setToolMode('pan')
            }

            // Handle V key for select mode
            if ((e.key === 'v' || e.key === 'V') && !e.metaKey && !e.ctrlKey) {
                if (isTyping) return

                e.preventDefault()
                setToolMode('select')
            }

            // Handle H key for pan mode
            if ((e.key === 'h' || e.key === 'H') && !e.metaKey && !e.ctrlKey) {
                if (isTyping) return

                e.preventDefault()
                setToolMode('pan')
            }

            // Handle Tab key for selecting next block
            if (e.key === 'Tab') {
                if (isTyping) return

                e.preventDefault()
                handleSelectNextBlock()
            }

            // Handle T key for creating text block
            if ((e.key === 't' || e.key === 'T') && !e.metaKey && !e.ctrlKey) {
                if (isTyping) return

                e.preventDefault()
                createTextBlock(offsetRef, zoomRef)
            }

            // Handle I key for creating image block
            if ((e.key === 'i' || e.key === 'I') && !e.metaKey && !e.ctrlKey) {
                if (isTyping) return

                e.preventDefault()
                createImageBlock(offsetRef, zoomRef)
            }

            // Handle C key for creating chat block
            if ((e.key === 'c' || e.key === 'C') && !e.metaKey && !e.ctrlKey) {
                if (isTyping) return

                e.preventDefault()
                createChatBlock(offsetRef, zoomRef)
            }

            // Check if Backspace is pressed and there are selected elements
            if (e.key === 'Backspace' && selectedIds.length > 0) {
                if (isTyping) return

                e.preventDefault()
                handleDeleteElement()
            }

            const isCmdOrCtrl = e.metaKey || e.ctrlKey

            if (isCmdOrCtrl && !isTyping) {
                // Select All: Cmd/Ctrl+A
                if (e.key === 'a' || e.key === 'A') {
                    e.preventDefault()
                    selectAllElements()
                }

                // Copy: Cmd/Ctrl+C
                if (e.key === 'c' || e.key === 'C') {
                    e.preventDefault()
                    handleCopy()
                }

                // Duplicate: Cmd/Ctrl+D
                if (e.key === 'd' || e.key === 'D') {
                    e.preventDefault()
                    handleDuplicate()
                }

                // Undo/Redo: Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z
                if (e.key === 'z' || e.key === 'Z') {
                    e.preventDefault()
                    if (e.shiftKey) {
                        redo()
                    } else {
                        undo()
                    }
                }
            }
        }

        const handleKeyUp = (e) => {
            if (e.code === 'Space' && isSpacePressed.current) {
                e.preventDefault()
                isSpacePressed.current = false
                setToolMode('select')
            }
        }

        window.addEventListener('paste', handlePasteEvent)
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        return () => {
            window.removeEventListener('paste', handlePasteEvent)
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [
        selectedIds,
        handleDeleteElement,
        handleCopy,
        handleDuplicate,
        handleSelectNextBlock,
        selectAllElements,
        setToolMode,
        onPaste,
        undo,
        redo,
        createTextBlock,
        createImageBlock,
        createChatBlock,
        offsetRef,
        zoomRef
    ])
}

export default useKeyboardShortcuts
