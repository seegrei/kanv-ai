// Coordinate transformation utilities for canvas

/**
 * Convert screen coordinates to world coordinates
 * @param {number} screenX - X coordinate in screen space
 * @param {number} screenY - Y coordinate in screen space
 * @param {{x: number, y: number}} offset - Canvas offset
 * @param {number} zoom - Canvas zoom level
 * @returns {{x: number, y: number}} World coordinates
 */
export const screenToWorld = (screenX, screenY, offset, zoom) => {
    return {
        x: (screenX - offset.x) / zoom,
        y: (screenY - offset.y) / zoom
    }
}

/**
 * Convert world coordinates to screen coordinates
 * @param {number} worldX - X coordinate in world space
 * @param {number} worldY - Y coordinate in world space
 * @param {{x: number, y: number}} offset - Canvas offset
 * @param {number} zoom - Canvas zoom level
 * @returns {{x: number, y: number}} Screen coordinates
 */
export const worldToScreen = (worldX, worldY, offset, zoom) => {
    return {
        x: worldX * zoom + offset.x,
        y: worldY * zoom + offset.y
    }
}
