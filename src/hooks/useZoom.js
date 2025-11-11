import { useEffect, useRef } from 'react'
import { CANVAS } from '../constants'
import { getTouchPoints, getDistance, getCenterPoint } from '../utils/touch/touchUtils'
import { useCanvasViewStore } from '../store/useCanvasViewStore'

/**
 * Hook for handling zoom and scroll using CSS variables (no re-renders!)
 * Supports both wheel events and pinch-to-zoom gestures
 * Synchronized with useCanvasViewStore for state persistence across board switches
 */
export const useZoom = (canvasRef) => {
    const zoomRef = useRef(CANVAS.ZOOM.DEFAULT)
    const offsetRef = useRef({ x: 0, y: 0 })
    const contentRef = useRef(null)
    const initialPinchDistanceRef = useRef(null)
    const initialPinchZoomRef = useRef(null)

    // Initialize refs from store on mount
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        // Find .canvas-content element
        contentRef.current = canvas.querySelector('.canvas-content')
        if (!contentRef.current) return

        // Initialize refs from store
        const { offset, zoom } = useCanvasViewStore.getState()
        zoomRef.current = zoom
        offsetRef.current = offset

        // Set initial CSS variables
        contentRef.current.style.setProperty('--canvas-zoom', String(zoom))
        contentRef.current.style.setProperty('--canvas-offset-x', `${offset.x}px`)
        contentRef.current.style.setProperty('--canvas-offset-y', `${offset.y}px`)
    }, [canvasRef])

    // Subscribe to store changes to sync refs and CSS
    useEffect(() => {
        const unsubscribe = useCanvasViewStore.subscribe((state) => {
            // Update refs
            zoomRef.current = state.zoom
            offsetRef.current = state.offset

            // Update CSS variables
            if (contentRef.current) {
                contentRef.current.style.setProperty('--canvas-zoom', String(state.zoom))
                contentRef.current.style.setProperty('--canvas-offset-x', `${state.offset.x}px`)
                contentRef.current.style.setProperty('--canvas-offset-y', `${state.offset.y}px`)
            }
        })

        return unsubscribe
    }, [])

    // Wheel and scroll handling
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        let rafId = null
        let pendingZoom = null
        let pendingScroll = { x: 0, y: 0 }
        let hasPendingUpdates = false

        const applyUpdates = () => {
            let hasZoomChanged = false
            let hasPanChanged = false

            if (pendingZoom !== null) {
                const { newZoom, newOffsetX, newOffsetY } = pendingZoom

                // Update store (this will trigger subscription and update refs/CSS)
                useCanvasViewStore.getState().setCanvasView({
                    zoom: newZoom,
                    offset: { x: newOffsetX, y: newOffsetY }
                })

                pendingZoom = null
                hasZoomChanged = true
            }

            if (pendingScroll.x !== 0 || pendingScroll.y !== 0) {
                const newOffsetX = offsetRef.current.x + pendingScroll.x
                const newOffsetY = offsetRef.current.y + pendingScroll.y

                // Update store
                useCanvasViewStore.getState().setOffset({
                    x: newOffsetX,
                    y: newOffsetY
                })

                pendingScroll = { x: 0, y: 0 }
                hasPanChanged = true
            }

            // Emit events for viewport culling
            if (hasZoomChanged) {
                window.dispatchEvent(new CustomEvent('canvas:zoom'))
            }
            if (hasPanChanged) {
                window.dispatchEvent(new CustomEvent('canvas:pan'))
            }

            rafId = null
            hasPendingUpdates = false
        }

        const scheduleUpdate = () => {
            if (!rafId && hasPendingUpdates) {
                rafId = requestAnimationFrame(applyUpdates)
            }
        }

        const handleWheel = (e) => {
            e.preventDefault()

            if (e.ctrlKey) {
                // Zoom with ctrl+wheel - calculate immediately but apply via RAF
                const rect = canvas.getBoundingClientRect()
                const mouseX = e.clientX - rect.left
                const mouseY = e.clientY - rect.top

                const worldX = (mouseX - offsetRef.current.x) / zoomRef.current
                const worldY = (mouseY - offsetRef.current.y) / zoomRef.current

                const newZoom = Math.max(
                    CANVAS.ZOOM.MIN,
                    Math.min(CANVAS.ZOOM.MAX, zoomRef.current - e.deltaY * CANVAS.ZOOM.SENSITIVITY)
                )

                const newOffsetX = mouseX - worldX * newZoom
                const newOffsetY = mouseY - worldY * newZoom

                pendingZoom = { newZoom, newOffsetX, newOffsetY }
                pendingScroll = { x: 0, y: 0 } // Clear pending scroll when zooming
                hasPendingUpdates = true
            } else {
                // Scroll with plain wheel/trackpad - accumulate deltas
                pendingScroll.x -= e.deltaX
                pendingScroll.y -= e.deltaY
                hasPendingUpdates = true
            }

            scheduleUpdate()
        }

        canvas.addEventListener('wheel', handleWheel, { passive: false })

        return () => {
            canvas.removeEventListener('wheel', handleWheel)
            if (rafId) {
                cancelAnimationFrame(rafId)
            }
        }
    }, [canvasRef])

    // Touch events for pinch-to-zoom
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        let rafId = null
        let pendingZoom = null
        let hasPendingUpdates = false

        const applyUpdates = () => {
            if (pendingZoom !== null) {
                const { newZoom, newOffsetX, newOffsetY } = pendingZoom

                // Update store
                useCanvasViewStore.getState().setCanvasView({
                    zoom: newZoom,
                    offset: { x: newOffsetX, y: newOffsetY }
                })

                pendingZoom = null
                window.dispatchEvent(new CustomEvent('canvas:zoom'))
            }

            rafId = null
            hasPendingUpdates = false
        }

        const scheduleUpdate = () => {
            if (!rafId && hasPendingUpdates) {
                rafId = requestAnimationFrame(applyUpdates)
            }
        }

        const handleTouchStart = (e) => {
            const touchPoints = getTouchPoints(e)

            // Only handle pinch gestures (2 fingers)
            if (touchPoints.length === 2) {
                const distance = getDistance(touchPoints[0], touchPoints[1])
                initialPinchDistanceRef.current = distance
                initialPinchZoomRef.current = zoomRef.current
                e.preventDefault()
            }
        }

        const handleTouchMove = (e) => {
            const touchPoints = getTouchPoints(e)

            // Only handle pinch gestures (2 fingers)
            if (touchPoints.length === 2 && initialPinchDistanceRef.current !== null) {
                e.preventDefault()

                const currentDistance = getDistance(touchPoints[0], touchPoints[1])
                const scale = currentDistance / initialPinchDistanceRef.current

                // Calculate new zoom
                const newZoom = Math.max(
                    CANVAS.ZOOM.MIN,
                    Math.min(CANVAS.ZOOM.MAX, initialPinchZoomRef.current * scale)
                )

                // Get center point between fingers (in viewport coordinates)
                const center = getCenterPoint(touchPoints[0], touchPoints[1])
                const rect = canvas.getBoundingClientRect()
                const centerX = center.clientX - rect.left
                const centerY = center.clientY - rect.top

                // Calculate world coordinates at pinch center
                const worldX = (centerX - offsetRef.current.x) / zoomRef.current
                const worldY = (centerY - offsetRef.current.y) / zoomRef.current

                // Calculate new offset to keep pinch center at same world position
                const newOffsetX = centerX - worldX * newZoom
                const newOffsetY = centerY - worldY * newZoom

                pendingZoom = { newZoom, newOffsetX, newOffsetY }
                hasPendingUpdates = true
                scheduleUpdate()
            }
        }

        const handleTouchEnd = (e) => {
            const touchPoints = getTouchPoints(e)

            // If less than 2 touches remain, end pinch gesture
            if (touchPoints.length < 2) {
                initialPinchDistanceRef.current = null
                initialPinchZoomRef.current = null
            }
        }

        canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false })
        canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false })

        return () => {
            canvas.removeEventListener('touchstart', handleTouchStart)
            canvas.removeEventListener('touchmove', handleTouchMove)
            canvas.removeEventListener('touchend', handleTouchEnd)
            canvas.removeEventListener('touchcancel', handleTouchEnd)
            if (rafId) {
                cancelAnimationFrame(rafId)
            }
        }
    }, [canvasRef])

    // Return refs and current values for components that need them
    return {
        zoomRef,
        offsetRef,
        getZoom: () => zoomRef.current,
        getOffset: () => offsetRef.current
    }
}
