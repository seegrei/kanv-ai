import { memo } from 'react';
import useToolStore from '../../../store/useToolStore';
import './CanvasControls.css';

/**
 * CanvasControls component
 * UI panel for canvas controls (tool mode selection, zoom)
 *
 * @returns {JSX.Element} Canvas controls UI
 */
const CanvasControls = memo(() => {
    const toolMode = useToolStore((state) => state.toolMode);
    const setToolMode = useToolStore((state) => state.setToolMode);

    const handleToolSelect = () => {
        setToolMode('select');
    };

    const handleToolPan = () => {
        setToolMode('pan');
    };

    return (
        <div className='canvas-controls'>
            <div className='canvas-controls__tools'>
                <button
                    className={`canvas-controls__button ${toolMode === 'select' ? 'canvas-controls__button--active' : ''}`}
                    onClick={handleToolSelect}
                    title='Select tool (V)'
                >
                    <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                        <path d='M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z' />
                    </svg>
                </button>
                <button
                    className={`canvas-controls__button ${toolMode === 'pan' ? 'canvas-controls__button--active' : ''}`}
                    onClick={handleToolPan}
                    title='Pan tool (Space)'
                >
                    <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                        <path d='M9 11V6a2 2 0 1 1 4 0v5M9 11a2 2 0 1 1 4 0M9 11h4m-4 0H5a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h8m0-5v5m0-5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-6' />
                    </svg>
                </button>
            </div>
        </div>
    );
});

CanvasControls.displayName = 'CanvasControls';

export default CanvasControls;
