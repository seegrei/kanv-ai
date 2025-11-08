import { memo, useCallback, useEffect, useRef, useState } from 'react'
import Block from '../Block/Block'
import ChatCore from '../../chat/ChatCore/ChatCore'
import useBlock from '../../../hooks/useBlock'
import useChatBlock from '../../../hooks/useChatBlock'
import { ELEMENT } from '../../../constants'
import './ChatBlock.css'

/**
 * ChatBlock Component
 * Standalone chat block on canvas with AI generation capabilities
 * Stores conversation history in blocks_chat_history table
 *
 * @param {Object} props
 * @param {string} props.id - Block ID
 * @param {number} props.x - X position
 * @param {number} props.y - Y position
 * @param {number} props.width - Block width
 * @param {number} props.height - Block height
 * @param {boolean} props.isSelected - Is block selected
 * @param {boolean} props.isMultipleSelected - Is part of multiple selection
 * @param {Function} props.onClick - Click handler
 * @param {Function} props.onMouseDown - Mouse down handler
 * @param {Function} props.onUpdate - Update handler
 * @param {Function} props.onDragEnd - Drag end handler
 * @param {Function} props.onResizeEnd - Resize end handler
 * @param {Function} props.onRuntimeBoundsChange - Runtime bounds change handler
 * @param {Object} props.zoomRef - Zoom ref
 * @param {Object} props.offsetRef - Offset ref
 * @param {Object} props.multipleDrag - Multiple drag handler
 */
const ChatBlock = memo(({
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
    onRuntimeBoundsChange,
    zoomRef,
    offsetRef,
    multipleDrag,
    // Legacy props for backward compatibility (migrated data)
    chatHistory,
    lastModel,
    lastGenerationType
}) => {
    // Use common block logic for drag/resize
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
            minWidth: ELEMENT.CHAT_BLOCK.MIN_WIDTH,
            minHeight: ELEMENT.CHAT_BLOCK.MIN_HEIGHT,
            horizontalOnly: true
        }
    })

    // Calculate display coordinates
    const displayWidth = block.localSize
        ? block.localSize.width
        : (width || ELEMENT.CHAT_BLOCK.DEFAULT_WIDTH)
    const displayHeight = height || ELEMENT.CHAT_BLOCK.DEFAULT_HEIGHT
    const displayX = block.resizeLocalPosition
        ? block.resizeLocalPosition.x
        : (block.localPosition ? block.localPosition.x : x)
    const displayY = block.resizeLocalPosition
        ? block.resizeLocalPosition.y
        : (block.localPosition ? block.localPosition.y : y)

    // Track display width for height recalculation
    const prevWidthRef = useRef(displayWidth)

    // Chat block logic
    const chat = useChatBlock({
        id,
        x: displayX,
        y: displayY,
        width: displayWidth,
        height: displayHeight,
        chatHistory,
        lastModel,
        lastGenerationType
    })

    // Chat block specific click handler
    const handleClick = useCallback((e) => {
        // Skip if clicking on interactive elements
        if (e.target.closest('.chat-input-textarea') ||
            e.target.closest('.chat-model-select') ||
            e.target.closest('button') ||
            e.target.classList.contains('resize-handle') ||
            e.target.classList.contains('resize-edge')) {
            return
        }

        block.baseHandleClick()
    }, [block])

    // Chat block specific mouse down handler
    const handleMouseDown = useCallback((e) => {
        // Skip if clicking on interactive elements
        if (e.target.closest('.chat-input-textarea') ||
            e.target.closest('.chat-model-select') ||
            e.target.closest('button') ||
            e.target.tagName === 'INPUT') {
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

    // Auto-adjust height based on content
    useEffect(() => {
        // Don't auto-adjust during resize to prevent conflicts
        if (block.isResizing) return

        if (!block.blockRef.current) return

        let rafId = null

        const updateHeight = () => {
            // Cancel previous animation frame if exists
            if (rafId) {
                cancelAnimationFrame(rafId)
            }

            // Use requestAnimationFrame for smooth updates
            rafId = requestAnimationFrame(() => {
                const blockElement = block.blockRef.current
                if (!blockElement) return

                const chatCoreElement = blockElement.querySelector('.chat-core')
                if (!chatCoreElement) return

                // Get the actual content height
                const contentHeight = chatCoreElement.scrollHeight
                const newHeight = Math.max(contentHeight, ELEMENT.CHAT_BLOCK.MIN_HEIGHT)

                const currentHeight = height || ELEMENT.CHAT_BLOCK.DEFAULT_HEIGHT

                // Update height if content changed significantly (> 5px difference)
                if (Math.abs(newHeight - currentHeight) > 5) {
                    onUpdate(id, { height: newHeight })
                }
            })
        }

        // Use MutationObserver to watch for DOM changes
        const mutationObserver = new MutationObserver(updateHeight)

        // Use ResizeObserver to watch for actual size changes (e.g., image loading)
        const resizeObserver = new ResizeObserver(updateHeight)

        const chatCoreElement = block.blockRef.current.querySelector('.chat-core')

        if (chatCoreElement) {
            mutationObserver.observe(chatCoreElement, {
                childList: true,
                subtree: true,
                characterData: true
            })

            resizeObserver.observe(chatCoreElement)

            // Trigger initial update
            updateHeight()
        }

        return () => {
            mutationObserver.disconnect()
            resizeObserver.disconnect()
            if (rafId) {
                cancelAnimationFrame(rafId)
            }
        }
    }, [id, onUpdate, height, block.blockRef, block.isResizing])

    // Separate effect to handle width changes during resize
    useEffect(() => {
        const widthChanged = Math.abs(displayWidth - prevWidthRef.current) > 1

        if (widthChanged && block.blockRef.current) {
            prevWidthRef.current = displayWidth

            const blockElement = block.blockRef.current
            const chatCoreElement = blockElement.querySelector('.chat-core')
            if (!chatCoreElement) return

            // Recalculate height when width changes
            requestAnimationFrame(() => {
                // Force reflow
                chatCoreElement.offsetHeight

                // Get the actual content height
                const contentHeight = chatCoreElement.scrollHeight
                const newHeight = Math.max(contentHeight, ELEMENT.CHAT_BLOCK.MIN_HEIGHT)
                const currentHeight = height || ELEMENT.CHAT_BLOCK.DEFAULT_HEIGHT

                // Update height if content changed significantly (> 1px difference)
                if (Math.abs(newHeight - currentHeight) > 1) {
                    onUpdate(id, { height: newHeight })
                }
            })
        }
    }, [displayWidth, id, onUpdate, height, block.blockRef])

    return (
        <Block
            ref={block.blockRef}
            type='chat'
            isSelected={isSelected}
            isMultipleSelected={isMultipleSelected}
            isDragging={block.isDragging}
            isResizing={block.isResizing}
            position={{ x: displayX, y: displayY }}
            size={{ width: displayWidth, height: displayHeight }}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onResizeMouseDown={block.handleResizeMouseDown}
            resizeEdges={['l', 'r']}
            className='chat-block-wrapper'
            style={{
                zIndex: block.isDragging ? 'var(--z-block-dragging)' : (isSelected ? 'var(--z-block-selected)' : 'var(--z-block-default)')
            }}
        >
            <div className='chat-block-content'>
                <ChatCore {...chat.props} />
            </div>
        </Block>
    )
})

ChatBlock.displayName = 'ChatBlock'

export default ChatBlock
