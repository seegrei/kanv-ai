import { useRef, useEffect, useState } from 'react'
import { useZoom } from './useZoom'
import { usePan } from './usePan'

/**
 * Unified hook for canvas controls
 */
export const useCanvasControls = () => {
    const canvasRef = useRef(null)
    const [isMiddleButtonPanning, setIsMiddleButtonPanning] = useState(false)
    const lastMousePosRef = useRef({ x: 0, y: 0 })
    const contentRef = useRef(null)

    const { zoomRef, offsetRef } = useZoom(canvasRef)
    const { isPanning, handleMouseDown, handleMouseMove, handleMouseUp } = usePan(offsetRef, canvasRef)

    // Find canvas-content element
    useEffect(() => {
        if (canvasRef.current) {
            contentRef.current = canvasRef.current.querySelector('.canvas-content')
        }
    }, [])

    // Middle mouse button panning
    useEffect(() => {
        const handleMiddleMouseDown = (e) => {
            if (e.button === 1) {
                e.preventDefault()
                setIsMiddleButtonPanning(true)
                lastMousePosRef.current = { x: e.clientX, y: e.clientY }
            }
        }

        const handleMiddleMouseMove = (e) => {
            if (!isMiddleButtonPanning) return

            const dx = e.clientX - lastMousePosRef.current.x
            const dy = e.clientY - lastMousePosRef.current.y

            // Update offset ref
            offsetRef.current = {
                x: offsetRef.current.x + dx,
                y: offsetRef.current.y + dy
            }

            // Update CSS variables directly
            if (contentRef.current) {
                contentRef.current.style.setProperty('--canvas-offset-x', `${offsetRef.current.x}px`)
                contentRef.current.style.setProperty('--canvas-offset-y', `${offsetRef.current.y}px`)
            }

            // Emit event for viewport culling
            window.dispatchEvent(new CustomEvent('canvas:pan'))

            lastMousePosRef.current = { x: e.clientX, y: e.clientY }
        }

        const handleMiddleMouseUp = () => {
            setIsMiddleButtonPanning(false)
        }

        window.addEventListener('mousedown', handleMiddleMouseDown)
        window.addEventListener('mousemove', handleMiddleMouseMove)
        window.addEventListener('mouseup', handleMiddleMouseUp)

        return () => {
            window.removeEventListener('mousedown', handleMiddleMouseDown)
            window.removeEventListener('mousemove', handleMiddleMouseMove)
            window.removeEventListener('mouseup', handleMiddleMouseUp)
        }
    }, [isMiddleButtonPanning, offsetRef])

    return {
        offsetRef,
        zoomRef,
        isPanning: isPanning || isMiddleButtonPanning,
        canvasRef,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp
    }
}
