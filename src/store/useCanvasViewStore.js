import { create } from 'zustand'
import { CANVAS } from '../constants'
import { createLogger } from '../utils/logger'

const logger = createLogger('useCanvasViewStore')

/**
 * Canvas View Store
 * Single source of truth for canvas viewport state (offset and zoom)
 * Manages canvas view state independently of specific board
 */
export const useCanvasViewStore = create((set, get) => ({
    offset: { x: 0, y: 0 },
    zoom: CANVAS.ZOOM.DEFAULT,

    /**
     * Set canvas offset
     * @param {Object} offset - New offset { x, y }
     */
    setOffset: (offset) => {
        set({ offset })
    },

    /**
     * Set canvas zoom
     * @param {number} zoom - New zoom level
     */
    setZoom: (zoom) => {
        // Clamp zoom to allowed range
        const clampedZoom = Math.max(
            CANVAS.ZOOM.MIN,
            Math.min(CANVAS.ZOOM.MAX, zoom)
        )
        set({ zoom: clampedZoom })
    },

    /**
     * Set both offset and zoom at once
     * @param {Object} params - Canvas view state
     * @param {Object} params.offset - Offset { x, y }
     * @param {number} params.zoom - Zoom level
     */
    setCanvasView: ({ offset, zoom }) => {
        // Clamp zoom to allowed range
        const clampedZoom = Math.max(
            CANVAS.ZOOM.MIN,
            Math.min(CANVAS.ZOOM.MAX, zoom)
        )
        set({ offset, zoom: clampedZoom })
    },

    /**
     * Reset to default values
     */
    resetToDefaults: () => {
        set({
            offset: { x: 0, y: 0 },
            zoom: CANVAS.ZOOM.DEFAULT
        })
    }
}))

export default useCanvasViewStore
