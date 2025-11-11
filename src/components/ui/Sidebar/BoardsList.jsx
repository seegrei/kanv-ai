import { memo, useState } from 'react'
import { useBoardsStore } from '../../../store/useBoardsStore'
import { useViewStore } from '../../../store/useViewStore'
import { BOARD, VIEWS } from '../../../constants'

export const BoardsList = memo(() => {
    const boards = useBoardsStore((state) => state.boards)
    const currentBoardId = useBoardsStore((state) => state.currentBoardId)
    const switchBoard = useBoardsStore((state) => state.switchBoard)
    const createBoard = useBoardsStore((state) => state.createBoard)
    const renameBoard = useBoardsStore((state) => state.renameBoard)
    const deleteBoard = useBoardsStore((state) => state.deleteBoard)
    const setView = useViewStore((state) => state.setView)
    const currentView = useViewStore((state) => state.currentView)

    const [editingBoardId, setEditingBoardId] = useState(null)
    const [editingName, setEditingName] = useState('')

    const handleCreateBoard = () => {
        createBoard(BOARD.DEFAULT_NAME)
    }

    const handleBoardClick = (boardId) => {
        if (boardId !== currentBoardId) {
            switchBoard(boardId)
        } else if (currentView !== VIEWS.BOARD) {
            // If clicking on the active board while in another view, return to board view
            setView(VIEWS.BOARD)
        }
    }

    const handleEditStart = (board, e) => {
        e.stopPropagation()
        setEditingBoardId(board.id)
        setEditingName(board.name)
    }

    const handleEditSave = async (boardId) => {
        if (editingName.trim() && editingName.trim() !== boards.find(b => b.id === boardId)?.name) {
            await renameBoard(boardId, editingName.trim())
        }
        setEditingBoardId(null)
        setEditingName('')
    }

    const handleEditCancel = () => {
        setEditingBoardId(null)
        setEditingName('')
    }

    const handleDelete = async (boardId, e) => {
        e.stopPropagation()

        const board = boards.find(b => b.id === boardId)
        if (confirm(`Delete board "${board.name}"?`)) {
            await deleteBoard(boardId)
        }
    }

    const handleKeyDown = (e, boardId) => {
        if (e.key === 'Enter') {
            handleEditSave(boardId)
        } else if (e.key === 'Escape') {
            handleEditCancel()
        }
    }

    return (
        <div className='sidebar-boards-list'>
            {boards.map((board) => (
                <div
                    key={board.id}
                    className={`sidebar-board-item ${board.id === currentBoardId && currentView === VIEWS.BOARD ? 'sidebar-board-item--active' : ''}`}
                    onClick={() => handleBoardClick(board.id)}
                >
                    {editingBoardId === board.id ? (
                        <input
                            type='text'
                            className='sidebar-board-item__input'
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => handleEditSave(board.id)}
                            onKeyDown={(e) => handleKeyDown(e, board.id)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            maxLength={BOARD.MAX_NAME_LENGTH}
                        />
                    ) : (
                        <>
                            <span className='sidebar-board-item__name'>{board.name}</span>
                            <div className='sidebar-board-item__actions'>
                                <button
                                    className='sidebar-board-item__action'
                                    onClick={(e) => handleEditStart(board, e)}
                                    title='Rename'
                                >
                                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                        <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
                                        <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
                                    </svg>
                                </button>
                                <button
                                    className='sidebar-board-item__action'
                                    onClick={(e) => handleDelete(board.id, e)}
                                    title='Delete'
                                >
                                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                        <polyline points='3 6 5 6 21 6' />
                                        <path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' />
                                        <line x1='10' y1='11' x2='10' y2='17' />
                                        <line x1='14' y1='11' x2='14' y2='17' />
                                    </svg>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            ))}

            <button className='sidebar-boards-list__add' onClick={handleCreateBoard}>
                + New Board
            </button>
        </div>
    )
})

BoardsList.displayName = 'BoardsList'
