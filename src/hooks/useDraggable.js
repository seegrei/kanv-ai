import { useState, useEffect, useRef } from 'react'
import { screenToWorld } from '../utils/coordinateUtils'

/**
 * Hook for handling single element dragging
 * Uses RAF throttling and local state for optimal performance
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

    const handleMouseDown = (e, clickedId) => {
        // Only handle left mouse button
        if (e.button !== 0) return

        // Always call onMouseDown to update selection
        onMouseDown(e, id)
        e.preventDefault()

        setIsDragging(true)
        wasDragged.current = false

        // Use coordinateUtils for transformation
        const mouseWorldPos = screenToWorld(e.clientX, e.clientY, offsetRef.current, zoomRef.current)

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

        const handleMouseMove = (e) => {
            wasDragged.current = true

            // Use coordinateUtils for transformation
            const mouseWorldPos = screenToWorld(e.clientX, e.clientY, offsetRef.current, zoomRef.current)

            const newX = mouseWorldPos.x - dragOffset.x
            const newY = mouseWorldPos.y - dragOffset.y

            pendingUpdateRef.current = { newX, newY }

            if (!rafRef.current) {
                rafRef.current = requestAnimationFrame(processDrag)
            }
        }

        const handleMouseUp = () => {
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

        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)

        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)

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
        handleMouseDown,
        localPosition
    }
}

export default useDraggable
