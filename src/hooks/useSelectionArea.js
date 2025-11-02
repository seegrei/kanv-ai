import { useState, useEffect, useCallback, useRef } from 'react'
import { screenToWorld } from '../utils/coordinateUtils'
import { findIntersectingElements } from '../utils/intersectionUtils'

const MIN_SELECTION_SIZE = 5 // Minimum size in pixels to consider as valid selection

/**
 * Hook for managing selection area (drag-to-select functionality)
 * Handles the visual selection box and finding elements within it
 * Uses RAF throttling for optimal performance
 */
const useSelectionArea = ({ canvasRef, offsetRef, zoomRef, elements, onSelectionChange }) => {
    const [isSelecting, setIsSelecting] = useState(false)
    const [selectionBox, setSelectionBox] = useState(null)

    // Refs for RAF optimization
    const rafRef = useRef(null)
    const pendingUpdateRef = useRef(null)
    const canvasRectRef = useRef(null)

    // Refs to avoid stale closures
    const selectionBoxRef = useRef(null)
    const elementsRef = useRef(elements)
    const onSelectionChangeRef = useRef(onSelectionChange)

    // Update refs when dependencies change
    useEffect(() => {
        elementsRef.current = elements
        onSelectionChangeRef.current = onSelectionChange
    }, [elements, onSelectionChange])

    /**
     * Process pending selection box update via RAF
     */
    const processSelectionUpdate = useCallback(() => {
        if (!pendingUpdateRef.current) return

        const { endX, endY } = pendingUpdateRef.current

        setSelectionBox(prev => {
            if (!prev) return null
            const updatedBox = {
                ...prev,
                endX,
                endY
            }
            // Synchronously update ref
            selectionBoxRef.current = updatedBox
            return updatedBox
        })

        pendingUpdateRef.current = null
        rafRef.current = null
    }, [])

    /**
     * Start selection area dragging
     */
    const handleStart = useCallback((e) => {
        // Only allow selection with left mouse button
        if (e.button !== 0) return

        const tagName = e.target.tagName?.toLowerCase()
        const isCanvasClick = e.target.classList.contains('canvas') ||
                              e.target.classList.contains('canvas-content') ||
                              tagName === 'svg' ||
                              tagName === 'rect'

        if (!isCanvasClick) return

        // Clear previous selection immediately when starting new selection
        onSelectionChangeRef.current([])

        // Cache canvas rect for performance
        const rect = canvasRef.current.getBoundingClientRect()
        canvasRectRef.current = rect

        const startX = e.clientX - rect.left
        const startY = e.clientY - rect.top

        const initialBox = {
            startX,
            startY,
            endX: startX,
            endY: startY
        }

        setSelectionBox(initialBox)
        selectionBoxRef.current = initialBox
        setIsSelecting(true)
    }, [canvasRef])

    // Handle mouse events in useEffect when selecting
    useEffect(() => {
        if (!isSelecting) return

        /**
         * Update selection area during dragging (with RAF throttling)
         */
        const handleMove = (e) => {
            const rect = canvasRectRef.current
            if (!rect) return

            const endX = e.clientX - rect.left
            const endY = e.clientY - rect.top

            pendingUpdateRef.current = { endX, endY }

            if (!rafRef.current) {
                rafRef.current = requestAnimationFrame(processSelectionUpdate)
            }
        }

        /**
         * End selection area dragging and find selected elements
         */
        const handleEnd = () => {
            setIsSelecting(false)

            // Cancel any pending RAF
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current)
                rafRef.current = null
            }

            // Process any pending update before finishing
            if (pendingUpdateRef.current) {
                const { endX, endY } = pendingUpdateRef.current
                selectionBoxRef.current = {
                    ...selectionBoxRef.current,
                    endX,
                    endY
                }
            }

            const box = selectionBoxRef.current
            if (!box) {
                setSelectionBox(null)
                canvasRectRef.current = null
                pendingUpdateRef.current = null
                return
            }

            const width = Math.abs(box.endX - box.startX)
            const height = Math.abs(box.endY - box.startY)

            // Ignore very small selections (likely accidental clicks)
            if (width < MIN_SELECTION_SIZE && height < MIN_SELECTION_SIZE) {
                setSelectionBox(null)
                selectionBoxRef.current = null
                canvasRectRef.current = null
                pendingUpdateRef.current = null
                return
            }

            const minX = Math.min(box.startX, box.endX)
            const maxX = Math.max(box.startX, box.endX)
            const minY = Math.min(box.startY, box.endY)
            const maxY = Math.max(box.startY, box.endY)

            // Convert screen bounds to world coordinates
            const worldTopLeft = screenToWorld(minX, minY, offsetRef.current, zoomRef.current)
            const worldBottomRight = screenToWorld(maxX, maxY, offsetRef.current, zoomRef.current)

            // Find intersecting elements
            const bounds = {
                minX: worldTopLeft.x,
                maxX: worldBottomRight.x,
                minY: worldTopLeft.y,
                maxY: worldBottomRight.y
            }

            const selectedElements = findIntersectingElements(bounds, elementsRef.current)
            onSelectionChangeRef.current(selectedElements.map(el => el.id))

            // Clean up all refs and state
            setSelectionBox(null)
            selectionBoxRef.current = null
            canvasRectRef.current = null
            pendingUpdateRef.current = null
        }

        window.addEventListener('mousemove', handleMove)
        window.addEventListener('mouseup', handleEnd)

        return () => {
            window.removeEventListener('mousemove', handleMove)
            window.removeEventListener('mouseup', handleEnd)

            // Cleanup RAF
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current)
                rafRef.current = null
            }
        }
    }, [isSelecting, offsetRef, zoomRef, processSelectionUpdate])

    return {
        selectionBox,
        handleStart
    }
}

export default useSelectionArea
