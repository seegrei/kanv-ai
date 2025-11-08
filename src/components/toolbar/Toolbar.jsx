import { memo } from 'react'
import useToolStore from '../../store/useToolStore'
import useHistoryStore from '../../store/useHistoryStore'
import './Toolbar.css'

const Toolbar = memo(({ onAddTextBlock, onAddImageBlock, onAddChatBlock }) => {
    const toolMode = useToolStore((state) => state.toolMode)
    const setToolMode = useToolStore((state) => state.setToolMode)

    const canUndo = useHistoryStore((state) => state.canUndo)
    const canRedo = useHistoryStore((state) => state.canRedo)
    const undo = useHistoryStore((state) => state.undo)
    const redo = useHistoryStore((state) => state.redo)

    const handleToolSelect = () => {
        setToolMode('select')
    }

    const handleToolPan = () => {
        setToolMode('pan')
    }

    const handleUndo = () => {
        if (canUndo) {
            undo()
        }
    }

    const handleRedo = () => {
        if (canRedo) {
            redo()
        }
    }

    return (
        <div className='toolbar'>
            <button
                className={`toolbar-button ${toolMode === 'select' ? 'toolbar-button--active' : ''}`}
                onClick={handleToolSelect}
                title='Select tool (V)'
            >
                <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                    <path d='M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z' />
                </svg>
            </button>
            <button
                className={`toolbar-button ${toolMode === 'pan' ? 'toolbar-button--active' : ''}`}
                onClick={handleToolPan}
                title='Pan tool (H)'
            >
                <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M18 11V6a2 2 0 0 0-4 0v5' />
                    <path d='M14 10V4a2 2 0 0 0-4 0v2' />
                    <path d='M10 10.5V6a2 2 0 0 0-4 0v8' />
                    <path d='M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15' />
                </svg>
            </button>

            <div className='toolbar-separator'></div>

            <button
                className='toolbar-button'
                onClick={onAddChatBlock}
                title='Add chat block (C)'
            >
                <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
                </svg>
            </button>
            <button
                className='toolbar-button'
                onClick={onAddTextBlock}
                title='Add text block (T)'
            >
                <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                    <path d='M4 7V4h16v3M9 20h6M12 4v16' />
                </svg>
            </button>
            <button
                className='toolbar-button'
                onClick={onAddImageBlock}
                title='Add image block (I)'
            >
                <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                    <rect x='3' y='3' width='18' height='18' rx='2' ry='2' />
                    <circle cx='8.5' cy='8.5' r='1.5' />
                    <polyline points='21 15 16 10 5 21' />
                </svg>
            </button>

            <div className='toolbar-separator'></div>

            <button
                className='toolbar-button'
                onClick={handleUndo}
                disabled={!canUndo}
                title='Undo (Cmd+Z)'
            >
                <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M9 14L4 9l5-5' />
                    <path d='M20 20v-7a4 4 0 0 0-4-4H4' />
                </svg>
            </button>
            <button
                className='toolbar-button'
                onClick={handleRedo}
                disabled={!canRedo}
                title='Redo (Cmd+Shift+Z)'
            >
                <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M15 14l5-5-5-5' />
                    <path d='M4 20v-7a4 4 0 0 1 4-4h12' />
                </svg>
            </button>
        </div>
    )
})

Toolbar.displayName = 'Toolbar'

export default Toolbar
