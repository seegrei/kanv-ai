import { useState, useEffect, useMemo } from 'react'
import { CANVAS, ELEMENT } from '../../../constants'

const CanvasBackground = ({ zoomRef, offsetRef, elements }) => {
    const { DOT_SIZE, DOT_COLOR, GRID_SPACING } = CANVAS.BACKGROUND

    // Use state to trigger re-renders when zoom or offset changes
    const [zoom, setZoom] = useState(zoomRef.current)
    const [offset, setOffset] = useState(offsetRef.current)

    // Update state when refs change using RAF for smooth updates
    useEffect(() => {
        let rafId = null
        let prevZoom = zoomRef.current
        let prevOffset = { ...offsetRef.current }

        const checkAndUpdate = () => {
            const currentZoom = zoomRef.current
            const currentOffset = offsetRef.current

            // Update if zoom or offset changed
            if (currentZoom !== prevZoom ||
                currentOffset.x !== prevOffset.x ||
                currentOffset.y !== prevOffset.y) {
                setZoom(currentZoom)
                setOffset({ ...currentOffset })
                prevZoom = currentZoom
                prevOffset = { ...currentOffset }
            }

            rafId = requestAnimationFrame(checkAndUpdate)
        }

        rafId = requestAnimationFrame(checkAndUpdate)

        return () => {
            if (rafId) {
                cancelAnimationFrame(rafId)
            }
        }
    }, [zoomRef, offsetRef])

    // Calculate bounding box of all elements and viewport
    const bounds = useMemo(() => {
        const viewportWidth = window.innerWidth / zoom
        const viewportHeight = window.innerHeight / zoom
        const viewportMinX = -offset.x / zoom
        const viewportMinY = -offset.y / zoom
        const viewportMaxX = viewportMinX + viewportWidth
        const viewportMaxY = viewportMinY + viewportHeight

        if (!elements || elements.length === 0) {
            const padding = 2000
            return {
                minX: viewportMinX - padding,
                minY: viewportMinY - padding,
                maxX: viewportMaxX + padding,
                maxY: viewportMaxY + padding
            }
        }

        let minX = viewportMinX
        let minY = viewportMinY
        let maxX = viewportMaxX
        let maxY = viewportMaxY

        elements.forEach(element => {
            const width = element.width || (element.type === 'image' ? ELEMENT.IMAGE.DEFAULT_WIDTH : ELEMENT.TEXT_BLOCK.DEFAULT_WIDTH)
            const height = element.height || (element.type === 'image' ? ELEMENT.IMAGE.DEFAULT_HEIGHT : ELEMENT.TEXT_BLOCK.DEFAULT_HEIGHT)

            minX = Math.min(minX, element.x)
            minY = Math.min(minY, element.y)
            maxX = Math.max(maxX, element.x + width)
            maxY = Math.max(maxY, element.y + height)
        })

        const padding = 2000
        return {
            minX: minX - padding,
            minY: minY - padding,
            maxX: maxX + padding,
            maxY: maxY + padding
        }
    }, [elements, zoom, offset])

    const spacing = GRID_SPACING * zoom
    const size = DOT_SIZE * Math.max(0.5, zoom)

    // Calculate dimensions in world coordinates
    const width = bounds.maxX - bounds.minX
    const height = bounds.maxY - bounds.minY

    // Convert to screen coordinates
    const screenX = bounds.minX * zoom + offset.x
    const screenY = bounds.minY * zoom + offset.y
    const screenWidth = width * zoom
    const screenHeight = height * zoom

    // Calculate pattern offset to align dots with world grid
    // Pattern should be aligned so dots are at multiples of GRID_SPACING in world space
    const worldGridOffset = GRID_SPACING * zoom
    const patternOffsetX = ((-bounds.minX * zoom) % worldGridOffset + worldGridOffset) % worldGridOffset
    const patternOffsetY = ((-bounds.minY * zoom) % worldGridOffset + worldGridOffset) % worldGridOffset

    return (
        <svg
            style={{
                position: 'absolute',
                top: `${screenY}px`,
                left: `${screenX}px`,
                width: `${screenWidth}px`,
                height: `${screenHeight}px`,
                pointerEvents: 'auto',
                zIndex: 'var(--z-background)'
            }}
        >
            <defs>
                <pattern
                    id='dot-pattern'
                    x={patternOffsetX}
                    y={patternOffsetY}
                    width={spacing}
                    height={spacing}
                    patternUnits='userSpaceOnUse'
                >
                    <circle
                        cx={spacing / 2}
                        cy={spacing / 2}
                        r={size}
                        fill={DOT_COLOR}
                    />
                </pattern>
            </defs>
            <rect
                width='100%'
                height='100%'
                fill='url(#dot-pattern)'
            />
        </svg>
    )
}

export default CanvasBackground
