// Intersection detection utilities

/**
 * Check if a point is inside a rectangle
 * @param {{x: number, y: number}} point - Point coordinates
 * @param {{x: number, y: number, width: number, height: number}} rect - Rectangle bounds
 * @returns {boolean} True if point is inside rectangle
 */
export const isPointInRect = (point, rect) => {
    return (
        point.x >= rect.x &&
        point.x <= rect.x + rect.width &&
        point.y >= rect.y &&
        point.y <= rect.y + rect.height
    )
}

/**
 * Check if two rectangles intersect
 * @param {{x: number, y: number, width: number, height: number}} rect1 - First rectangle
 * @param {{x: number, y: number, width: number, height: number}} rect2 - Second rectangle
 * @returns {boolean} True if rectangles intersect
 */
export const isRectIntersecting = (rect1, rect2) => {
    const rect1Right = rect1.x + rect1.width
    const rect1Bottom = rect1.y + rect1.height
    const rect2Right = rect2.x + rect2.width
    const rect2Bottom = rect2.y + rect2.height

    return (
        rect1.x < rect2Right &&
        rect1Right > rect2.x &&
        rect1.y < rect2Bottom &&
        rect1Bottom > rect2.y
    )
}

/**
 * Find all elements that intersect with given bounds
 * @param {{minX: number, maxX: number, minY: number, maxY: number}} bounds - Bounds to check intersection with
 * @param {Array} elements - Array of elements to check
 * @param {Function} getElementSize - Optional function to get element size (element) => {width, height}
 * @returns {Array} Array of intersecting elements
 */
export const findIntersectingElements = (bounds, elements, getElementSize = null) => {
    return elements.filter(element => {
        let elementWidth = element.width
        let elementHeight = element.height

        if (getElementSize) {
            const size = getElementSize(element)
            elementWidth = size.width
            elementHeight = size.height
        }

        const elementRight = element.x + elementWidth
        const elementBottom = element.y + elementHeight

        return (
            element.x < bounds.maxX &&
            elementRight > bounds.minX &&
            element.y < bounds.maxY &&
            elementBottom > bounds.minY
        )
    })
}
