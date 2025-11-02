import { useState, useEffect, useCallback } from 'react'

/**
 * Hook for viewport culling - renders only blocks visible in viewport
 * Significantly improves performance with large number of blocks (1000+)
 *
 * @param {Array} elements - All elements in canvas
 * @param {Object} zoomRef - Zoom reference object
 * @param {Object} offsetRef - Offset reference object
 * @param {number} bufferMultiplier - Buffer zone multiplier (default: 0.5 = 50% extra on each side)
 * @returns {Array} Visible elements
 */
const useViewportCulling = (elements, zoomRef, offsetRef, bufferMultiplier = 0.5) => {
    const [visibleElements, setVisibleElements] = useState([])

    /**
     * Calculate viewport bounds in canvas coordinates
     * @returns {Object} Viewport bounds {left, top, right, bottom}
     */
    const getViewportBounds = useCallback(() => {
        const zoom = zoomRef.current
        const offset = offsetRef.current

        // Get viewport size
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        // Add buffer zone (extra area to render for smooth scrolling)
        const bufferWidth = viewportWidth * bufferMultiplier
        const bufferHeight = viewportHeight * bufferMultiplier

        // Convert viewport coordinates to canvas coordinates
        const left = (-offset.x - bufferWidth) / zoom
        const top = (-offset.y - bufferHeight) / zoom
        const right = (-offset.x + viewportWidth + bufferWidth) / zoom
        const bottom = (-offset.y + viewportHeight + bufferHeight) / zoom

        return { left, top, right, bottom }
    }, [zoomRef, offsetRef, bufferMultiplier])

    /**
     * Check if element is in viewport
     * @param {Object} element - Element to check
     * @param {Object} viewport - Viewport bounds
     * @returns {boolean} True if element is visible
     */
    const isElementInViewport = useCallback((element, viewport) => {
        const elementRight = element.x + (element.width || 300)
        const elementBottom = element.y + (element.height || 200)

        // Check if element intersects with viewport
        return !(
            element.x > viewport.right ||
            elementRight < viewport.left ||
            element.y > viewport.bottom ||
            elementBottom < viewport.top
        )
    }, [])

    /**
     * Update visible elements based on current viewport
     */
    const updateVisibleElements = useCallback(() => {
        // Skip if no elements
        if (!elements || elements.length === 0) {
            setVisibleElements([])
            return
        }

        // For small number of elements, render all (culling overhead not worth it)
        if (elements.length < 100) {
            setVisibleElements(elements)
            return
        }

        const viewport = getViewportBounds()

        // Filter elements that are in viewport
        const visible = elements.filter(element =>
            isElementInViewport(element, viewport)
        )

        setVisibleElements(visible)
    }, [elements, getViewportBounds, isElementInViewport])

    // Update visible elements when elements, zoom, or offset change
    useEffect(() => {
        updateVisibleElements()
    }, [elements, updateVisibleElements])

    // Listen for zoom and pan events
    useEffect(() => {
        let rafId = null
        let frameCounter = 0
        const skipFrames = 1 // Skip every 2nd frame for 30fps instead of 60fps

        const handleViewportChange = () => {
            if (rafId) return // Already scheduled an update

            rafId = requestAnimationFrame(() => {
                frameCounter++
                if (frameCounter <= skipFrames) {
                    rafId = null
                    handleViewportChange()
                    return
                }

                frameCounter = 0
                updateVisibleElements()
                rafId = null
            })
        }

        // Listen for custom events (emitted by canvas controls)
        window.addEventListener('canvas:pan', handleViewportChange)
        window.addEventListener('canvas:zoom', handleViewportChange)
        window.addEventListener('resize', handleViewportChange)

        return () => {
            window.removeEventListener('canvas:pan', handleViewportChange)
            window.removeEventListener('canvas:zoom', handleViewportChange)
            window.removeEventListener('resize', handleViewportChange)
            if (rafId) cancelAnimationFrame(rafId)
        }
    }, [updateVisibleElements])

    return visibleElements
}

export default useViewportCulling
