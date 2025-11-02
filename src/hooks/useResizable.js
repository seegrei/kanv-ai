import { useState, useEffect, useRef, useMemo } from 'react'

const useResizable = ({
    id,
    x,
    y,
    width,
    height,
    minWidth,
    minHeight,
    zoomRef,
    offsetRef,
    onUpdate,
    onResizeEnd,
    maintainAspectRatio = false,
    aspectRatio = 1,
    padding = 0,
    horizontalOnly = false
}) => {
    const [isResizing, setIsResizing] = useState(false)
    const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, mouseX: 0, mouseY: 0, x: 0, y: 0 })
    const [localSize, setLocalSize] = useState(null)
    const [localPosition, setLocalPosition] = useState(null)
    const wasResized = useRef(false)
    const rafRef = useRef(null)
    const pendingUpdateRef = useRef(null)
    // Keep height ref updated for handleMouseUp (important for horizontalOnly with auto-height)
    const heightRef = useRef(height)

    useEffect(() => {
        heightRef.current = height
    }, [height])

    // Cache aspect ratio calculation function
    const calculateSize = useMemo(() => {
        // For horizontal-only resize (text blocks), only change width
        if (horizontalOnly) {
            return (deltaX, deltaY, startWidth, startHeight) => ({
                width: Math.max(minWidth, startWidth + deltaX),
                height: startHeight // Keep height unchanged
            })
        }

        if (!maintainAspectRatio) {
            return (deltaX, deltaY, startWidth, startHeight) => ({
                width: Math.max(minWidth, startWidth + deltaX),
                height: Math.max(minHeight, startHeight + deltaY)
            })
        }

        return (deltaX, deltaY, startWidth, startHeight) => {
            const delta = Math.max(deltaX, deltaY)
            let newBlockWidth = Math.max(minWidth, startWidth + delta)
            let imageWidth = newBlockWidth - padding * 2
            let imageHeight = imageWidth / aspectRatio
            let newBlockHeight = imageHeight + padding * 2

            if (newBlockHeight < minHeight) {
                newBlockHeight = minHeight
                imageHeight = newBlockHeight - padding * 2
                imageWidth = imageHeight * aspectRatio
                newBlockWidth = imageWidth + padding * 2
            }

            return { width: newBlockWidth, height: newBlockHeight }
        }
    }, [horizontalOnly, maintainAspectRatio, minWidth, minHeight, padding, aspectRatio])

    const handleResizeMouseDown = (corner) => (e) => {
        // Only handle left mouse button
        if (e.button !== 0) return

        e.stopPropagation()
        e.preventDefault()
        setIsResizing(corner)
        wasResized.current = false

        const mouseWorldX = (e.clientX - offsetRef.current.x) / zoomRef.current
        const mouseWorldY = (e.clientY - offsetRef.current.y) / zoomRef.current

        const initialWidth = width || minWidth
        const initialHeight = height || minHeight

        setResizeStart({
            width: initialWidth,
            height: initialHeight,
            mouseX: mouseWorldX,
            mouseY: mouseWorldY,
            x: x || 0,
            y: y || 0
        })

        setLocalSize({ width: initialWidth, height: initialHeight })
        setLocalPosition({ x: x || 0, y: y || 0 })
    }

    useEffect(() => {
        if (!isResizing) return

        const processResize = () => {
            if (!pendingUpdateRef.current) return

            const { mouseWorldX, mouseWorldY } = pendingUpdateRef.current
            const corner = isResizing

            let deltaX = mouseWorldX - resizeStart.mouseX
            let deltaY = mouseWorldY - resizeStart.mouseY

            // Handle side edges (width only, or width + height if aspect ratio must be maintained)
            if (corner === 'l') {
                let newWidth = Math.max(minWidth, resizeStart.width - deltaX)
                let newHeight = resizeStart.height

                if (maintainAspectRatio) {
                    const imageWidth = newWidth - padding * 2
                    const imageHeight = imageWidth / aspectRatio
                    newHeight = imageHeight + padding * 2

                    if (newHeight < minHeight) {
                        newHeight = minHeight
                        const adjustedImageHeight = newHeight - padding * 2
                        const adjustedImageWidth = adjustedImageHeight * aspectRatio
                        newWidth = adjustedImageWidth + padding * 2
                    }
                }

                const newSize = { width: newWidth, height: newHeight }
                const newX = resizeStart.x + (resizeStart.width - newWidth)
                const newY = maintainAspectRatio ? resizeStart.y + (resizeStart.height - newHeight) / 2 : resizeStart.y
                setLocalSize(newSize)
                setLocalPosition({ x: newX, y: newY })
                pendingUpdateRef.current = null
                rafRef.current = null
                return
            }

            if (corner === 'r') {
                let newWidth = Math.max(minWidth, resizeStart.width + deltaX)
                let newHeight = resizeStart.height

                if (maintainAspectRatio) {
                    const imageWidth = newWidth - padding * 2
                    const imageHeight = imageWidth / aspectRatio
                    newHeight = imageHeight + padding * 2

                    if (newHeight < minHeight) {
                        newHeight = minHeight
                        const adjustedImageHeight = newHeight - padding * 2
                        const adjustedImageWidth = adjustedImageHeight * aspectRatio
                        newWidth = adjustedImageWidth + padding * 2
                    }
                }

                const newSize = { width: newWidth, height: newHeight }
                const newY = maintainAspectRatio ? resizeStart.y + (resizeStart.height - newHeight) / 2 : resizeStart.y
                setLocalSize(newSize)
                setLocalPosition({ x: resizeStart.x, y: newY })
                pendingUpdateRef.current = null
                rafRef.current = null
                return
            }

            // Handle top/bottom edges (height only, or width + height if aspect ratio must be maintained)
            if (corner === 't') {
                let newHeight = Math.max(minHeight, resizeStart.height - deltaY)
                let newWidth = resizeStart.width

                if (maintainAspectRatio) {
                    const imageHeight = newHeight - padding * 2
                    const imageWidth = imageHeight * aspectRatio
                    newWidth = imageWidth + padding * 2

                    if (newWidth < minWidth) {
                        newWidth = minWidth
                        const adjustedImageWidth = newWidth - padding * 2
                        const adjustedImageHeight = adjustedImageWidth / aspectRatio
                        newHeight = adjustedImageHeight + padding * 2
                    }
                }

                const newSize = { width: newWidth, height: newHeight }
                const newY = resizeStart.y + (resizeStart.height - newHeight)
                const newX = maintainAspectRatio ? resizeStart.x + (resizeStart.width - newWidth) / 2 : resizeStart.x
                setLocalSize(newSize)
                setLocalPosition({ x: newX, y: newY })
                pendingUpdateRef.current = null
                rafRef.current = null
                return
            }

            if (corner === 'b') {
                let newHeight = Math.max(minHeight, resizeStart.height + deltaY)
                let newWidth = resizeStart.width

                if (maintainAspectRatio) {
                    const imageHeight = newHeight - padding * 2
                    const imageWidth = imageHeight * aspectRatio
                    newWidth = imageWidth + padding * 2

                    if (newWidth < minWidth) {
                        newWidth = minWidth
                        const adjustedImageWidth = newWidth - padding * 2
                        const adjustedImageHeight = adjustedImageWidth / aspectRatio
                        newHeight = adjustedImageHeight + padding * 2
                    }
                }

                const newSize = { width: newWidth, height: newHeight }
                const newX = maintainAspectRatio ? resizeStart.x + (resizeStart.width - newWidth) / 2 : resizeStart.x
                setLocalSize(newSize)
                setLocalPosition({ x: newX, y: newY })
                pendingUpdateRef.current = null
                rafRef.current = null
                return
            }

            // Invert deltas for top and left corners
            if (corner === 'tl' || corner === 'bl') {
                deltaX = -deltaX
            }
            if (corner === 'tl' || corner === 'tr') {
                deltaY = -deltaY
            }

            // Use cached calculation function
            const newSize = calculateSize(deltaX, deltaY, resizeStart.width, resizeStart.height)

            // Calculate new position based on corner
            let newX = resizeStart.x
            let newY = resizeStart.y

            if (corner === 'tl') {
                newX = resizeStart.x + (resizeStart.width - newSize.width)
                // For horizontal-only, don't change Y position
                if (!horizontalOnly) {
                    newY = resizeStart.y + (resizeStart.height - newSize.height)
                }
            } else if (corner === 'tr') {
                // For horizontal-only, don't change Y position
                if (!horizontalOnly) {
                    newY = resizeStart.y + (resizeStart.height - newSize.height)
                }
            } else if (corner === 'bl') {
                newX = resizeStart.x + (resizeStart.width - newSize.width)
            }
            // br corner doesn't change position

            // Update local size and position for immediate visual feedback
            setLocalSize(newSize)
            setLocalPosition({ x: newX, y: newY })

            pendingUpdateRef.current = null
            rafRef.current = null
        }

        const handleMouseMove = (e) => {
            wasResized.current = true

            const mouseWorldX = (e.clientX - offsetRef.current.x) / zoomRef.current
            const mouseWorldY = (e.clientY - offsetRef.current.y) / zoomRef.current

            pendingUpdateRef.current = { mouseWorldX, mouseWorldY }

            if (!rafRef.current) {
                rafRef.current = requestAnimationFrame(processResize)
            }
        }

        const handleMouseUp = () => {
            // Cancel any pending RAF
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current)
                rafRef.current = null
            }

            // Apply final size and position to store
            if (localSize && localPosition) {
                // Check if size or position actually changed (threshold: 1px)
                const deltaX = Math.abs(localPosition.x - resizeStart.x)
                const deltaY = Math.abs(localPosition.y - resizeStart.y)
                const deltaWidth = Math.abs(localSize.width - resizeStart.width)
                const deltaHeight = Math.abs(localSize.height - resizeStart.height)
                const hasChanged = deltaX > 1 || deltaY > 1 || deltaWidth > 1 || deltaHeight > 1

                if (hasChanged) {
                    if (onResizeEnd) {
                        // Call onResizeEnd with old and new bounds for command creation
                        const oldBounds = {
                            x: resizeStart.x,
                            y: resizeStart.y,
                            width: resizeStart.width,
                            height: resizeStart.height
                        };
                        const newBounds = {
                            x: localPosition.x,
                            y: localPosition.y,
                            width: localSize.width,
                            // For horizontalOnly, use current height from props (auto-calculated)
                            height: horizontalOnly ? heightRef.current : localSize.height
                        };
                        onResizeEnd(id, oldBounds, newBounds);
                    } else {
                        // Fallback to onUpdate
                        const updates = {
                            width: localSize.width,
                            x: localPosition.x,
                            y: localPosition.y
                        };
                        // Only update height if not horizontalOnly (for horizontalOnly, height is auto-calculated)
                        if (!horizontalOnly) {
                            updates.height = localSize.height;
                        }
                        onUpdate(id, updates);
                    }
                }
            }

            setIsResizing(false)
            // Don't clear localSize/localPosition immediately to prevent flickering
            // They will be cleared when props update (see useEffect below)
            pendingUpdateRef.current = null

            setTimeout(() => {
                wasResized.current = false
            }, 0)
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
    }, [isResizing, resizeStart, zoomRef, offsetRef, id, onUpdate, onResizeEnd, localSize, localPosition, calculateSize])

    // Clear local state when props update after resize
    // This prevents flickering by keeping local state until store updates
    useEffect(() => {
        if (!isResizing && localSize && localPosition) {
            // Check if props have been updated to match local state
            // For horizontalOnly, ignore height check since it's auto-calculated
            const widthMatch = Math.abs((width || minWidth) - localSize.width) < 0.01;
            const heightMatch = horizontalOnly ? true : Math.abs((height || minHeight) - localSize.height) < 0.01;
            const xMatch = Math.abs((x || 0) - localPosition.x) < 0.01;
            const yMatch = Math.abs((y || 0) - localPosition.y) < 0.01;

            const propsMatch = widthMatch && heightMatch && xMatch && yMatch;

            if (propsMatch) {
                // Props have been updated, safe to clear local state
                setLocalSize(null)
                setLocalPosition(null)
            }
        }
    }, [width, height, x, y, localSize, localPosition, isResizing, minWidth, minHeight, horizontalOnly])

    return {
        isResizing,
        wasResized,
        handleResizeMouseDown,
        localSize,
        localPosition
    }
}

export default useResizable
