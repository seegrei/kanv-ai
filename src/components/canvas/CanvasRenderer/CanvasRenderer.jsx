import React, { memo } from 'react';
import BlockRegistry from '../../../core/BlockRegistry';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('CanvasRenderer');

/**
 * CanvasRenderer component
 * Responsible for rendering visible blocks on the canvas
 * Uses viewport culling for performance with large number of blocks
 *
 * @param {Object} props
 * @param {Array} props.visibleElements - Array of visible elements after viewport culling
 * @param {Array} props.selectedIds - Array of selected element IDs
 * @param {Function} props.onElementClick - Click handler for elements
 * @param {Function} props.onElementMouseDown - Mouse down handler for elements
 * @param {Function} props.onUpdateElement - Update single element handler
 * @param {Function} props.onUpdateMultiple - Update multiple elements handler
 * @param {Function} props.onDragEnd - Drag end handler
 * @param {Function} props.onResizeEnd - Resize end handler
 * @param {Function} props.onAddTextBlockAt - Add text block at position handler
 * @param {Function} props.onAddImageBlockAt - Add image block at position handler
 * @param {Function} props.onRuntimeBoundsChange - Runtime bounds change handler for toolbar updates
 * @param {Object} props.zoomRef - Ref containing zoom level
 * @param {Object} props.offsetRef - Ref containing pan offset
 * @param {Object} props.multipleDrag - Multiple drag handlers from useMultipleDraggable
 */
const CanvasRenderer = memo(({
    visibleElements,
    selectedIds,
    onElementClick,
    onElementMouseDown,
    onUpdateElement,
    onUpdateMultiple,
    onDragEnd,
    onResizeEnd,
    onAddTextBlockAt,
    onAddImageBlockAt,
    onRuntimeBoundsChange,
    zoomRef,
    offsetRef,
    multipleDrag,
    children
}) => {
    return (
        <div className='canvas-content'>
            {visibleElements.map((element) => {
                const BlockComponent = BlockRegistry.getComponent(element.type);

                if (!BlockComponent) {
                    logger.warn(`Unknown block type: ${element.type}`);
                    return null;
                }

                // Determine appropriate onAddBlockAt handler based on block type
                const onAddBlockAt = element.type === 'image'
                    ? onAddImageBlockAt
                    : onAddTextBlockAt;

                return (
                    <BlockComponent
                        key={element.id}
                        {...element}
                        isSelected={selectedIds.includes(element.id)}
                        isMultipleSelected={selectedIds.length > 1}
                        selectedIds={selectedIds}
                        onClick={onElementClick}
                        onMouseDown={onElementMouseDown}
                        onUpdate={onUpdateElement}
                        onUpdateMultiple={onUpdateMultiple}
                        onDragEnd={onDragEnd}
                        onResizeEnd={onResizeEnd}
                        onAddBlockAt={onAddBlockAt}
                        onRuntimeBoundsChange={onRuntimeBoundsChange}
                        zoomRef={zoomRef}
                        offsetRef={offsetRef}
                        multipleDrag={multipleDrag}
                    />
                );
            })}
            {children}
        </div>
    );
});

CanvasRenderer.displayName = 'CanvasRenderer';

export default CanvasRenderer;
