import { createLogger } from '../../utils/logger'
import { STORAGE } from '../../constants'

const logger = createLogger('MainStorageProvider')

/**
 * Main Storage Provider
 * Manages the main IndexedDB for boards list, settings, and statistics
 */
class MainStorageProvider {
    constructor() {
        this.dbName = STORAGE.INDEXED_DB.MAIN_DB_NAME
        this.dbVersion = STORAGE.INDEXED_DB.DB_VERSION
        this.stores = STORAGE.INDEXED_DB.MAIN_STORES
        this.db = null
        this.initPromise = null
    }

    /**
     * Initialize Main IndexedDB
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        if (this.initPromise) {
            return this.initPromise
        }

        if (this.db) {
            return Promise.resolve(this.db)
        }

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion)

            request.onerror = () => {
                const error = new Error('Failed to open Main IndexedDB')
                logger.error(error.message, request.error)
                reject(error)
            }

            request.onsuccess = (event) => {
                this.db = event.target.result
                logger.info('Main IndexedDB initialized successfully')
                resolve(this.db)
            }

            request.onupgradeneeded = (event) => {
                const db = event.target.result

                if (!db.objectStoreNames.contains(this.stores.BOARDS)) {
                    db.createObjectStore(this.stores.BOARDS)
                }
                if (!db.objectStoreNames.contains(this.stores.SETTINGS)) {
                    db.createObjectStore(this.stores.SETTINGS)
                }
                if (!db.objectStoreNames.contains(this.stores.STATISTICS)) {
                    db.createObjectStore(this.stores.STATISTICS)
                }
                if (!db.objectStoreNames.contains(this.stores.STATE)) {
                    db.createObjectStore(this.stores.STATE)
                }

                logger.info('Main IndexedDB object stores created')
            }
        })

        return this.initPromise
    }

    // Board methods

    /**
     * Save board
     * @param {Object} board - Board object { id, name, createdAt, updatedAt }
     * @returns {Promise<boolean>} Success status
     */
    async saveBoard(board) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.BOARDS], 'readwrite')
                const store = transaction.objectStore(this.stores.BOARDS)
                const request = store.put(board, board.id)

                request.onsuccess = () => {
                    logger.log(`Board saved: ${board.name}`)
                    resolve(true)
                }
                request.onerror = () => reject(new Error('Failed to save board'))
            })
        } catch (error) {
            logger.error('Error saving board:', error)
            return false
        }
    }

    /**
     * Load all boards
     * @returns {Promise<Array>} Array of boards
     */
    async loadAllBoards() {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.BOARDS], 'readonly')
                const store = transaction.objectStore(this.stores.BOARDS)
                const request = store.getAll()

                request.onsuccess = (event) => {
                    const boards = event.target.result
                    resolve(boards || [])
                }

                request.onerror = () => reject(new Error('Failed to load boards'))
            })
        } catch (error) {
            logger.error('Error loading boards:', error)
            return []
        }
    }

    /**
     * Load a single board
     * @param {string} boardId - Board ID
     * @returns {Promise<Object|null>} Board object or null
     */
    async loadBoard(boardId) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.BOARDS], 'readonly')
                const store = transaction.objectStore(this.stores.BOARDS)
                const request = store.get(boardId)

                request.onsuccess = (event) => {
                    const board = event.target.result
                    resolve(board || null)
                }

                request.onerror = () => reject(new Error('Failed to load board'))
            })
        } catch (error) {
            logger.error('Error loading board:', error)
            return null
        }
    }

    /**
     * Delete board
     * @param {string} boardId - Board ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteBoard(boardId) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.BOARDS], 'readwrite')
                const store = transaction.objectStore(this.stores.BOARDS)
                const request = store.delete(boardId)

                request.onsuccess = () => {
                    logger.log(`Board deleted: ${boardId}`)
                    resolve(true)
                }
                request.onerror = () => reject(new Error('Failed to delete board'))
            })
        } catch (error) {
            logger.error('Error deleting board:', error)
            return false
        }
    }

    /**
     * Delete board database
     * @param {string} boardId - Board ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteBoardDatabase(boardId) {
        try {
            const dbName = `${STORAGE.INDEXED_DB.BOARD_DB_PREFIX}${boardId}`

            return new Promise((resolve, reject) => {
                const request = indexedDB.deleteDatabase(dbName)

                request.onsuccess = () => {
                    logger.log(`Board database deleted: ${dbName}`)
                    resolve(true)
                }

                request.onerror = () => {
                    logger.error(`Failed to delete board database: ${dbName}`)
                    reject(new Error('Failed to delete board database'))
                }

                request.onblocked = () => {
                    logger.warn(`Delete board database blocked: ${dbName} - will be deleted when all connections are closed`)
                    // Resolve anyway - database will be deleted when connections close
                    resolve(true)
                }
            })
        } catch (error) {
            logger.error('Error deleting board database:', error)
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

    // State methods

    /**
     * Save state value
     * @param {string} key - State key (currentBoardId, lastTextModel, lastImageModel)
     * @param {any} value - State value
     * @returns {Promise<boolean>} Success status
     */
    async saveState(key, value) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.STATE], 'readwrite')
                const store = transaction.objectStore(this.stores.STATE)
                const request = store.put(value, key)

                request.onsuccess = () => resolve(true)
                request.onerror = () => reject(new Error(`Failed to save state: ${key}`))
            })
        } catch (error) {
            logger.error(`Error saving state ${key}:`, error)
            return false
        }
    }

    /**
     * Load state value
     * @param {string} key - State key
     * @returns {Promise<any|null>} State value or null
     */
    async loadState(key) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.STATE], 'readonly')
                const store = transaction.objectStore(this.stores.STATE)
                const request = store.get(key)

                request.onsuccess = (event) => {
                    const value = event.target.result
                    resolve(value !== undefined ? value : null)
                }

                request.onerror = () => reject(new Error(`Failed to load state: ${key}`))
            })
        } catch (error) {
            logger.error(`Error loading state ${key}:`, error)
            return null
        }
    }

    /**
     * Load all state as an object
     * @returns {Promise<Object>} State object
     */
    async loadAllState() {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.stores.STATE], 'readonly')
                const store = transaction.objectStore(this.stores.STATE)
                const getAllKeysRequest = store.getAllKeys()

                getAllKeysRequest.onsuccess = () => {
                    const keys = getAllKeysRequest.result

                    if (keys.length === 0) {
                        resolve({})
                        return
                    }

                    const state = {}
                    let completed = 0

                    keys.forEach(key => {
                        const request = store.get(key)

                        request.onsuccess = (event) => {
                            state[key] = event.target.result
                            completed++

                            if (completed === keys.length) {
                                resolve(state)
                            }
                        }

                        request.onerror = () => {
                            reject(new Error(`Failed to load state: ${key}`))
                        }
                    })
                }

                getAllKeysRequest.onerror = () => {
                    reject(new Error('Failed to get state keys'))
                }
            })
        } catch (error) {
            logger.error('Error loading state:', error)
            return {}
        }
    }
}

export default MainStorageProvider
