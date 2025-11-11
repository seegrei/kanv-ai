import { useState, useEffect, useRef } from 'react'
import { screenToWorld } from '../utils/canvas/coordinateUtils'
import { getEventCoordinates, isTouchEvent } from '../utils/touch/touchUtils'

/**
 * Hook for handling multiple elements dragging
 * Uses RAF throttling and local state for optimal performance
 * Supports both mouse and touch events
 */
const useMultipleDraggable = ({
    selectedIds,
    elements,
    zoomRef,
    offsetRef,
    onUpdateMultiple,
    onMouseDown,
    onDragEnd
}) => {
    const [isDragging, setIsDragging] = useState(false)
    const [dragStartPosition, setDragStartPosition] = useState(null)
    const [initialPositions, setInitialPositions] = useState(new Map())
    const [localPositions, setLocalPositions] = useState(new Map())
    const initialPositionsRef = useRef(new Map())
    const localPositionsRef = useRef(new Map())
    const wasDragged = useRef(false)
    const rafRef = useRef(null)
    const pendingUpdateRef = useRef(null)

    /**
     * Start dragging multiple elements
     * @param {MouseEvent|TouchEvent} e - Mouse or touch event
     * @param {string|number} clickedId - ID of the element that was clicked
     */
    const handlePointerDown = (e, clickedId) => {
        const isTouch = isTouchEvent(e)

        // Only handle left mouse button for mouse events
        if (!isTouch && e.button !== 0) return

        // For touch events, ignore if two fingers (reserved for zoom)
        // Check both e.touches (native) and e.nativeEvent.touches (React synthetic)
        if (isTouch) {
            const touches = e.touches || e.nativeEvent?.touches;
            if (touches && touches.length === 2) {
                return
            }
        }

        // Call the parent onMouseDown to ensure selection is maintained
        if (onMouseDown) {
            onMouseDown(e, clickedId)
        }

        e.preventDefault()
        setIsDragging(true)
        wasDragged.current = false

        // Get coordinates from mouse or touch event
        const coords = getEventCoordinates(e)

        // Store initial world position
        const worldPos = screenToWorld(coords.clientX, coords.clientY, offsetRef.current, zoomRef.current)
        setDragStartPosition(worldPos)

        // Store initial positions of all selected elements
        const positions = new Map()
        selectedIds.forEach(id => {
            const element = elements.find(el => el.id === id)
            if (element) {
                positions.set(id, { x: element.x, y: element.y })
            }
        })
        setInitialPositions(positions)
        setLocalPositions(positions)
        initialPositionsRef.current = positions
        localPositionsRef.current = positions
    }

    useEffect(() => {
        if (!isDragging || !dragStartPosition) return

        const processDrag = () => {
            if (!pendingUpdateRef.current) return

            const { deltaX, deltaY } = pendingUpdateRef.current

            // Update local positions for immediate visual feedback
            const newLocalPositions = new Map()
            initialPositionsRef.current.forEach((initialPos, id) => {
                newLocalPositions.set(id, {
                    x: initialPos.x + deltaX,
                    y: initialPos.y + deltaY
                })
            })
            setLocalPositions(newLocalPositions)
            localPositionsRef.current = newLocalPositions

            pendingUpdateRef.current = null
            rafRef.current = null
        }

        const handlePointerMove = (e) => {
            wasDragged.current = true

            // Get coordinates from mouse or touch event
            const coords = getEventCoordinates(e)

            const currentWorldPos = screenToWorld(coords.clientX, coords.clientY, offsetRef.current, zoomRef.current)
            const deltaX = currentWorldPos.x - dragStartPosition.x
            const deltaY = currentWorldPos.y - dragStartPosition.y

            pendingUpdateRef.current = { deltaX, deltaY }

            if (!rafRef.current) {
                rafRef.current = requestAnimationFrame(processDrag)
            }
        }

        const handlePointerUp = () => {
            // Cancel any pending RAF
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current)
                rafRef.current = null
            }

            // Check if any position actually changed (threshold: 1px)
            let hasChanged = false
            if (initialPositionsRef.current.size > 0 && localPositionsRef.current.size > 0) {
                initialPositionsRef.current.forEach((initialPos, id) => {
                    const newPos = localPositionsRef.current.get(id)
                    if (newPos) {
                        const deltaX = Math.abs(newPos.x - initialPos.x)
                        const deltaY = Math.abs(newPos.y - initialPos.y)
                        if (deltaX > 1 || deltaY > 1) {
                            hasChanged = true
                        }
                    }
                })
            }

            // Only update if position actually changed
            if (hasChanged) {
                // Call onDragEnd for command pattern (undo/redo support)
                if (onDragEnd) {
                    const blockIds = Array.from(initialPositionsRef.current.keys())
                    const oldPositions = Array.from(initialPositionsRef.current.values())
                    const newPositions = blockIds.map(id => localPositionsRef.current.get(id))

                    onDragEnd(blockIds, oldPositions, newPositions)
                }

                // Apply final positions to store using ref (to avoid stale closure)
                onUpdateMultiple(selectedIds, (element) => {
                    const localPos = localPositionsRef.current.get(element.id)
                    if (!localPos) return {}
                    return { x: localPos.x, y: localPos.y }
                })
            }

            setIsDragging(false)
            setDragStartPosition(null)
            // Don't clear localPositions immediately - wait for props to update
            // This prevents flickering when the store update is async
            setInitialPositions(new Map())
            initialPositionsRef.current = new Map()
            pendingUpdateRef.current = null

            setTimeout(() => {
                wasDragged.current = false
            }, 50)
        }

        window.addEventListener('mousemove', handlePointerMove)
        window.addEventListener('mouseup', handlePointerUp)
        window.addEventListener('touchmove', handlePointerMove, { passive: false })
        window.addEventListener('touchend', handlePointerUp)
        window.addEventListener('touchcancel', handlePointerUp)

        return () => {
            window.removeEventListener('mousemove', handlePointerMove)
            window.removeEventListener('mouseup', handlePointerUp)
            window.removeEventListener('touchmove', handlePointerMove)
            window.removeEventListener('touchend', handlePointerUp)
            window.removeEventListener('touchcancel', handlePointerUp)

            // Cleanup RAF on unmount
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current)
                rafRef.current = null
            }
        }
    }, [isDragging, dragStartPosition, selectedIds, onUpdateMultiple, zoomRef, offsetRef])

    // Clear local state when props update after drag
    // This prevents flickering by keeping local state until store updates
    useEffect(() => {
        if (!isDragging && localPositions.size > 0) {
            // Check if all elements have been updated to match local state
            let allPropsMatch = true
            localPositions.forEach((localPos, id) => {
                const element = elements.find(el => el.id === id)
                if (element) {
                    const propsMatch =
                        Math.abs(element.x - localPos.x) < 0.01 &&
                        Math.abs(element.y - localPos.y) < 0.01
                    if (!propsMatch) {
                        allPropsMatch = false
                    }
                }
            })

            if (allPropsMatch) {
                setLocalPositions(new Map())
                localPositionsRef.current = new Map()
            }
        }
    }, [isDragging, localPositions, elements])

    return {
        isDragging,
        wasDragged,
        handlePointerDown,
        // Legacy name for backward compatibility
        handleMouseDown: handlePointerDown,
        localPositions
    }
}

export default useMultipleDraggable
