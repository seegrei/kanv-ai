/**
 * Abstract Storage Provider
 * Base class for different storage implementations (local, cloud, etc.)
 */
class StorageProvider {
    /**
     * Save canvas data
     * @param {Object} data - Data to save
     * @param {Array} data.elements - Array of block elements
     * @param {Object} data.canvasState - Canvas state (offset, zoom)
     * @param {number} data.timestamp - Timestamp
     * @param {string} data.version - Data version
     * @returns {Promise<Object>} { success: boolean, error?: string }
     */
    async save(data) {
        throw new Error('save() must be implemented by subclass')
    }

    /**
     * Load canvas data
     * @returns {Promise<Object|null>} Loaded data or null if not found
     */
    async load() {
        throw new Error('load() must be implemented by subclass')
    }

    /**
     * Clear all saved data
     * @returns {Promise<Object>} { success: boolean, error?: string }
     */
    async clear() {
        throw new Error('clear() must be implemented by subclass')
    }

    /**
     * Check if there is saved data
     * @returns {Promise<boolean>}
     */
    async hasSavedData() {
        throw new Error('hasSavedData() must be implemented by subclass')
    }
}

export default StorageProvider
