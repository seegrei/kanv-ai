import { create } from 'zustand'
import { storageManager } from '../services/storage'
import { BOARD, VIEWS, CANVAS } from '../constants'
import { createStarterBlocks } from '../utils/createStarterBlocks'
import { generateId } from '../utils/generateId'
import { useElementsStore } from './useElementsStore'
import { useSelectionStore } from './useSelectionStore'
import { useHistoryStore } from './useHistoryStore'
import { useViewStore } from './useViewStore'
import { useCanvasViewStore } from './useCanvasViewStore'

/**
 * Boards Store
 * Manages board list and current board
 */
export const useBoardsStore = create((set, get) => ({
    boards: [],
    currentBoardId: null,
    isLoading: false,
    isInitialized: false,
    isInitializing: false,

    /**
     * Initialize boards store
     * Loads boards from storage and creates first board if needed
     */
    initialize: async () => {
        // Prevent multiple simultaneous initialization attempts
        if (get().isInitialized || get().isInitializing) {
            return
        }

        // Set flag immediately to prevent race conditions
        set({ isInitializing: true, isLoading: true })

        try {
            // Load boards from main DB
            const boards = await storageManager.mainProvider.loadAllBoards()

            // Load state (includes currentBoardId)
            const state = await storageManager.mainProvider.loadAllState()

            if (boards.length === 0) {
                // Check if database is completely empty (first launch)
                const settings = await storageManager.loadAllSettings()
                const isFirstLaunch = Object.keys(settings).length === 0 && Object.keys(state).length === 0

                if (isFirstLaunch) {
                    // First launch - create first board with starter blocks
                    await get().createFirstBoard()
                } else {
                    // Database existed but no boards - open settings view
                    set({ boards: [], currentBoardId: null })
                    useViewStore.getState().setView(VIEWS.SETTINGS)
                }
            } else {
                // Load existing boards
                set({ boards })

                // Get last active board from state
                const lastBoardId = state.currentBoardId

                // Check if saved board exists
                const boardExists = lastBoardId && boards.find(b => b.id === lastBoardId)

                if (boardExists) {
                    // Switch to last active board
                    await get().switchBoard(lastBoardId)
                } else {
                    // Saved board doesn't exist, switch to first available board
                    await get().switchBoard(boards[0].id)
                }
            }

            // Mark as initialized after successful initialization
            set({ isInitialized: true })
        } catch (error) {
            console.error('Failed to initialize boards:', error)
        } finally {
            set({ isInitializing: false, isLoading: false })
        }
    },

    /**
     * Create first board with starter blocks
     */
    createFirstBoard: async () => {
        const board = {
            id: generateId(),
            name: 'Main Board',
            createdAt: Date.now(),
            updatedAt: Date.now()
        }

        // Save board to main DB
        await storageManager.mainProvider.saveBoard(board)

        // Set as current board
        set({ boards: [board], currentBoardId: board.id })

        // Set board provider in storage manager
        storageManager.setBoardProvider(board.id)

        // Save current board ID to state
        await storageManager.mainProvider.saveState('currentBoardId', board.id)

        // Create starter blocks
        const starterBlocks = createStarterBlocks()

        // Set blocks to elements store
        useElementsStore.getState().setElements(starterBlocks)

        // Save blocks to board DB
        await storageManager.boardProvider.saveBlocks(starterBlocks)

        // Set initial canvas state with custom offset and zoom
        const initialCanvasState = {
            offset: { x: 237.03331382051044, y: 110.64312268272056 },
            zoom: 0.865111942514777
        }

        // Set canvas state in store
        useCanvasViewStore.getState().setCanvasView(initialCanvasState)

        // Save canvas state to DB
        await storageManager.boardProvider.saveCanvasState(initialCanvasState)

        // Mark as loaded to enable auto-save
        storageManager.hasLoaded = true

        console.log('First board created with starter blocks')
    },

    /**
     * Create a new board
     * @param {string} name - Board name
     */
    createBoard: async (name = BOARD.DEFAULT_NAME) => {
        // Validate name
        if (!name || name.length < BOARD.MIN_NAME_LENGTH) {
            console.error('Board name is too short')
            return null
        }

        if (name.length > BOARD.MAX_NAME_LENGTH) {
            console.error('Board name is too long')
            return null
        }

        const board = {
            id: generateId(),
            name,
            createdAt: Date.now(),
            updatedAt: Date.now()
        }

        try {
            // Save board to main DB
            await storageManager.mainProvider.saveBoard(board)

            // Add to boards list
            const boards = [...get().boards, board]
            set({ boards })

            // Switch to new board
            await get().switchBoard(board.id)

            console.log('Board created:', board.name)
            return board
        } catch (error) {
            console.error('Failed to create board:', error)
            return null
        }
    },

    /**
     * Switch to a different board
     * @param {string} boardId - Board ID to switch to
     */
    switchBoard: async (boardId) => {
        const board = get().boards.find(b => b.id === boardId)

        if (!board) {
            console.error('Board not found:', boardId)
            return
        }

        set({ isLoading: true })

        try {
            // Clear selection and history before switching
            useSelectionStore.getState().clearSelection()
            useHistoryStore.getState().clear()

            // Switch storage manager to new board
            await storageManager.switchBoard(boardId)

            // Load board data
            await storageManager.load()

            // Update current board
            set({ currentBoardId: boardId })

            // Save current board to state
            await storageManager.mainProvider.saveState('currentBoardId', boardId)

            // Switch to board view
            await useViewStore.getState().setView(VIEWS.BOARD)

            console.log('Switched to board:', board.name)
        } catch (error) {
            console.error('Failed to switch board:', error)
        } finally {
            set({ isLoading: false })
        }
    },

    /**
     * Rename a board
     * @param {string} boardId - Board ID
     * @param {string} newName - New board name
     */
    renameBoard: async (boardId, newName) => {
        // Validate name
        if (!newName || newName.length < BOARD.MIN_NAME_LENGTH) {
            console.error('Board name is too short')
            return false
        }

        if (newName.length > BOARD.MAX_NAME_LENGTH) {
            console.error('Board name is too long')
            return false
        }

        const board = get().boards.find(b => b.id === boardId)

        if (!board) {
            console.error('Board not found:', boardId)
            return false
        }

        try {
            // Update board in main DB
            const updatedBoard = {
                ...board,
                name: newName,
                updatedAt: Date.now()
            }

            await storageManager.mainProvider.saveBoard(updatedBoard)

            // Update boards list
            const boards = get().boards.map(b =>
                b.id === boardId ? updatedBoard : b
            )

            set({ boards })

            console.log('Board renamed:', newName)
            return true
        } catch (error) {
            console.error('Failed to rename board:', error)
            return false
        }
    },

    /**
     * Delete a board
     * @param {string} boardId - Board ID to delete
     */
    deleteBoard: async (boardId) => {
        const boards = get().boards

        const board = boards.find(b => b.id === boardId)

        if (!board) {
            console.error('Board not found:', boardId)
            return false
        }

        try {
            // Close connection to board database if it's the current board
            if (get().currentBoardId === boardId) {
                storageManager.closeBoardProvider()
            }

            // Delete board from main DB
            await storageManager.mainProvider.deleteBoard(boardId)

            // Delete board database
            await storageManager.mainProvider.deleteBoardDatabase(boardId)

            // Remove from boards list
            const updatedBoards = boards.filter(b => b.id !== boardId)
            set({ boards: updatedBoards })

            // If deleting current board, switch to another one or open settings
            if (get().currentBoardId === boardId) {
                if (updatedBoards.length > 0) {
                    // Switch to first available board
                    await get().switchBoard(updatedBoards[0].id)
                } else {
                    // No boards left, open settings view
                    set({ currentBoardId: null })
                    useViewStore.getState().setView(VIEWS.SETTINGS)
                    // Clear elements and history
                    useElementsStore.getState().setElements([])
                    useSelectionStore.getState().clearSelection()
                    useHistoryStore.getState().clear()
                }
            }

            console.log('Board deleted:', board.name)
            return true
        } catch (error) {
            console.error('Failed to delete board:', error)
            return false
        }
    },

    /**
     * Get current board
     * @returns {Object|null} Current board or null
     */
    getCurrentBoard: () => {
        const currentBoardId = get().currentBoardId
        return get().boards.find(b => b.id === currentBoardId) || null
    }
}))
