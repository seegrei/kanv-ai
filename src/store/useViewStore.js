import { create } from 'zustand'
import { VIEWS } from '../constants'

/**
 * View Store
 * Manages the current view (board, settings, statistics)
 */
export const useViewStore = create((set, get) => ({
    // Current view
    currentView: VIEWS.BOARD,

    /**
     * Set current view
     * @param {string} view - View to set (VIEWS.BOARD, VIEWS.SETTINGS, VIEWS.STATISTICS)
     */
    setView: (view) => {
        if (!Object.values(VIEWS).includes(view)) {
            console.error(`Invalid view: ${view}`)
            return
        }

        set({ currentView: view })
    }
}))
