import { useMemo } from 'react'
import { FLOATING_TOOLBAR } from '../constants'

/**
 * Hook for calculating Block Floating Toolbar position
 * Returns position in world coordinates (relative to canvas-content)
 * Toolbar is positioned above and aligned to the left of the block
 *
 * @param {Object} blockBounds - Block bounds in world coordinates {x, y, width, height}
 * @returns {Object} - Position object {left, top}
 */
const useBlockToolbar = (blockBounds) => {
    const position = useMemo(() => {
        if (!blockBounds) {
            return { left: 0, top: 0 }
        }

        // Position toolbar at left edge of block
        const left = blockBounds.x

        // Position toolbar above block with offset
        const top = blockBounds.y - FLOATING_TOOLBAR.OFFSET_FROM_BLOCK - FLOATING_TOOLBAR.BUTTON_SIZE - FLOATING_TOOLBAR.PADDING * 2

        return {
            left,
            top
        }
    }, [blockBounds])

    return position
}

export default useBlockToolbar
