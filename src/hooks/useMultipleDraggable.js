import { useState, useEffect, useRef } from 'react'
import { screenToWorld } from '../utils/coordinateUtils'

/**
 * Hook for handling multiple elements dragging
 * Uses RAF throttling and local state for optimal performance
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
     * @param {MouseEvent} e - Mouse event
     * @param {string|number} clickedId - ID of the element that was clicked
     */
    const handleMouseDown = (e, clickedId) => {
        // Only handle left mouse button
        if (e.button !== 0) return

        // Call the parent onMouseDown to ensure selection is maintained
        if (onMouseDown) {
            onMouseDown(e, clickedId)
        }

        e.preventDefault()
        setIsDragging(true)
        wasDragged.current = false

        // Store initial world position
        const worldPos = screenToWorld(e.clientX, e.clientY, offsetRef.current, zoomRef.current)
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

        const handleMouseMove = (e) => {
            wasDragged.current = true

            const currentWorldPos = screenToWorld(e.clientX, e.clientY, offsetRef.current, zoomRef.current)
            const deltaX = currentWorldPos.x - dragStartPosition.x
            const deltaY = currentWorldPos.y - dragStartPosition.y

            pendingUpdateRef.current = { deltaX, deltaY }

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
        handleMouseDown,
        localPositions
    }
}

export default useMultipleDraggable
