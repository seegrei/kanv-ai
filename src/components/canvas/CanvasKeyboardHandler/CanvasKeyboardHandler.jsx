import useKeyboardShortcuts from '../../../hooks/useKeyboardShortcuts';

/**
 * CanvasKeyboardHandler component
 * Logic-only component responsible for keyboard shortcuts
 * Does not render any UI
 *
 * @param {Object} props
 * @param {Object} props.offsetRef - Ref containing pan offset
 * @param {Object} props.zoomRef - Ref containing zoom level
 * @param {Function} props.onPaste - Paste handler
 * @returns {null} This component doesn't render anything
 */
const CanvasKeyboardHandler = ({ offsetRef, zoomRef, onPaste }) => {
    useKeyboardShortcuts(offsetRef, zoomRef, onPaste);
    return null;
};

export default CanvasKeyboardHandler;
