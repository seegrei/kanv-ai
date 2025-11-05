import { createLogger } from '../../utils/logger'
import { eventBus } from '../../core/EventBus'
import { useElementsStore } from '../../store/useElementsStore'
import { CANVAS } from '../../constants'
import { initializeDefaultData } from '../../utils/initializeDefaultData'

const logger = createLogger('StorageManager')

/**
 * Storage Manager
 * Central coordinator for all save/load operations
 * Automatically tracks changes and manages auto-save
 */
class StorageManager {
    constructor(provider) {
        this.provider = provider
        this.autoSaveEnabled = true
        this.debounceTimer = null
        this.cleanupTimer = null
        this.isInitialized = false
        this.hasLoaded = false
        this.isLoading = false
        this.isLoadingInitialData = false

        // Canvas state refs (will be set during init)
        this.canvasOffset = { x: 0, y: 0 }
        this.canvasZoom = CANVAS.ZOOM.DEFAULT

        // Store unsubscribe functions
        this.unsubscribeStore = null
        this.eventUnsubscribers = []
    }

    /**
     * Initialize storage manager
     * Sets up subscriptions to stores and events
     * @param {Object} offsetRef - Reference to canvas offset
     * @param {Object} zoomRef - Reference to canvas zoom
     */
    init(offsetRef, zoomRef) {
        if (this.isInitialized) {
            logger.warn('StorageManager already initialized')
            return
        }

        logger.log('Initializing StorageManager')

        // Store refs to canvas state
        this.offsetRef = offsetRef
        this.zoomRef = zoomRef

        // Subscribe to store changes for auto-save
        this.subscribeToStoreChanges()

        // Subscribe to event bus for additional tracking
        this.subscribeToEvents()

        // Start periodic image cleanup
        this.startImageCleanup()

        this.isInitialized = true
        logger.log('StorageManager initialized')
    }

    /**
     * Subscribe to Zustand store changes
     * Automatically triggers auto-save when elements change
     */
    subscribeToStoreChanges() {
        // Subscribe to elements store
        this.unsubscribeStore = useElementsStore.subscribe((state, prevState) => {
            // Skip if loading initial data from storage
            if (this.isLoadingInitialData) {
                return
            }

            // Skip if not loaded yet
            if (!this.hasLoaded) {
                return
            }

            // Check if elements actually changed
            if (state.elements !== prevState.elements) {
                logger.log('Elements changed, triggering auto-save')
                this.scheduleAutoSave()
            }
        })
    }

    /**
     * Subscribe to EventBus events for fine-grained tracking
     */
    subscribeToEvents() {
        // Track history changes (undo/redo)
        const unsubHistory = eventBus.on('history:undo', () => {
            logger.log('History undo, triggering auto-save')
            this.scheduleAutoSave()
        })
        this.eventUnsubscribers.push(unsubHistory)

        const unsubHistoryRedo = eventBus.on('history:redo', () => {
            logger.log('History redo, triggering auto-save')
            this.scheduleAutoSave()
        })
        this.eventUnsubscribers.push(unsubHistoryRedo)
    }

    /**
     * Schedule auto-save with debounce
     * Prevents excessive saves during rapid changes
     */
    scheduleAutoSave() {
        if (!this.autoSaveEnabled) {
            logger.log('Auto-save is disabled')
            return
        }

        // Clear existing timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer)
        }

