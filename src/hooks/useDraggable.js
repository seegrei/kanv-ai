import { useState, useEffect, useRef } from 'react'
import { screenToWorld } from '../utils/canvas/coordinateUtils'
import { getEventCoordinates, isTouchEvent } from '../utils/touch/touchUtils'

/**
 * Hook for handling single element dragging
 * Uses RAF throttling and local state for optimal performance
 * Supports both mouse and touch events
 */
const useDraggable = ({
    id,
    x,
    y,
    isSelected,
    zoomRef,
    offsetRef,
    onUpdate,
    onMouseDown,
    onDragEnd
}) => {
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [localPosition, setLocalPosition] = useState(null)
    const localPositionRef = useRef(null)
    const wasDragged = useRef(false)
    const rafRef = useRef(null)
    const pendingUpdateRef = useRef(null)
    const initialPositionRef = useRef(null)

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

        // Always call onMouseDown to update selection
        onMouseDown(e, id)
        e.preventDefault()

        setIsDragging(true)
        wasDragged.current = false

        // Get coordinates from mouse or touch event
        const coords = getEventCoordinates(e)

        // Use coordinateUtils for transformation
        const mouseWorldPos = screenToWorld(coords.clientX, coords.clientY, offsetRef.current, zoomRef.current)

        setDragOffset({
            x: mouseWorldPos.x - x,
            y: mouseWorldPos.y - y
        })

        const initialPosition = { x, y }
        setLocalPosition(initialPosition)
        localPositionRef.current = initialPosition
        initialPositionRef.current = initialPosition
    }

    useEffect(() => {
        if (!isDragging) return

        const processDrag = () => {
            if (!pendingUpdateRef.current) return

            const { newX, newY } = pendingUpdateRef.current

            // Update local position for immediate visual feedback
            const newPosition = { x: newX, y: newY }
            setLocalPosition(newPosition)
            localPositionRef.current = newPosition

            pendingUpdateRef.current = null
            rafRef.current = null
        }

        const handlePointerMove = (e) => {
            wasDragged.current = true

            // Get coordinates from mouse or touch event
            const coords = getEventCoordinates(e)

            // Use coordinateUtils for transformation
            const mouseWorldPos = screenToWorld(coords.clientX, coords.clientY, offsetRef.current, zoomRef.current)

            const newX = mouseWorldPos.x - dragOffset.x
            const newY = mouseWorldPos.y - dragOffset.y

            pendingUpdateRef.current = { newX, newY }

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

            // Apply final position to store using ref (to avoid stale closure)
            if (localPositionRef.current && initialPositionRef.current) {
                // Check if position actually changed (threshold: 1px)
                const deltaX = Math.abs(localPositionRef.current.x - initialPositionRef.current.x)
                const deltaY = Math.abs(localPositionRef.current.y - initialPositionRef.current.y)
                const hasChanged = deltaX > 1 || deltaY > 1

                if (hasChanged) {
                    if (onDragEnd) {
                        // Call onDragEnd with old and new positions for command creation
                        onDragEnd(id, initialPositionRef.current, localPositionRef.current)
                    } else {
                        // Fallback to onUpdate
                        onUpdate(id, { x: localPositionRef.current.x, y: localPositionRef.current.y })
                    }
                }
            }

            setIsDragging(false)
            // Don't clear localPosition immediately - wait for props to update
            // This prevents flickering when the store update is async
            pendingUpdateRef.current = null
            initialPositionRef.current = null

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
    }, [isDragging, dragOffset, id, onUpdate, onDragEnd, zoomRef, offsetRef])

    // Clear local state when props update after drag
    // This prevents flickering by keeping local state until store updates
    useEffect(() => {
        if (!isDragging && localPosition) {
            // Check if props have been updated to match local state
            const propsMatch =
                Math.abs(x - localPosition.x) < 0.01 &&
                Math.abs(y - localPosition.y) < 0.01

            if (propsMatch) {
                setLocalPosition(null)
                localPositionRef.current = null
            }
        }
    }, [isDragging, localPosition, x, y])

    return {
        isDragging,
        wasDragged,
        handlePointerDown,
        // Legacy name for backward compatibility
        handleMouseDown: handlePointerDown,
        localPosition
    }
}

export default useDraggable
