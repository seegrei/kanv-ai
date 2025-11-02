import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Hook for handling pan functionality using CSS variables
 */
export const usePan = (offsetRef, canvasRef) => {
    const [isPanning, setIsPanning] = useState(false)
    const isPanningRef = useRef(false)
    const lastMousePosRef = useRef({ x: 0, y: 0 })
    const contentRef = useRef(null)

    useEffect(() => {
        if (canvasRef.current) {
            contentRef.current = canvasRef.current.querySelector('.canvas-content')
        }
    }, [canvasRef])

    const handleMouseDown = useCallback((e) => {
        // Don't pan if clicking on toolbar or settings
        if (e.target.closest('.toolbar') || e.target.closest('.settings-button')) {
            return
        }
        isPanningRef.current = true
        lastMousePosRef.current = { x: e.clientX, y: e.clientY }
        setIsPanning(true)
    }, [])

    const handleMouseMove = useCallback((e) => {
        if (!isPanningRef.current) return

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
    }, [offsetRef])

    const handleMouseUp = useCallback(() => {
        isPanningRef.current = false
        setIsPanning(false)
    }, [])

    return {
        isPanning,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp
    }
}
