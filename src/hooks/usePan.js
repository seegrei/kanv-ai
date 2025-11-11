import { useState, useCallback, useRef, useEffect } from 'react'
import { getEventCoordinates, getTouchPoints, isTouchEvent } from '../utils/touch/touchUtils'
import { useCanvasViewStore } from '../store/useCanvasViewStore'

/**
 * Hook for handling pan functionality using CSS variables
 * Supports both mouse and touch events (single-finger pan only; two fingers are reserved for zoom)
 * Synchronized with useCanvasViewStore for state persistence across board switches
 */
export const usePan = (offsetRef, canvasRef) => {
    const [isPanning, setIsPanning] = useState(false)
    const isPanningRef = useRef(false)
    const lastMousePosRef = useRef({ x: 0, y: 0 })
    const contentRef = useRef(null)
    const touchCountRef = useRef(0)
    const rafRef = useRef(null)
    const pendingPanRef = useRef(null)

    useEffect(() => {
        if (canvasRef.current) {
            contentRef.current = canvasRef.current.querySelector('.canvas-content')
        }
    }, [canvasRef])

    const handlePointerDown = useCallback((e) => {
        // Don't pan if clicking on toolbar, settings, or blocks
        if (e.target.closest('.toolbar') ||
            e.target.closest('.settings-button') ||
            e.target.closest('.text-block') ||
            e.target.closest('.image-block') ||
            e.target.closest('.chat-block')) {
            return
        }

        const isTouch = isTouchEvent(e)

        // For touch events, track touch count
        if (isTouch) {
            const touchPoints = getTouchPoints(e)
            touchCountRef.current = touchPoints.length

            // Two fingers = zoom only, don't pan
            if (touchPoints.length === 2) {
                return
            }

            // For single touch, only start panning (will be handled by pan mode)
            if (touchPoints.length === 1) {
                lastMousePosRef.current = { x: touchPoints[0].clientX, y: touchPoints[0].clientY }
                isPanningRef.current = true
                setIsPanning(true)
                return
            }
        } else {
            // Mouse event
            const coords = getEventCoordinates(e)
            lastMousePosRef.current = { x: coords.clientX, y: coords.clientY }
            isPanningRef.current = true
            setIsPanning(true)
        }
    }, [])

    const processPan = useCallback(() => {
        if (!pendingPanRef.current) return

        const { currentX, currentY } = pendingPanRef.current

        const dx = currentX - lastMousePosRef.current.x
        const dy = currentY - lastMousePosRef.current.y

        const newOffset = {
            x: offsetRef.current.x + dx,
            y: offsetRef.current.y + dy
        }

        // Update store (this will trigger subscription in useZoom and update refs/CSS)
        useCanvasViewStore.getState().setOffset(newOffset)

        // Emit event for viewport culling
        window.dispatchEvent(new CustomEvent('canvas:pan'))

        lastMousePosRef.current = { x: currentX, y: currentY }
        pendingPanRef.current = null
        rafRef.current = null
    }, [offsetRef])

    const handlePointerMove = useCallback((e) => {
        if (!isPanningRef.current) return

        const isTouch = isTouchEvent(e)
        let currentX, currentY

        if (isTouch) {
            const touchPoints = getTouchPoints(e)

            // Two fingers = zoom only, stop panning
            if (touchPoints.length === 2) {
                isPanningRef.current = false
                setIsPanning(false)
                return
            }

            if (touchPoints.length === 1) {
                // Single touch
                currentX = touchPoints[0].clientX
                currentY = touchPoints[0].clientY
            } else {
                // No touches - ignore
                return
            }
        } else {
            // Mouse event
            const coords = getEventCoordinates(e)
            currentX = coords.clientX
            currentY = coords.clientY
        }

        // Store pending pan update
        pendingPanRef.current = { currentX, currentY }

        // Schedule RAF if not already scheduled
        if (!rafRef.current) {
            rafRef.current = requestAnimationFrame(processPan)
        }
    }, [processPan])

    const handlePointerUp = useCallback(() => {
        // Cancel any pending RAF
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
        }

        // Process any pending pan before finishing
        if (pendingPanRef.current) {
            const { currentX, currentY } = pendingPanRef.current
            const dx = currentX - lastMousePosRef.current.x
            const dy = currentY - lastMousePosRef.current.y

            const newOffset = {
                x: offsetRef.current.x + dx,
                y: offsetRef.current.y + dy
            }

            // Update store
            useCanvasViewStore.getState().setOffset(newOffset)

            window.dispatchEvent(new CustomEvent('canvas:pan'))
            pendingPanRef.current = null
        }

        isPanningRef.current = false
        setIsPanning(false)
        touchCountRef.current = 0
    }, [offsetRef])

    return {
        isPanning,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        // Legacy names for backward compatibility
        handleMouseDown: handlePointerDown,
        handleMouseMove: handlePointerMove,
        handleMouseUp: handlePointerUp
    }
}
