// Detection utilities for touch capabilities

/**
 * Check if the browser/device supports touch events
 */
export const isTouchDevice = () => {
    return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
    );
};

/**
 * Check if the current event is from a touch device
 */
export const isTouchInteraction = (e) => {
    return e && e.type && e.type.startsWith('touch');
};

/**
 * Check if device is likely a mobile device based on screen size
 */
export const isMobileDevice = () => {
    return window.innerWidth <= 768 || window.innerHeight <= 768;
};

/**
 * Get device type
 */
export const getDeviceType = () => {
    const width = window.innerWidth;

    if (width <= 480) {
        return 'mobile';
    }
    if (width <= 768) {
        return 'tablet';
    }
    return 'desktop';
};
