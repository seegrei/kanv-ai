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
                if (!db.objectStoreNames.contains(this.stores.BLOCKS_CHAT_HISTORY)) {
                    db.createObjectStore(this.stores.BLOCKS_CHAT_HISTORY)
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
     * @param {Object} state - Canvas state (offset, zoom, lastTextModel, lastImageModel)
     * @returns {Promise<Object>} { success: boolean, error?: string }
     */
    async saveCanvasState(state) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.CANVAS_STATE], 'readwrite')
                const store = transaction.objectStore(this.stores.CANVAS_STATE)

                // Save offset, zoom, and models separately
                const saveOffset = store.put(state.offset, 'offset')
                const saveZoom = store.put(state.zoom, 'zoom')
                const saveTextModel = state.lastTextModel !== undefined ? store.put(state.lastTextModel, 'lastTextModel') : null
                const saveImageModel = state.lastImageModel !== undefined ? store.put(state.lastImageModel, 'lastImageModel') : null

                let offsetSaved = false
                let zoomSaved = false
                let textModelSaved = !saveTextModel
                let imageModelSaved = !saveImageModel

                const checkComplete = () => {
                    if (offsetSaved && zoomSaved && textModelSaved && imageModelSaved) {
                        resolve({ success: true })
                    }
                }

                saveOffset.onsuccess = () => {
                    offsetSaved = true
                    checkComplete()
                }

                saveZoom.onsuccess = () => {
                    zoomSaved = true
                    checkComplete()
                }

                if (saveTextModel) {
                    saveTextModel.onsuccess = () => {
                        textModelSaved = true
                        checkComplete()
                    }
                    saveTextModel.onerror = () => {
                        reject(new Error('Failed to save canvas state'))
                    }
                }

                if (saveImageModel) {
                    saveImageModel.onsuccess = () => {
                        imageModelSaved = true
                        checkComplete()
                    }
                    saveImageModel.onerror = () => {
                        reject(new Error('Failed to save canvas state'))
                    }
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

                // Load offset, zoom, and models separately
                const getOffset = store.get('offset')
                const getZoom = store.get('zoom')
                const getTextModel = store.get('lastTextModel')
                const getImageModel = store.get('lastImageModel')

                let offset = null
                let zoom = null
                let lastTextModel = null
                let lastImageModel = null
                let offsetLoaded = false
                let zoomLoaded = false
                let textModelLoaded = false
                let imageModelLoaded = false

                const checkComplete = () => {
                    if (offsetLoaded && zoomLoaded && textModelLoaded && imageModelLoaded) {
                        // Return null if neither offset nor zoom exists
                        if (offset == null && zoom == null) {
                            resolve(null)
                        } else {
                            resolve({ offset, zoom, lastTextModel, lastImageModel })
                        }
                    }
                }

                getOffset.onsuccess = (event) => {
                    offset = event.target.result
                    offsetLoaded = true
                    checkComplete()
                }

                getZoom.onsuccess = (event) => {
                    zoom = event.target.result
                    zoomLoaded = true
                    checkComplete()
                }

                getTextModel.onsuccess = (event) => {
                    lastTextModel = event.target.result
                    textModelLoaded = true
                    checkComplete()
                }

                getImageModel.onsuccess = (event) => {
                    lastImageModel = event.target.result
                    imageModelLoaded = true
                    checkComplete()
                }

                getOffset.onerror = getZoom.onerror = getTextModel.onerror = getImageModel.onerror = () => {
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
                const clearTextModel = stateStore.delete('lastTextModel')
                const clearImageModel = stateStore.delete('lastImageModel')

                let blocksCleared = false
                let offsetCleared = false
                let zoomCleared = false
                let textModelCleared = false
                let imageModelCleared = false

                const checkComplete = () => {
                    if (blocksCleared && offsetCleared && zoomCleared && textModelCleared && imageModelCleared) {
                        resolve({ success: true })
                    }
                }

                clearBlocks.onsuccess = () => {
                    blocksCleared = true
                    checkComplete()
                }

                clearOffset.onsuccess = () => {
                    offsetCleared = true
                    checkComplete()
                }

                clearZoom.onsuccess = () => {
                    zoomCleared = true
                    checkComplete()
                }

                clearTextModel.onsuccess = () => {
                    textModelCleared = true
                    checkComplete()
                }

                clearImageModel.onsuccess = () => {
                    imageModelCleared = true
                    checkComplete()
                }

                clearBlocks.onerror = clearOffset.onerror = clearZoom.onerror = clearTextModel.onerror = clearImageModel.onerror = () => {
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

    // Block chat history methods

    /**
     * Get chat history for a block
     * @param {string} blockId - Block ID
     * @returns {Promise<Array>} Array of messages
     */
    async getBlockChatHistory(blockId) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.BLOCKS_CHAT_HISTORY], 'readonly')
                const store = transaction.objectStore(this.stores.BLOCKS_CHAT_HISTORY)
                const request = store.get(blockId)

                request.onsuccess = (event) => {
                    const data = event.target.result
                    resolve(data ? data.messages : [])
                }

                request.onerror = () => {
                    logger.error(`Failed to get chat history for block ${blockId}`)
                    reject(new Error('Failed to get chat history'))
                }
            })
        } catch (error) {
            logger.error('Error getting chat history:', error)
            return []
        }
    }

    /**
     * Save chat history for a block
     * @param {string} blockId - Block ID
     * @param {Array} messages - Array of messages
     * @returns {Promise<boolean>} Success status
     */
    async saveBlockChatHistory(blockId, messages) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.BLOCKS_CHAT_HISTORY], 'readwrite')
                const store = transaction.objectStore(this.stores.BLOCKS_CHAT_HISTORY)
                const request = store.put({ messages, updatedAt: Date.now() }, blockId)

                request.onsuccess = () => {
                    logger.log(`Saved chat history for block ${blockId}:`, messages.length, 'messages')
                    resolve(true)
                }

                request.onerror = () => {
                    logger.error(`Failed to save chat history for block ${blockId}`)
                    reject(new Error('Failed to save chat history'))
                }
            })
        } catch (error) {
            logger.error('Error saving chat history:', error)
            return false
        }
    }

    /**
     * Clear chat history for a block
     * @param {string} blockId - Block ID
     * @returns {Promise<boolean>} Success status
     */
    async clearBlockChatHistory(blockId) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.BLOCKS_CHAT_HISTORY], 'readwrite')
                const store = transaction.objectStore(this.stores.BLOCKS_CHAT_HISTORY)
                const request = store.delete(blockId)

                request.onsuccess = () => {
                    logger.log(`Cleared chat history for block ${blockId}`)
                    resolve(true)
                }

                request.onerror = () => {
                    logger.error(`Failed to clear chat history for block ${blockId}`)
                    reject(new Error('Failed to clear chat history'))
                }
            })
        } catch (error) {
            logger.error('Error clearing chat history:', error)
            return false
        }
    }

    /**
     * Check if block has chat history
     * @param {string} blockId - Block ID
     * @returns {Promise<boolean>} True if has history
     */
    async hasBlockChatHistory(blockId) {
        try {
            const messages = await this.getBlockChatHistory(blockId)
            return messages.length > 0
        } catch (error) {
            logger.error('Error checking chat history:', error)
            return false
        }
    }

    /**
     * Get all image IDs from all chat histories
     * @returns {Promise<Array<string>>} Array of image IDs
     */
    async getAllChatHistoryImageIds() {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.BLOCKS_CHAT_HISTORY], 'readonly')
                const objectStore = transaction.objectStore(this.stores.BLOCKS_CHAT_HISTORY)
                const request = objectStore.getAll()

                request.onsuccess = () => {
                    const allHistories = request.result || []
                    const imageIds = new Set()

                    // Iterate through all chat histories
                    allHistories.forEach(historyEntry => {
                        const messages = historyEntry.messages || []
                        messages.forEach(message => {
                            // Collect image IDs from assistant messages
                            if (message.type === 'assistant' && message.contentType === 'image' && message.imageId) {
                                imageIds.add(message.imageId)
                            }
                        })
                    })

                    resolve(Array.from(imageIds))
                }

                request.onerror = () => {
                    reject(new Error('Failed to get chat history image IDs'))
                }
            })
        } catch (error) {
            logger.error('Error getting chat history image IDs:', error)
            return []
        }
    }
}

export default IndexedDBProvider
