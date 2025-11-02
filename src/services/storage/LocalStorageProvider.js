import StorageProvider from './StorageProvider'
import { createLogger } from '../../utils/logger'
import { STORAGE } from '../../constants'

const logger = createLogger('LocalStorageProvider')

const STORAGE_KEY = STORAGE.KEYS.CANVAS_DATA

/**
 * Local Storage Provider
 * Implements storage using browser's localStorage
 */
class LocalStorageProvider extends StorageProvider {
    /**
     * Save canvas data to local storage
     * @param {Object} data - Canvas data to save
     * @returns {Promise<Object>} { success: boolean, error?: string }
     */
    async save(data) {
        try {
            const savedData = {
                elements: data.elements || [],
                canvasState: data.canvasState || {},
                timestamp: data.timestamp || Date.now(),
                version: data.version || '1.0'
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData))
            return { success: true }
        } catch (error) {
            // Handle quota exceeded error specifically
            if (error.name === 'QuotaExceededError' || error.code === 22) {
                const errorMsg = 'Storage quota exceeded! Your browser storage is full. Please free up space or use fewer/smaller images.'
                logger.error(errorMsg)
                // Show browser alert to ensure user sees the error
                if (typeof window !== 'undefined') {
                    window.alert(errorMsg)
                }
                return { success: false, error: errorMsg, quotaExceeded: true }
            }

            logger.error('Failed to save data:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Load canvas data from local storage
     * @returns {Promise<Object|null>} Loaded canvas data or null if not found
     */
    async load() {
        try {
            const savedData = localStorage.getItem(STORAGE_KEY)

            if (!savedData) {
                return null
            }

            const data = JSON.parse(savedData)

            // Validate data structure
            if (!data.elements || !Array.isArray(data.elements)) {
                logger.warn('Invalid data structure in storage')
                return null
            }

            return {
                elements: data.elements,
                canvasState: data.canvasState || {},
                timestamp: data.timestamp,
                version: data.version
            }
        } catch (error) {
            logger.error('Failed to load data:', error)
            return null
        }
    }

    /**
     * Clear all saved data
     * @returns {Promise<Object>} { success: boolean, error?: string }
     */
    async clear() {
        try {
            localStorage.removeItem(STORAGE_KEY)
            return { success: true }
        } catch (error) {
            logger.error('Failed to clear data:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Check if there is saved data
     * @returns {Promise<boolean>}
     */
    async hasSavedData() {
        return localStorage.getItem(STORAGE_KEY) !== null
    }
}

export default LocalStorageProvider