        // Schedule new save
        this.debounceTimer = setTimeout(() => {
            this.autoSave()
        }, CANVAS.AUTO_SAVE_DEBOUNCE)
    }

    /**
     * Perform auto-save
     * Collects data from stores and saves via provider
     */
    async autoSave() {
        if (!this.hasLoaded) {
            logger.log('Skipping auto-save: data not loaded yet')
            return
        }

        const { blocks, canvasState } = this.collectData()

        // Skip save if no blocks and no saved data
        if (blocks.length === 0 && !(await this.provider.hasCanvasData())) {
            logger.log('Skipping auto-save: no blocks and no saved data')
            return
        }

        logger.log('Auto-saving', blocks.length, 'blocks')

        const blocksResult = await this.provider.saveBlocks(blocks)
        const stateResult = await this.provider.saveCanvasState(canvasState)

        if (blocksResult.success && stateResult.success) {
            logger.log('Auto-save successful')
            // Cleanup unused images after successful save
            this.cleanupUnusedImages()
        } else {
            logger.error('Auto-save failed:', blocksResult.error || stateResult.error)
        }
    }

    /**
     * Start periodic image cleanup
     * Runs cleanup at regular intervals to remove orphaned images
     */
    startImageCleanup() {
        // Clear existing timer if any
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer)
        }

        // Run cleanup immediately on start
        this.cleanupUnusedImages()

        // Setup periodic cleanup
        this.cleanupTimer = setInterval(() => {
            this.cleanupUnusedImages()
        }, CANVAS.IMAGE_CLEANUP_INTERVAL)

        logger.log('Image cleanup started (interval:', CANVAS.IMAGE_CLEANUP_INTERVAL, 'ms)')
    }

    /**
     * Cleanup unused images from IndexedDB
     * Delegates to elements store which knows about all images
     */
    async cleanupUnusedImages() {
        if (!this.hasLoaded) {
            return
        }

        try {
            const result = await useElementsStore.getState().cleanupUnusedImages()
            if (result.success && result.deletedCount > 0) {
                logger.log('Cleaned up', result.deletedCount, 'unused images')
            }
        } catch (error) {
            logger.error('Failed to cleanup unused images:', error)
        }
    }

    /**
     * Load data from storage
     * Restores blocks and canvas state
     * @returns {Promise<Object|null>} Loaded canvas state or null
     */
    async load() {
        // Skip if already loaded or currently loading
        if (this.hasLoaded) {
            logger.log('Data already loaded, skipping')
            return null
        }
        if (this.isLoading) {
            logger.log('Data is currently loading, skipping duplicate request')
            return null
        }

        // Mark as loading
        this.isLoading = true
        logger.log('Loading data from storage')

        try {
            // Check if this is the first launch by checking meta version
            let version = await this.provider.loadMeta('version')
            const isFirstLaunch = !version

            if (isFirstLaunch) {
                // First launch - initialize with default data
                logger.log('First launch detected (no version in meta), initializing default data')

                const defaultData = await initializeDefaultData()

                if (defaultData && defaultData.elements) {
                    // Set flag to prevent auto-save during initial load
                    this.isLoadingInitialData = true

                    // Load default blocks to store
                    useElementsStore.getState().setElements(defaultData.elements)

                    // Clear flag after loading
                    this.isLoadingInitialData = false

                    // Save version to meta
                    version = '1.0'
                    await this.provider.saveMeta('version', version)
                    logger.log('Initialized version in meta:', version)

                    logger.log('Initialized with', defaultData.elements.length, 'default blocks')

                    // Mark as loaded
                    this.hasLoaded = true
                    this.isLoading = false

                    // Return canvas state for restoration
                    return defaultData.canvasState || null
                }

                // If initialization failed, just mark as loaded
                this.hasLoaded = true
                this.isLoading = false
                return null
            } else {
                // Not first launch - load saved data
                logger.log('Loading saved data (version in meta:', version, ')')

                const blocks = await this.provider.loadBlocks()
                const canvasState = await this.provider.loadCanvasState()

                // Set flag to prevent auto-save during initial load
                this.isLoadingInitialData = true

                // Restore blocks to store (even if empty array)
                useElementsStore.getState().setElements(blocks || [])

                // Clear flag after loading
                this.isLoadingInitialData = false

                logger.log('Loaded', (blocks || []).length, 'blocks from storage')

                // Mark as loaded
                this.hasLoaded = true
                this.isLoading = false

                // Return canvas state for restoration
                return canvasState || null
            }
        } catch (error) {
            logger.error('Failed to load data:', error)
            this.isLoadingInitialData = false
            this.isLoading = false
            this.hasLoaded = true
            return null
        }
    }

    /**
     * Manual save
     * Immediately saves without debounce
     * @returns {Promise<Object>} Save result
     */
    async save() {
        const { blocks, canvasState } = this.collectData()
        logger.log('Manual save:', blocks.length, 'blocks')

        const blocksResult = await this.provider.saveBlocks(blocks)
        const stateResult = await this.provider.saveCanvasState(canvasState)

        if (blocksResult.success && stateResult.success) {
            logger.log('Manual save successful')
            return { success: true }
        } else {
            logger.error('Manual save failed:', blocksResult.error || stateResult.error)
            return { success: false, error: blocksResult.error || stateResult.error }
        }
    }

    /**
     * Collect data from all stores for saving
     * @returns {Object} Data to save
     */
    collectData() {
        const blocks = useElementsStore.getState().elements

        // Get current canvas state from refs if available
        const canvasState = {
            offset: this.offsetRef?.current || this.canvasOffset,
            zoom: this.zoomRef?.current || this.canvasZoom
        }

        return {
            blocks,
            canvasState
        }
    }

    /**
     * Clear all saved canvas data
     * @returns {Promise<Object>} Clear result
     */
    async clearData() {
        logger.log('Clearing saved canvas data')
        const result = await this.provider.clearCanvasData()

        if (result.success) {
            logger.log('Canvas data cleared successfully')
        } else {
            logger.error('Failed to clear canvas data:', result.error)
        }

        return result
    }

    // Images methods

    /**
     * Convert data URL to Blob
     * @param {string} dataUrl - Data URL
     * @returns {Promise<Blob>}
     */
    async dataUrlToBlob(dataUrl) {
        return new Promise((resolve, reject) => {
            try {
                // Extract mime type and data
                const parts = dataUrl.split(',')
                const mimeMatch = parts[0].match(/:(.*?);/)
                const mime = mimeMatch ? mimeMatch[1] : 'image/png'
                const bstr = atob(parts[1])
                let n = bstr.length
                const u8arr = new Uint8Array(n)

                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n)
                }

                resolve(new Blob([u8arr], { type: mime }))
            } catch (error) {
                reject(error)
            }
        })
    }

    /**
     * Convert Blob to data URL
     * @param {Blob} blob - Blob
     * @returns {Promise<string>}
     */
    async blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = () => reject(new Error('Failed to convert blob to data URL'))
            reader.readAsDataURL(blob)
        })
    }

    /**
     * Save image (converts data URL to Blob)
     * @param {string} id - Image ID
     * @param {string} dataUrl - Image data URL
     * @returns {Promise<boolean>} Success status
     */
    async saveImage(id, dataUrl) {
        try {
            const blob = await this.dataUrlToBlob(dataUrl)
            return await this.provider.saveImage(id, blob)
        } catch (error) {
            logger.error('Error saving image:', error)
            return false
        }
    }

    /**
     * Load image (returns Blob URL for rendering)
     * @param {string} id - Image ID
     * @returns {Promise<string|null>} Blob URL or null if not found
     */
    async loadImage(id) {
        try {
            const blob = await this.provider.loadImage(id)
            if (blob) {
                return URL.createObjectURL(blob)
            }
            return null
        } catch (error) {
            logger.error('Error loading image:', error)
            return null
        }
    }

    /**
     * Load image as data URL (for API requests)
     * @param {string} id - Image ID
     * @returns {Promise<string|null>} Data URL or null if not found
     */
    async loadImageAsDataUrl(id) {
        try {
            const blob = await this.provider.loadImage(id)
            if (blob) {
                return await this.blobToDataUrl(blob)
            }
            return null
        } catch (error) {
            logger.error('Error loading image as data URL:', error)
            return null
        }
    }

    /**
     * Delete image
     * @param {string} id - Image ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteImage(id) {
        return await this.provider.deleteImage(id)
    }

    /**
     * Clone image
     * @param {string} sourceId - Source image ID
     * @param {string} targetId - Target image ID
     * @returns {Promise<boolean>} Success status
     */
    async cloneImage(sourceId, targetId) {
        return await this.provider.cloneImage(sourceId, targetId)
    }

    /**
     * Get all image IDs
     * @returns {Promise<Array<string>>} Array of image IDs
     */
    async getAllImageIds() {
        return await this.provider.getAllImageIds()
    }

    /**
     * Revoke Blob URL to prevent memory leaks
     * @param {string} blobUrl - Blob URL to revoke
     */
    revokeBlobUrl(blobUrl) {
        if (blobUrl && blobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(blobUrl)
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
        return await this.provider.saveSetting(key, value)
    }

    /**
     * Load all settings as an object
     * @returns {Promise<Object>} Settings object
     */
    async loadAllSettings() {
        return await this.provider.loadAllSettings()
    }

    // Statistics methods

    /**
     * Save daily statistics
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {Object} stats - Statistics object for the day
     * @returns {Promise<boolean>} Success status
     */
    async saveDailyStats(date, stats) {
        return await this.provider.saveDailyStats(date, stats)
    }

    /**
     * Load all statistics as an object with dates as keys
     * @returns {Promise<Object>} Statistics object with dates as keys
     */
    async loadAllStatistics() {
        return await this.provider.loadAllStatistics()
    }

    /**
     * Load statistics for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<Object|null>} Statistics object or null if not found
     */
    async loadDailyStats(date) {
        return await this.provider.loadDailyStats(date)
    }

    /**
     * Delete statistics for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<boolean>} Success status
     */
    async deleteDailyStats(date) {
        return await this.provider.deleteDailyStats(date)
    }

    // Meta methods

    /**
     * Save meta value
     * @param {string} key - Meta key
     * @param {any} value - Value to save
     * @returns {Promise<boolean>} Success status
     */
    async saveMeta(key, value) {
        return await this.provider.saveMeta(key, value)
    }

    /**
     * Load meta value
     * @param {string} key - Meta key
     * @returns {Promise<any|null>} Meta value or null if not found
     */
    async loadMeta(key) {
        return await this.provider.loadMeta(key)
    }

    /**
     * Cleanup
     * Unsubscribes from all listeners
     */
    destroy() {
        logger.log('Destroying StorageManager')

        // Clear debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer)
        }

        // Clear cleanup timer
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer)
        }

        // Unsubscribe from store
        if (this.unsubscribeStore) {
            this.unsubscribeStore()
        }

        // Unsubscribe from events
        this.eventUnsubscribers.forEach(unsub => unsub())
        this.eventUnsubscribers = []

        this.isInitialized = false
        logger.log('StorageManager destroyed')
    }
}

export default StorageManager
