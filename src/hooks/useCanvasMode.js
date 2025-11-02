import { useCallback, useMemo } from 'react'
import { createLogger } from '../utils/logger'
import useToolStore from '../store/useToolStore'

const logger = createLogger('useCanvasMode')

// Canvas modes
export const CANVAS_MODES = {
    SELECT: 'select',
    PAN: 'pan'
}

/**
 * Hook for managing canvas modes and their event handlers
 * @param {Object} modeHandlers - Handlers for each mode
 * @param {Object} modeHandlers.select - Handlers for SELECT mode
 * @param {Function} modeHandlers.select.onMouseDown
 * @param {Function} modeHandlers.select.onMouseMove
 * @param {Function} modeHandlers.select.onMouseUp
 * @param {Object} modeHandlers.pan - Handlers for PAN mode
 * @param {Function} modeHandlers.pan.onMouseDown
 * @param {Function} modeHandlers.pan.onMouseMove
 * @param {Function} modeHandlers.pan.onMouseUp
 * @param {boolean} isPanning - Whether panning is active
 * @returns {Object} Canvas mode state and handlers
 */
export const useCanvasMode = (modeHandlers, isPanning = false) => {
    const toolMode = useToolStore((state) => state.toolMode)
    const setToolMode = useToolStore((state) => state.setToolMode)

    const setMode = useCallback((mode) => {
        if (Object.values(CANVAS_MODES).includes(mode)) {
            setToolMode(mode)
        } else {
            logger.warn(`Invalid mode: ${mode}`)
        }
    }, [setToolMode])

    const getMode = useCallback(() => {
        return toolMode
    }, [toolMode])

    // Get active handlers based on current mode
    const activeHandlers = useMemo(() => {
        if (toolMode === CANVAS_MODES.PAN) {
            return {
                onMouseDown: modeHandlers.pan.onMouseDown,
                onMouseMove: modeHandlers.pan.onMouseMove,
                onMouseUp: modeHandlers.pan.onMouseUp,
                cursor: isPanning ? 'grabbing' : 'grab'
            }
        }

        // Default to SELECT mode
        return {
            onMouseDown: modeHandlers.select.onMouseDown,
            onMouseMove: modeHandlers.select.onMouseMove,
            onMouseUp: modeHandlers.select.onMouseUp,
            cursor: 'default'
        }
    }, [toolMode, modeHandlers, isPanning])

    return {
        mode: toolMode,
        setMode,
        getMode,
        handlers: activeHandlers,
        isPanMode: toolMode === CANVAS_MODES.PAN,
        isSelectMode: toolMode === CANVAS_MODES.SELECT
    }
}
