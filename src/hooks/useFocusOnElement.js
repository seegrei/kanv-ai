import { useCallback, useRef } from 'react'

/**
 * Hook for focusing (centering) camera on a specific element
 * Provides smooth camera transition to element position
 */
export const useFocusOnElement = (offsetRef, zoomRef) => {
    const contentRef = useRef(null)

    /**
     * Focus camera on element by ID
     * Centers the element in the viewport with smooth animation
     *
     * @param {string} elementId - Element ID to focus on
     * @param {Array} elements - Array of all canvas elements
     * @param {Object} options - Focus options
     * @param {boolean} options.smooth - Use smooth animation (default: true)
     * @param {number} options.centerY - Vertical position (0-1, default: 0.5 for center)
     */
    const focusOnElement = useCallback((elementId, elements, options = {}) => {
        const { smooth = true, centerY = 0.5 } = options

        const element = elements.find(el => el.id === elementId)
        if (!element) return

        // Get element dimensions
        const elementWidth = element.width || 300
        const elementHeight = element.height || 200

        // Calculate element center
        const elementCenterX = element.x + elementWidth / 2
        const elementCenterY = element.y + elementHeight / 2

        // Calculate viewport center
        const viewportCenterX = window.innerWidth / 2
        const viewportCenterY = window.innerHeight * centerY

        // Calculate new offset to center element
        const newOffsetX = viewportCenterX - elementCenterX * zoomRef.current
        const newOffsetY = viewportCenterY - elementCenterY * zoomRef.current

        // Update offset ref
        offsetRef.current = { x: newOffsetX, y: newOffsetY }

        // Get content element if not cached
        if (!contentRef.current) {
            const canvas = document.querySelector('.canvas')
            if (canvas) {
                contentRef.current = canvas.querySelector('.canvas-content')
            }
        }

        // Update CSS variables with animation
        if (contentRef.current) {
            if (smooth) {
                contentRef.current.style.transition = 'transform 0.3s ease-out'
            }

            contentRef.current.style.setProperty('--canvas-offset-x', `${newOffsetX}px`)
            contentRef.current.style.setProperty('--canvas-offset-y', `${newOffsetY}px`)

            // Remove transition after animation completes
            if (smooth) {
                setTimeout(() => {
                    if (contentRef.current) {
                        contentRef.current.style.transition = ''
                    }
                }, 300)
            }
        }

        // Emit event for viewport culling
        window.dispatchEvent(new CustomEvent('canvas:pan'))
    }, [offsetRef, zoomRef])

    /**
     * Focus camera on element bounds (useful for chat panels)
     * Centers a specific area in the viewport
     *
     * @param {Object} bounds - Bounds to focus on
     * @param {number} bounds.x - X position
     * @param {number} bounds.y - Y position
     * @param {number} bounds.width - Width
     * @param {number} bounds.height - Height
     * @param {Object} options - Focus options
     * @param {boolean} options.smooth - Use smooth animation (default: true)
     * @param {number} options.centerY - Vertical position (0-1, default: 0.5 for center)
     */
    const focusOnBounds = useCallback((bounds, options = {}) => {
        const { smooth = true, centerY = 0.5 } = options

        // Calculate bounds center
        const centerX = bounds.x + bounds.width / 2
        const centerY_coord = bounds.y + bounds.height / 2

        // Calculate viewport center
        const viewportCenterX = window.innerWidth / 2
        const viewportCenterY = window.innerHeight * centerY

        // Calculate new offset to center bounds
        const newOffsetX = viewportCenterX - centerX * zoomRef.current
        const newOffsetY = viewportCenterY - centerY_coord * zoomRef.current

        // Update offset ref
        offsetRef.current = { x: newOffsetX, y: newOffsetY }

        // Get content element if not cached
        if (!contentRef.current) {
            const canvas = document.querySelector('.canvas')
            if (canvas) {
                contentRef.current = canvas.querySelector('.canvas-content')
            }
        }

        // Update CSS variables with animation
        if (contentRef.current) {
            if (smooth) {
                contentRef.current.style.transition = 'transform 0.3s ease-out'
            }

            contentRef.current.style.setProperty('--canvas-offset-x', `${newOffsetX}px`)
            contentRef.current.style.setProperty('--canvas-offset-y', `${newOffsetY}px`)

            // Remove transition after animation completes
            if (smooth) {
                setTimeout(() => {
                    if (contentRef.current) {
                        contentRef.current.style.transition = ''
                    }
                }, 300)
            }
        }

        // Emit event for viewport culling
        window.dispatchEvent(new CustomEvent('canvas:pan'))
    }, [offsetRef, zoomRef])

    /**
     * Focus camera on a specific point
     * Centers a specific coordinate in the viewport
     *
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} options - Focus options
     * @param {boolean} options.smooth - Use smooth animation (default: true)
     * @param {number} options.centerY - Vertical position (0-1, default: 0.5 for center)
     */
    const focusOnPoint = useCallback((x, y, options = {}) => {
        const { smooth = true, centerY = 0.5 } = options

        // Calculate viewport center
        const viewportCenterX = window.innerWidth / 2
        const viewportCenterY = window.innerHeight * centerY

        // Calculate new offset to center point
        const newOffsetX = viewportCenterX - x * zoomRef.current
        const newOffsetY = viewportCenterY - y * zoomRef.current

        // Update offset ref
        offsetRef.current = { x: newOffsetX, y: newOffsetY }

        // Get content element if not cached
        if (!contentRef.current) {
            const canvas = document.querySelector('.canvas')
            if (canvas) {
                contentRef.current = canvas.querySelector('.canvas-content')
            }
        }

        // Update CSS variables with animation
        if (contentRef.current) {
            if (smooth) {
                contentRef.current.style.transition = 'transform 0.3s ease-out'
            }

            contentRef.current.style.setProperty('--canvas-offset-x', `${newOffsetX}px`)
            contentRef.current.style.setProperty('--canvas-offset-y', `${newOffsetY}px`)

            // Remove transition after animation completes
            if (smooth) {
                setTimeout(() => {
                    if (contentRef.current) {
                        contentRef.current.style.transition = ''
                    }
                }, 300)
            }
        }

        // Emit event for viewport culling
        window.dispatchEvent(new CustomEvent('canvas:pan'))
    }, [offsetRef, zoomRef])

    return { focusOnElement, focusOnBounds, focusOnPoint }
}

export default useFocusOnElement
