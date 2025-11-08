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
 * @param {Array} props.elements - Array of canvas elements
 * @param {Function} props.focusOnElement - Focus on element function
 * @returns {null} This component doesn't render anything
 */
const CanvasKeyboardHandler = ({ offsetRef, zoomRef, onPaste, elements, focusOnElement }) => {
    useKeyboardShortcuts(offsetRef, zoomRef, onPaste, elements, focusOnElement);
    return null;
};

export default CanvasKeyboardHandler;
