import { useEffect, useRef } from 'react'
import { CANVAS } from '../constants'

/**
 * Hook for handling zoom and scroll using CSS variables (no re-renders!)
 */
export const useZoom = (canvasRef, initialOffset = { x: 0, y: 0 }) => {
    const zoomRef = useRef(CANVAS.ZOOM.DEFAULT)
    const offsetRef = useRef(initialOffset)
    const contentRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        // Find .canvas-content element
        contentRef.current = canvas.querySelector('.canvas-content')
        if (!contentRef.current) return

        // Set initial CSS variables
        contentRef.current.style.setProperty('--canvas-zoom', String(zoomRef.current))
        contentRef.current.style.setProperty('--canvas-offset-x', `${offsetRef.current.x}px`)
        contentRef.current.style.setProperty('--canvas-offset-y', `${offsetRef.current.y}px`)
    }, [canvasRef])

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

                zoomRef.current = newZoom
                offsetRef.current = { x: newOffsetX, y: newOffsetY }

                if (contentRef.current) {
                    contentRef.current.style.setProperty('--canvas-zoom', String(newZoom))
                    contentRef.current.style.setProperty('--canvas-offset-x', `${newOffsetX}px`)
                    contentRef.current.style.setProperty('--canvas-offset-y', `${newOffsetY}px`)
                }

                pendingZoom = null
                hasZoomChanged = true
            }

            if (pendingScroll.x !== 0 || pendingScroll.y !== 0) {
                const newOffsetX = offsetRef.current.x + pendingScroll.x
                const newOffsetY = offsetRef.current.y + pendingScroll.y

                offsetRef.current = { x: newOffsetX, y: newOffsetY }

                if (contentRef.current) {
                    contentRef.current.style.setProperty('--canvas-offset-x', `${newOffsetX}px`)
                    contentRef.current.style.setProperty('--canvas-offset-y', `${newOffsetY}px`)
                }

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

    // Return refs and current values for components that need them
    return {
        zoomRef,
        offsetRef,
        getZoom: () => zoomRef.current,
        getOffset: () => offsetRef.current
    }
}
