import StorageProvider from './StorageProvider'
import { createLogger } from '../../utils/logger'
import { STORAGE } from '../../constants'

const logger = createLogger('IndexedDBProvider')

/**
 * IndexedDB Storage Provider
 * Implements storage using browser's IndexedDB
 * More efficient than localStorage for binary data and larger datasets
 */
class IndexedDBProvider extends StorageProvider {
    constructor() {
        super()
        this.dbName = STORAGE.INDEXED_DB.DB_NAME
        this.dbVersion = STORAGE.INDEXED_DB.DB_VERSION
        this.stores = STORAGE.INDEXED_DB.STORES
        this.db = null
        this.initPromise = null
    }

    /**
     * Initialize IndexedDB
     * Creates database and object stores if they don't exist
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        // Return existing init promise if already initializing
        if (this.initPromise) {
            return this.initPromise
        }

        // Return existing db if already initialized
        if (this.db) {
            return Promise.resolve(this.db)
        }

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion)

            request.onerror = () => {
                const error = new Error('Failed to open IndexedDB')
                logger.error(error.message, request.error)
                reject(error)
            }

            request.onsuccess = (event) => {
                this.db = event.target.result
                logger.info('IndexedDB initialized successfully')
                resolve(this.db)
            }

            request.onupgradeneeded = (event) => {
                const db = event.target.result

                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains(this.stores.BLOCKS)) {
                    db.createObjectStore(this.stores.BLOCKS)
                }
                if (!db.objectStoreNames.contains(this.stores.CANVAS_STATE)) {
                    db.createObjectStore(this.stores.CANVAS_STATE)
                }
                if (!db.objectStoreNames.contains(this.stores.IMAGES)) {
                    db.createObjectStore(this.stores.IMAGES)
                }
                if (!db.objectStoreNames.contains(this.stores.SETTINGS)) {
                    db.createObjectStore(this.stores.SETTINGS)
                }
                if (!db.objectStoreNames.contains(this.stores.STATISTICS)) {
                    db.createObjectStore(this.stores.STATISTICS)
                }
                if (!db.objectStoreNames.contains(this.stores.META)) {
                    db.createObjectStore(this.stores.META)
                }

                logger.info('IndexedDB object stores created')
            }
        })

        return this.initPromise
    }

    // Canvas data methods

    /**
     * Save blocks
     * @param {Array} blocks - Array of block elements
     * @returns {Promise<Object>} { success: boolean, error?: string }
     */
    async saveBlocks(blocks) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.BLOCKS], 'readwrite')
                const store = transaction.objectStore(this.stores.BLOCKS)

                // Get all existing block IDs
                const getAllKeysRequest = store.getAllKeys()

                getAllKeysRequest.onsuccess = () => {
                    const existingIds = getAllKeysRequest.result
                    const newIds = blocks.map(block => block.id)

                    // Delete blocks that are no longer in the list
                    const idsToDelete = existingIds.filter(id => !newIds.includes(id))
                    idsToDelete.forEach(id => store.delete(id))

                    // Save each block separately using block.id as key
                    if (blocks.length === 0) {
                        resolve({ success: true })
                        return
                    }

                    let completed = 0
                    let hasError = false

                    blocks.forEach(block => {
                        const request = store.put(block, block.id)

                        request.onsuccess = () => {
                            completed++
                            if (completed === blocks.length && !hasError) {
                                resolve({ success: true })
                            }
                        }

                        request.onerror = () => {
                            if (!hasError) {
                                hasError = true
                                reject(new Error('Failed to save blocks'))
                            }
                        }
                    })
                }

                getAllKeysRequest.onerror = () => {
                    reject(new Error('Failed to get existing blocks'))
                }
            })
        } catch (error) {
            logger.error('Error saving blocks:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Load blocks
     * @returns {Promise<Array|null>} Loaded blocks or null if not found
     */
    async loadBlocks() {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.BLOCKS], 'readonly')
                const store = transaction.objectStore(this.stores.BLOCKS)
                const request = store.getAll()

                request.onsuccess = (event) => {
                    const blocks = event.target.result
                    resolve(blocks && blocks.length > 0 ? blocks : null)
                }

                request.onerror = () => reject(new Error('Failed to load blocks'))
            })
        } catch (error) {
            logger.error('Error loading blocks:', error)
            return null
        }
    }

    /**
     * Save canvas state
     * @param {Object} state - Canvas state (offset, zoom)
     * @returns {Promise<Object>} { success: boolean, error?: string }
     */
    async saveCanvasState(state) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.CANVAS_STATE], 'readwrite')
                const store = transaction.objectStore(this.stores.CANVAS_STATE)

                // Save offset and zoom separately
                const saveOffset = store.put(state.offset, 'offset')
                const saveZoom = store.put(state.zoom, 'zoom')

                let offsetSaved = false
                let zoomSaved = false

                saveOffset.onsuccess = () => {
                    offsetSaved = true
                    if (zoomSaved) resolve({ success: true })
                }

                saveZoom.onsuccess = () => {
                    zoomSaved = true
                    if (offsetSaved) resolve({ success: true })
                }

                saveOffset.onerror = saveZoom.onerror = () => {
                    reject(new Error('Failed to save canvas state'))
                }
            })
        } catch (error) {
            logger.error('Error saving canvas state:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Load canvas state
     * @returns {Promise<Object|null>} Loaded canvas state or null if not found
     */
    async loadCanvasState() {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.CANVAS_STATE], 'readonly')
                const store = transaction.objectStore(this.stores.CANVAS_STATE)

                // Load offset and zoom separately
                const getOffset = store.get('offset')
                const getZoom = store.get('zoom')

                let offset = null
                let zoom = null
                let offsetLoaded = false
                let zoomLoaded = false

                getOffset.onsuccess = (event) => {
                    offset = event.target.result
                    offsetLoaded = true
                    if (zoomLoaded) {
                        // Return null if neither offset nor zoom exists
                        if (offset == null && zoom == null) {
                            resolve(null)
                        } else {
                            resolve({ offset, zoom })
                        }
                    }
                }

                getZoom.onsuccess = (event) => {
                    zoom = event.target.result
                    zoomLoaded = true
                    if (offsetLoaded) {
                        // Return null if neither offset nor zoom exists
                        if (offset == null && zoom == null) {
                            resolve(null)
                        } else {
                            resolve({ offset, zoom })
                        }
                    }
                }

                getOffset.onerror = getZoom.onerror = () => {
                    reject(new Error('Failed to load canvas state'))
                }
            })
        } catch (error) {
            logger.error('Error loading canvas state:', error)
            return null
        }
    }

    /**
     * Clear canvas data (blocks and canvas state)
     * @returns {Promise<Object>} { success: boolean, error?: string }
     */
    async clearCanvasData() {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.BLOCKS, this.stores.CANVAS_STATE], 'readwrite')
                const blocksStore = transaction.objectStore(this.stores.BLOCKS)
                const stateStore = transaction.objectStore(this.stores.CANVAS_STATE)

                const clearBlocks = blocksStore.clear()
                const clearOffset = stateStore.delete('offset')
                const clearZoom = stateStore.delete('zoom')

                let blocksCleared = false
                let offsetCleared = false
                let zoomCleared = false

                clearBlocks.onsuccess = () => {
                    blocksCleared = true
                    if (offsetCleared && zoomCleared) resolve({ success: true })
                }

                clearOffset.onsuccess = () => {
                    offsetCleared = true
                    if (blocksCleared && zoomCleared) resolve({ success: true })
                }

                clearZoom.onsuccess = () => {
                    zoomCleared = true
                    if (blocksCleared && offsetCleared) resolve({ success: true })
                }

                clearBlocks.onerror = clearOffset.onerror = clearZoom.onerror = () => {
                    reject(new Error('Failed to clear canvas data'))
                }
            })
        } catch (error) {
            logger.error('Error clearing canvas data:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Check if there is saved canvas data
     * @returns {Promise<boolean>}
     */
    async hasCanvasData() {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.BLOCKS], 'readonly')
                const store = transaction.objectStore(this.stores.BLOCKS)
                const request = store.count()

                request.onsuccess = (event) => {
                    resolve(event.target.result > 0)
                }

                request.onerror = () => reject(new Error('Failed to check for saved data'))
            })
        } catch (error) {
            logger.error('Error checking for saved data:', error)
            return false
        }
    }

    // Images methods

    /**
     * Save image
     * @param {string} id - Image ID
     * @param {Blob} blob - Image blob
     * @returns {Promise<boolean>} Success status
     */
    async saveImage(id, blob) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.IMAGES], 'readwrite')
                const store = transaction.objectStore(this.stores.IMAGES)
                const request = store.put(blob, id)

                request.onsuccess = () => resolve(true)
                request.onerror = () => reject(new Error('Failed to save image'))
            })
        } catch (error) {
            logger.error('Error saving image:', error)
            return false
        }
    }

    /**
     * Load image
     * @param {string} id - Image ID
     * @returns {Promise<Blob|null>} Image blob or null if not found
     */
    async loadImage(id) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.IMAGES], 'readonly')
                const store = transaction.objectStore(this.stores.IMAGES)
                const request = store.get(id)

                request.onsuccess = (event) => {
                    const blob = event.target.result
                    resolve(blob || null)
                }

                request.onerror = () => reject(new Error('Failed to load image'))
            })
        } catch (error) {
            logger.error('Error loading image:', error)
            return null
        }
    }

    /**
     * Delete image
     * @param {string} id - Image ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteImage(id) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.IMAGES], 'readwrite')
                const store = transaction.objectStore(this.stores.IMAGES)
                const request = store.delete(id)

                request.onsuccess = () => resolve(true)
                request.onerror = () => reject(new Error('Failed to delete image'))
            })
        } catch (error) {
            logger.error('Error deleting image:', error)
            return false
        }
    }

    /**
     * Get all image IDs
     * @returns {Promise<Array<string>>} Array of image IDs
     */
    async getAllImageIds() {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.IMAGES], 'readonly')
                const store = transaction.objectStore(this.stores.IMAGES)
                const request = store.getAllKeys()

                request.onsuccess = (event) => {
                    resolve(event.target.result)
                }

                request.onerror = () => reject(new Error('Failed to get image IDs'))
            })
        } catch (error) {
            logger.error('Error getting image IDs:', error)
            return []
        }
    }

    /**
     * Clone image
     * @param {string} sourceId - Source image ID
     * @param {string} targetId - Target image ID
     * @returns {Promise<boolean>} Success status
     */
    async cloneImage(sourceId, targetId) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.IMAGES], 'readwrite')
                const store = transaction.objectStore(this.stores.IMAGES)

                // Get source image
                const getRequest = store.get(sourceId)

                getRequest.onsuccess = (event) => {
                    const blob = event.target.result

                    if (blob) {
                        // Save to new ID
                        const putRequest = store.put(blob, targetId)

                        putRequest.onsuccess = () => resolve(true)
                        putRequest.onerror = () => reject(new Error('Failed to clone image'))
                    } else {
                        resolve(false)
                    }
                }

                getRequest.onerror = () => reject(new Error('Failed to load source image'))
            })
        } catch (error) {
            logger.error('Error cloning image:', error)
            return false
        }
    }

    // Settings methods

    /**
     * Save a single setting
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     * @returns {Promise<boolean>} Success status
     */
    async saveSetting(key, value) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.SETTINGS], 'readwrite')
                const store = transaction.objectStore(this.stores.SETTINGS)
                const request = store.put(value, key)

                request.onsuccess = () => resolve(true)
                request.onerror = () => reject(new Error(`Failed to save setting: ${key}`))
            })
        } catch (error) {
            logger.error(`Error saving setting ${key}:`, error)
            return false
        }
    }

    /**
     * Load all settings as an object
     * @returns {Promise<Object>} Settings object
     */
    async loadAllSettings() {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.SETTINGS], 'readonly')
                const store = transaction.objectStore(this.stores.SETTINGS)
                const getAllKeysRequest = store.getAllKeys()

                getAllKeysRequest.onsuccess = () => {
                    const keys = getAllKeysRequest.result

                    if (keys.length === 0) {
                        resolve({})
                        return
                    }

                    const settings = {}
                    let completed = 0

                    keys.forEach(key => {
                        const request = store.get(key)

                        request.onsuccess = (event) => {
                            settings[key] = event.target.result
                            completed++

                            if (completed === keys.length) {
                                resolve(settings)
                            }
                        }

                        request.onerror = () => {
                            reject(new Error(`Failed to load setting: ${key}`))
                        }
                    })
                }

                getAllKeysRequest.onerror = () => {
                    reject(new Error('Failed to get settings keys'))
                }
            })
        } catch (error) {
            logger.error('Error loading settings:', error)
            return {}
        }
    }

    // Statistics methods

    /**
     * Save daily statistics
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {Object} stats - Statistics object for the day
     * @returns {Promise<boolean>} Success status
     */
    async saveDailyStats(date, stats) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.STATISTICS], 'readwrite')
                const store = transaction.objectStore(this.stores.STATISTICS)
                const request = store.put(stats, date)

                request.onsuccess = () => resolve(true)
                request.onerror = () => reject(new Error(`Failed to save statistics for ${date}`))
            })
        } catch (error) {
            logger.error(`Error saving statistics for ${date}:`, error)
            return false
        }
    }

    /**
     * Load all statistics as an object with dates as keys
     * @returns {Promise<Object>} Statistics object with dates as keys
     */
    async loadAllStatistics() {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.STATISTICS], 'readonly')
                const store = transaction.objectStore(this.stores.STATISTICS)
                const getAllKeysRequest = store.getAllKeys()

                getAllKeysRequest.onsuccess = () => {
                    const keys = getAllKeysRequest.result

                    if (keys.length === 0) {
                        resolve({})
                        return
                    }

                    const statistics = {}
                    let completed = 0

                    keys.forEach(key => {
                        const request = store.get(key)

                        request.onsuccess = (event) => {
                            statistics[key] = event.target.result
                            completed++

                            if (completed === keys.length) {
                                resolve(statistics)
                            }
                        }

                        request.onerror = () => {
                            reject(new Error(`Failed to load statistics for ${key}`))
                        }
                    })
                }

                getAllKeysRequest.onerror = () => {
                    reject(new Error('Failed to get statistics keys'))
                }
            })
        } catch (error) {
            logger.error('Error loading statistics:', error)
            return {}
        }
    }

    /**
     * Load statistics for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<Object|null>} Statistics object or null if not found
     */
    async loadDailyStats(date) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.STATISTICS], 'readonly')
                const store = transaction.objectStore(this.stores.STATISTICS)
                const request = store.get(date)

                request.onsuccess = (event) => {
                    const stats = event.target.result
                    resolve(stats || null)
                }

                request.onerror = () => reject(new Error(`Failed to load statistics for ${date}`))
            })
        } catch (error) {
            logger.error(`Error loading statistics for ${date}:`, error)
            return null
        }
    }

    /**
     * Delete statistics for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<boolean>} Success status
     */
    async deleteDailyStats(date) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.STATISTICS], 'readwrite')
                const store = transaction.objectStore(this.stores.STATISTICS)
                const request = store.delete(date)

                request.onsuccess = () => resolve(true)
                request.onerror = () => reject(new Error(`Failed to delete statistics for ${date}`))
            })
        } catch (error) {
            logger.error(`Error deleting statistics for ${date}:`, error)
            return false
        }
    }

    // Meta methods

    /**
     * Save meta value
     * @param {string} key - Meta key
     * @param {any} value - Value to save
     * @returns {Promise<boolean>} Success status
     */
    async saveMeta(key, value) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.META], 'readwrite')
                const store = transaction.objectStore(this.stores.META)
                const request = store.put(value, key)

                request.onsuccess = () => resolve(true)
                request.onerror = () => reject(new Error(`Failed to save meta: ${key}`))
            })
        } catch (error) {
            logger.error(`Error saving meta ${key}:`, error)
            return false
        }
    }

    /**
     * Load meta value
     * @param {string} key - Meta key
     * @returns {Promise<any|null>} Meta value or null if not found
     */
    async loadMeta(key) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.META], 'readonly')
                const store = transaction.objectStore(this.stores.META)
                const request = store.get(key)

                request.onsuccess = (event) => {
                    const value = event.target.result
                    resolve(value !== undefined ? value : null)
                }

                request.onerror = () => reject(new Error(`Failed to load meta: ${key}`))
            })
        } catch (error) {
            logger.error(`Error loading meta ${key}:`, error)
            return null
        }
    }
}

export default IndexedDBProvider
