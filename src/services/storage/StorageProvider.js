/**
 * Abstract Storage Provider
 * Base class for different storage implementations (IndexedDB, cloud, etc.)
 */
class StorageProvider {
    // Canvas data methods

    /**
     * Save blocks
     * @param {Array} blocks - Array of block elements
     * @returns {Promise<Object>} { success: boolean, error?: string }
     */
    async saveBlocks(blocks) {
        throw new Error('saveBlocks() must be implemented by subclass')
    }

    /**
     * Load blocks
     * @returns {Promise<Array|null>} Loaded blocks or null if not found
     */
    async loadBlocks() {
        throw new Error('loadBlocks() must be implemented by subclass')
    }

    /**
     * Save canvas state
     * @param {Object} state - Canvas state (offset, zoom)
     * @returns {Promise<Object>} { success: boolean, error?: string }
     */
    async saveCanvasState(state) {
        throw new Error('saveCanvasState() must be implemented by subclass')
    }

    /**
     * Load canvas state
     * @returns {Promise<Object|null>} Loaded canvas state or null if not found
     */
    async loadCanvasState() {
        throw new Error('loadCanvasState() must be implemented by subclass')
    }

    /**
     * Clear canvas data (blocks and canvas state)
     * @returns {Promise<Object>} { success: boolean, error?: string }
     */
    async clearCanvasData() {
        throw new Error('clearCanvasData() must be implemented by subclass')
    }

    /**
     * Check if there is saved canvas data
     * @returns {Promise<boolean>}
     */
    async hasCanvasData() {
        throw new Error('hasCanvasData() must be implemented by subclass')
    }

    // Images methods

    /**
     * Save image
     * @param {string} id - Image ID
     * @param {Blob} blob - Image blob
     * @returns {Promise<boolean>} Success status
     */
    async saveImage(id, blob) {
        throw new Error('saveImage() must be implemented by subclass')
    }

    /**
     * Load image
     * @param {string} id - Image ID
     * @returns {Promise<Blob|null>} Image blob or null if not found
     */
    async loadImage(id) {
        throw new Error('loadImage() must be implemented by subclass')
    }

    /**
     * Delete image
     * @param {string} id - Image ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteImage(id) {
        throw new Error('deleteImage() must be implemented by subclass')
    }

    /**
     * Get all image IDs
     * @returns {Promise<Array<string>>} Array of image IDs
     */
    async getAllImageIds() {
        throw new Error('getAllImageIds() must be implemented by subclass')
    }

    /**
     * Clone image
     * @param {string} sourceId - Source image ID
     * @param {string} targetId - Target image ID
     * @returns {Promise<boolean>} Success status
     */
    async cloneImage(sourceId, targetId) {
        throw new Error('cloneImage() must be implemented by subclass')
    }

    // Settings methods

    /**
     * Save a single setting
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     * @returns {Promise<boolean>} Success status
     */
    async saveSetting(key, value) {
        throw new Error('saveSetting() must be implemented by subclass')
    }

    /**
     * Load all settings as an object
     * @returns {Promise<Object>} Settings object
     */
    async loadAllSettings() {
        throw new Error('loadAllSettings() must be implemented by subclass')
    }

    // Statistics methods

    /**
     * Save daily statistics
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {Object} stats - Statistics object for the day
     * @returns {Promise<boolean>} Success status
     */
    async saveDailyStats(date, stats) {
        throw new Error('saveDailyStats() must be implemented by subclass')
    }

    /**
     * Load all statistics as an object with dates as keys
     * @returns {Promise<Object>} Statistics object with dates as keys
     */
    async loadAllStatistics() {
        throw new Error('loadAllStatistics() must be implemented by subclass')
    }

    /**
     * Load statistics for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<Object|null>} Statistics object or null if not found
     */
    async loadDailyStats(date) {
        throw new Error('loadDailyStats() must be implemented by subclass')
    }

    /**
     * Delete statistics for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<boolean>} Success status
     */
    async deleteDailyStats(date) {
        throw new Error('deleteDailyStats() must be implemented by subclass')
    }

    // Chat history methods

    /**
     * Get chat history for a block
     * @param {string} blockId - Block ID
     * @returns {Promise<Array>} Array of messages
     */
    async getBlockChatHistory(blockId) {
        throw new Error('getBlockChatHistory() must be implemented by subclass')
    }

    /**
     * Save chat history for a block
     * @param {string} blockId - Block ID
     * @param {Array} messages - Array of messages
     * @returns {Promise<boolean>} Success status
     */
    async saveBlockChatHistory(blockId, messages) {
        throw new Error('saveBlockChatHistory() must be implemented by subclass')
    }

    /**
     * Clear chat history for a block
     * @param {string} blockId - Block ID
     * @returns {Promise<boolean>} Success status
     */
    async clearBlockChatHistory(blockId) {
        throw new Error('clearBlockChatHistory() must be implemented by subclass')
    }

    /**
     * Check if block has chat history
     * @param {string} blockId - Block ID
     * @returns {Promise<boolean>} True if has history
     */
    async hasBlockChatHistory(blockId) {
        throw new Error('hasBlockChatHistory() must be implemented by subclass')
    }

    /**
     * Get all image IDs from all chat histories
     * @returns {Promise<Array<string>>} Array of image IDs
     */
    async getAllChatHistoryImageIds() {
        throw new Error('getAllChatHistoryImageIds() must be implemented by subclass')
    }

    // Meta methods

    /**
     * Save meta value
     * @param {string} key - Meta key
     * @param {any} value - Value to save
     * @returns {Promise<boolean>} Success status
     */
    async saveMeta(key, value) {
        throw new Error('saveMeta() must be implemented by subclass')
    }

    /**
     * Load meta value
     * @param {string} key - Meta key
     * @returns {Promise<any|null>} Meta value or null if not found
     */
    async loadMeta(key) {
        throw new Error('loadMeta() must be implemented by subclass')
    }
}

export default StorageProvider
