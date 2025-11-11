// Utility functions for unified touch and mouse event handling

/**
 * Get coordinates from mouse or touch event
 */
export const getEventCoordinates = (e) => {
    if (e.touches && e.touches.length > 0) {
        return {
            clientX: e.touches[0].clientX,
            clientY: e.touches[0].clientY
        };
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
        return {
            clientX: e.changedTouches[0].clientX,
            clientY: e.changedTouches[0].clientY
        };
    }
    return {
        clientX: e.clientX,
        clientY: e.clientY
    };
};

/**
 * Get all touch points from a touch event
 */
export const getTouchPoints = (e) => {
    if (!e.touches || e.touches.length === 0) {
        return [];
    }
    return Array.from(e.touches).map(touch => ({
        id: touch.identifier,
        clientX: touch.clientX,
        clientY: touch.clientY
    }));
};

/**
 * Calculate distance between two points
 */
export const getDistance = (point1, point2) => {
    const dx = point2.clientX - point1.clientX;
    const dy = point2.clientY - point1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculate center point between two touch points
 */
export const getCenterPoint = (point1, point2) => {
    return {
        clientX: (point1.clientX + point2.clientX) / 2,
        clientY: (point1.clientY + point2.clientY) / 2
    };
};

/**
 * Check if event is a touch event
 */
export const isTouchEvent = (e) => {
    return e.type.startsWith('touch');
};

/**
 * Get touch identifier from event (for multi-touch tracking)
 */
export const getTouchIdentifier = (e) => {
    if (e.touches && e.touches.length > 0) {
        return e.touches[0].identifier;
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
        return e.changedTouches[0].identifier;
    }
    return null;
};

/**
 * Normalize event to have consistent interface for both mouse and touch
 */
export const normalizeEvent = (e) => {
    const coords = getEventCoordinates(e);
    const isTouch = isTouchEvent(e);
    const touchId = isTouch ? getTouchIdentifier(e) : null;
    const touchCount = e.touches ? e.touches.length : 0;

    return {
        ...coords,
        isTouch,
        touchId,
        touchCount,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation()
    };
};

/**
 * Calculate pinch scale from two touch points
 */
export const getPinchScale = (currentTouches, initialDistance) => {
    if (currentTouches.length !== 2 || !initialDistance) {
        return 1;
    }
    const currentDistance = getDistance(currentTouches[0], currentTouches[1]);
    return currentDistance / initialDistance;
};

/**
 * Check if touch moved beyond threshold (to distinguish tap from drag)
 */
export const hasTouchMovedBeyondThreshold = (startPoint, currentPoint, threshold = 10) => {
    const distance = getDistance(startPoint, currentPoint);
    return distance > threshold;
};
