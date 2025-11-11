import { useRef, useCallback, useMemo } from 'react';
import useDraggable from './useDraggable';
import useResizable from './useResizable';
import useSelection from './useSelection';

/**
 * Common hook for all block types
 * Handles drag, resize, and selection
 *
 * @param {Object} config - Block configuration
 * @param {string} config.id - Block ID
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @param {number} config.width - Block width
 * @param {number} config.height - Block height
 * @param {boolean} config.isSelected - Is block selected
 * @param {boolean} config.isMultipleSelected - Is block part of multiple selection
 * @param {Function} config.onClick - Click handler
 * @param {Function} config.onMouseDown - Mouse down handler
 * @param {Function} config.onUpdate - Update handler
 * @param {Object} config.zoomRef - Zoom ref from Canvas
 * @param {Object} config.offsetRef - Offset ref from Canvas
 * @param {Object} config.multipleDrag - Multiple drag handler instance
 * @param {Object} config.resizeConfig - Configuration for resizing (minWidth, minHeight, etc.)
 * @returns {Object} Block state and handlers
 */
const useBlock = (config) => {
    const {
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
        resizeConfig = {}
    } = config;

    // Refs
    const blockRef = useRef(null);
    const wasSelectedBeforeMouseDownRef = useRef(false);

    // Single element dragging
    const singleDrag = useDraggable({
        id,
        x,
        y,
        isSelected,
        zoomRef,
        offsetRef,
        onUpdate,
        onMouseDown,
        onDragEnd
    });

    // Choose the appropriate drag handler based on selection
    const dragState = useMemo(() => ({
        isDragging: isMultipleSelected ? multipleDrag.isDragging : singleDrag.isDragging,
        wasDragged: isMultipleSelected ? multipleDrag.wasDragged : singleDrag.wasDragged,
        handleMouseDown: isMultipleSelected ? multipleDrag.handleMouseDown : singleDrag.handleMouseDown,
        localPosition: isMultipleSelected
            ? multipleDrag.localPositions.get(id)
            : singleDrag.localPosition
    }), [isMultipleSelected, multipleDrag, singleDrag, id]);

    // Resizing
    const resizeState = useResizable({
        id,
        x,
        y,
        width,
        height,
        zoomRef,
        offsetRef,
        onUpdate,
        onResizeEnd,
        ...resizeConfig
    });

    // Selection
    const { handleClick: baseHandleClick } = useSelection({
        id,
        onClick,
        wasDragged: dragState.wasDragged,
        wasResized: resizeState.wasResized
    });

    // Store selection state before mousedown for click detection
    const handleMouseDown = useCallback((e) => {
        // Only handle left mouse button for mouse events
        // For touch events, e.button will be undefined, which is fine
        if (e.button !== undefined && e.button !== 0) return;

        // For touch events, ignore if two fingers (reserved for zoom)
        // Check both e.touches (native) and e.nativeEvent.touches (React synthetic)
        const touches = e.touches || e.nativeEvent?.touches;
        if (touches && touches.length === 2) {
            return;
        }

        // Don't handle mousedown on special elements
        if (
            e.target.classList.contains('resize-handle') ||
            e.target.classList.contains('resize-edge') ||
            e.target.closest('.generate-button') ||
            e.target.closest('.generate-popup')
        ) {
            return;
        }

        e.stopPropagation();

        // Store whether element was selected before this mouseDown
        wasSelectedBeforeMouseDownRef.current = isSelected;

        // Choose drag handler: if element is not selected, always use single drag
        // This ensures unselected elements get selected and dragged correctly
        // Check isMultipleSelected at the moment of call to avoid stale closure
        const dragHandler = !isSelected
            ? singleDrag.handleMouseDown
            : (isMultipleSelected ? multipleDrag.handleMouseDown : singleDrag.handleMouseDown);
        dragHandler(e, id);
    }, [isSelected, isMultipleSelected, singleDrag, multipleDrag, id]);

    return {
        // Refs
        blockRef,
        wasSelectedBeforeMouseDownRef,

        // Drag state
        isDragging: dragState.isDragging,
        wasDragged: dragState.wasDragged,
        localPosition: dragState.localPosition,

        // Resize state
        isResizing: resizeState.isResizing,
        wasResized: resizeState.wasResized,
        handleResizeMouseDown: resizeState.handleResizeMouseDown,
        localSize: resizeState.localSize,
        resizeLocalPosition: resizeState.localPosition,

        // Handlers
        handleMouseDown,
        baseHandleClick
    };
};

export default useBlock;
