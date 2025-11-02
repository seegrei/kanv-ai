import { memo, forwardRef } from 'react';
import ResizeHandles from '../ResizeHandles/ResizeHandles';

/**
 * Universal block wrapper component
 * Provides common functionality for all block types:
 * - Positioning and sizing
 * - Selection styling
 * - Resize handles
 *
 * @param {Object} props
 * @param {string} props.type - Block type ('text', 'image', etc.)
 * @param {boolean} props.isSelected - Is block selected
 * @param {boolean} props.isMultipleSelected - Is block part of multiple selection
 * @param {boolean} props.isDragging - Is block being dragged
 * @param {boolean} props.isResizing - Is block being resized
 * @param {Object} props.position - Current position {x, y}
 * @param {Object} props.size - Current size {width, height}
 * @param {Function} props.onClick - Click handler
 * @param {Function} props.onMouseDown - Mouse down handler
 * @param {Function} props.onResizeMouseDown - Resize handle mouse down handler
 * @param {Array<string>} props.resizeEdges - Array of resize edge positions: 't', 'r', 'b', 'l'
 * @param {React.ReactNode} props.children - Block content
 * @param {string} props.className - Additional CSS class
 */
const Block = memo(forwardRef(({
    type,
    isSelected,
    isMultipleSelected,
    isDragging,
    isResizing,
    position,
    size,
    onClick,
    onMouseDown,
    onResizeMouseDown,
    resizeEdges = [],
    children,
    className = '',
    style: customStyle = {}
}, ref) => {
    const blockClassName = [
        `${type}-block`,
        className,
        isSelected && 'selected',
        isDragging && 'dragging',
        isResizing && 'resizing'
    ].filter(Boolean).join(' ');

    const style = {
        transform: `translate(${position.x}px, ${position.y}px)`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        ...customStyle
    };

    return (
        <div
            ref={ref}
            className={blockClassName}
            style={style}
            onClick={onClick}
            onMouseDown={onMouseDown}
        >
            {children}

            <ResizeHandles
                edges={resizeEdges}
                onResizeMouseDown={onResizeMouseDown}
                show={isSelected && !isMultipleSelected}
            />
        </div>
    );
}));

Block.displayName = 'Block';

export default Block;
