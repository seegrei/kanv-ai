import { useCallback, memo, useEffect } from 'react'
import Block from '../Block/Block'
import ChatDialog from '../../dialogs/ChatDialog/ChatDialog'
import useBlock from '../../../hooks/useBlock'
import useAIGeneration from '../../../hooks/useAIGeneration'
import useImageStorage from '../../../hooks/useImageStorage'
import { ELEMENT } from '../../../constants'
import './ImageBlock.css'

const ImageBlock = memo(({ id, x, y, width, height, imageId, aspectRatio, isSelected, isMultipleSelected, selectedIds, onClick, onMouseDown, onUpdate, onUpdateMultiple, onDragEnd, onResizeEnd, onAddBlockAt, onRuntimeBoundsChange, zoomRef, offsetRef, multipleDrag }) => {
    // Load image from IndexedDB
    const { imageUrl, isLoading: isImageLoading } = useImageStorage(imageId, null)
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
            minWidth: ELEMENT.IMAGE.MIN_WIDTH,
            minHeight: ELEMENT.IMAGE.MIN_HEIGHT,
            maintainAspectRatio: !!imageId,
            aspectRatio: aspectRatio || 1,
            padding: ELEMENT.IMAGE.PADDING
        }
    })

    // Calculate display coordinates (runtime position during drag/resize)
    const displayWidth = block.localSize ? block.localSize.width : (width || ELEMENT.IMAGE.DEFAULT_WIDTH)
    const displayHeight = block.localSize ? block.localSize.height : (height || ELEMENT.IMAGE.DEFAULT_HEIGHT)
    const displayX = block.resizeLocalPosition ? block.resizeLocalPosition.x : (block.localPosition ? block.localPosition.x : x)
    const displayY = block.resizeLocalPosition ? block.resizeLocalPosition.y : (block.localPosition ? block.localPosition.y : y)

    // AI Generation logic - use display coordinates for real-time positioning
    const generation = useAIGeneration({
        type: 'image',
        id,
        x: displayX,
        y: displayY,
        width: displayWidth,
        height: displayHeight,
        currentContent: imageId,
        onUpdate,
        onAddBlockAt,
        onClick,
        isSelected,
        aspectRatio
    })

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

    return (
        <>
            <Block
                ref={block.blockRef}
                type='image'
                isSelected={isSelected}
                isMultipleSelected={isMultipleSelected}
                isDragging={block.isDragging}
                isResizing={block.isResizing}
                position={{ x: displayX, y: displayY }}
                size={{ width: displayWidth, height: displayHeight }}
                onClick={block.baseHandleClick}
                onMouseDown={block.handleMouseDown}
                onResizeMouseDown={block.handleResizeMouseDown}
                resizeEdges={['t', 'r', 'b', 'l']}
                style={{
                    zIndex: block.isDragging ? 'var(--z-block-dragging)' : (isSelected ? 'var(--z-block-selected)' : 'var(--z-block-default)')
                }}
            >
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt='Image'
                        className='image-block-content'
                        draggable={false}
                    />
                ) : (
                    <div className='image-block-placeholder'>
                        {isImageLoading ? (
                            <div>Loading...</div>
                        ) : (
                            <svg width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5'>
                                <rect x='3' y='3' width='18' height='18' rx='2' ry='2' />
                                <circle cx='8.5' cy='8.5' r='1.5' />
                                <polyline points='21 15 16 10 5 21' />
                            </svg>
                        )}
                    </div>
                )}
                {isSelected && !isMultipleSelected && (
                    <div className='image-block-dimensions'>
                        {Math.round(displayWidth)}x{Math.round(displayHeight)}
                    </div>
                )}
            </Block>
            {generation.showPopup && (
                <ChatDialog {...generation.popupProps} />
            )}
        </>
    )
})

ImageBlock.displayName = 'ImageBlock'

export default ImageBlock
