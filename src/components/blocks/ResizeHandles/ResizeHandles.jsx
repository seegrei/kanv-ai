import { memo } from 'react';
import { createLogger } from '../../../utils/logger'

const logger = createLogger('ResizeHandles')

/**
 * Resize handles component
 * Always renders 4 corner handles (круглешки)
 * Optionally renders edge handles based on edges prop
 *
 * @param {Object} props
 * @param {Array<string>} props.edges - Array of active edge positions: 't', 'r', 'b', 'l'
 * @param {Function} props.onResizeMouseDown - Handler function that takes handle position
 * @param {boolean} props.show - Whether to show handles (default: true)
 */
const ResizeHandles = memo(({ edges = [], onResizeMouseDown, show = true }) => {
    if (!show) {
        return null;
    }

    // Always show 4 corner handles
    const cornerHandles = ['tl', 'tr', 'bl', 'br'];

    return (
        <>
            {cornerHandles.map((position) => {
                return (
                    <div
                        key={position}
                        className={`resize-handle resize-handle-${position}`}
                        onMouseDown={onResizeMouseDown(position)}
                        onTouchStart={onResizeMouseDown(position)}
                    />
                );
            })}
            {edges.map((position) => {
                return (
                    <div
                        key={position}
                        className={`resize-edge resize-edge-${position}`}
                        onMouseDown={onResizeMouseDown(position)}
                        onTouchStart={onResizeMouseDown(position)}
                    />
                );
            })}
        </>
    );
});

ResizeHandles.displayName = 'ResizeHandles';

export default ResizeHandles;
