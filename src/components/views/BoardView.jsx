import { memo } from 'react'
import Canvas from '../canvas/Canvas/Canvas'

/**
 * Board View
 * Displays the canvas for the current board
 */
export const BoardView = memo(() => {
    return <Canvas />
})

BoardView.displayName = 'BoardView'
