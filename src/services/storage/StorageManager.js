import { createLogger } from '../../utils/logger'
import { generateId } from '../../utils/generateId'
import { eventBus } from '../../core/EventBus'
import { useElementsStore } from '../../store/useElementsStore'
import { useCanvasViewStore } from '../../store/useCanvasViewStore'
import { CANVAS } from '../../constants'
import IndexedDBProvider from './IndexedDBProvider'

const logger = createLogger('StorageManager')

/**
 * Storage Manager
 * Central coordinator for all save/load operations
 * Manages both main DB (boards, settings, statistics) and board-specific DBs
 */
class StorageManager {
    constructor(mainProvider, initialBoardId = null) {
        this.mainProvider = mainProvider
        this.boardProvider = null
        this.currentBoardId = initialBoardId
        this.autoSaveEnabled = true
        this.debounceTimer = null
        this.cleanupTimer = null
        this.isInitialized = false
        this.hasLoaded = false
        this.isLoading = false
        this.isLoadingInitialData = false

        // Refs (for backward compatibility, no longer used for state management)
        this.offsetRef = null
        this.zoomRef = null
        this.lastTextModel = null
        this.lastImageModel = null

        // Store unsubscribe functions
        this.unsubscribeStore = null
        this.eventUnsubscribers = []

        // Initialize board provider if boardId is provided
        if (initialBoardId) {
            this.setBoardProvider(initialBoardId)
        }
    }

    /**
     * Set board provider for a specific board
     * @param {string} boardId - Board ID
     */
    setBoardProvider(boardId) {
        this.currentBoardId = boardId
        this.boardProvider = new IndexedDBProvider(boardId)
        logger.log(`Board provider set for board: ${boardId}`)
    }

    /**
     * Close current board provider connection
     */
    closeBoardProvider() {
        if (this.boardProvider && this.boardProvider.close) {
            this.boardProvider.close()
            logger.log('Board provider connection closed')
        }
    }

    /**
     * Switch to a different board
     * @param {string} boardId - Board ID to switch to
     * @returns {Promise<void>}
     */
    async switchBoard(boardId) {
        logger.log(`Switching to board: ${boardId}`)

        // Save current board before switching
        if (this.currentBoardId && this.hasLoaded) {
            await this.save()
        }

        // Close current board provider connection
        this.closeBoardProvider()

        // Set new board provider
        this.setBoardProvider(boardId)

        // Reset load state
        this.hasLoaded = false
        this.isLoading = false

        logger.log(`Switched to board: ${boardId}`)
    }

    /**
     * Initialize storage manager
     * Sets up subscriptions to stores and events
     * Can be called multiple times safely - will re-establish subscriptions
     * @param {Object} offsetRef - Reference to canvas offset (optional, for backward compatibility)
     * @param {Object} zoomRef - Reference to canvas zoom (optional, for backward compatibility)
     */
    init(offsetRef, zoomRef) {
        if (this.isInitialized) {
            logger.log('StorageManager already initialized')
            return
        }

        logger.log('Initializing StorageManager')

        // Store refs for backward compatibility
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

        // Track canvas viewport changes (zoom/pan) via window events
        const handleCanvasZoom = () => {
            this.scheduleAutoSave()
        }

        const handleCanvasPan = () => {
            this.scheduleAutoSave()
        }

        window.addEventListener('canvas:zoom', handleCanvasZoom)
        window.addEventListener('canvas:pan', handleCanvasPan)

        // Store cleanup functions for window events
        this.eventUnsubscribers.push(() => {
            window.removeEventListener('canvas:zoom', handleCanvasZoom)
            window.removeEventListener('canvas:pan', handleCanvasPan)
        })
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

        if (!this.boardProvider) {
            logger.log('No board provider set, skipping auto-save')
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
     * Collects data from stores and saves via board provider
     */
    async autoSave() {
        if (!this.hasLoaded) {
            logger.log('Skipping auto-save: data not loaded yet')
            return
        }

        if (!this.boardProvider) {
            logger.log('No board provider set, skipping auto-save')
            return
        }

        const { blocks, canvasState } = this.collectData()

        // Skip save if no blocks and no saved data
        if (blocks.length === 0 && !(await this.boardProvider.hasCanvasData())) {
            logger.log('Skipping auto-save: no blocks and no saved data')
            return
        }

        logger.log('Auto-saving', blocks.length, 'blocks')

        const blocksResult = await this.boardProvider.saveBlocks(blocks)
        const stateResult = await this.boardProvider.saveCanvasState(canvasState)

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
     * Load data from storage for current board
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

        if (!this.boardProvider) {
            logger.error('No board provider set, cannot load')
            return null
        }

        // Mark as loading
        this.isLoading = true
        logger.log('Loading data from storage')

        try {
            const blocks = await this.boardProvider.loadBlocks()
            const canvasState = await this.boardProvider.loadCanvasState()

            // Set flag to prevent auto-save during initial load
            this.isLoadingInitialData = true

            // Restore blocks to store (even if empty array)
            useElementsStore.getState().setElements(blocks || [])

            // Clear flag after loading
            this.isLoadingInitialData = false

            logger.log('Loaded', (blocks || []).length, 'blocks from storage')

            // Load models from main DB state (not board-specific)
            this.lastTextModel = await this.mainProvider.loadState('lastTextModel')
            this.lastImageModel = await this.mainProvider.loadState('lastImageModel')

            // Restore canvas view state to store
            if (canvasState && canvasState.offset && canvasState.zoom) {
                logger.log('Restoring canvas state to store:', canvasState)
                useCanvasViewStore.getState().setCanvasView(canvasState)
            } else {
                logger.log('No saved canvas state, using defaults')
                useCanvasViewStore.getState().resetToDefaults()
            }

            // Mark as loaded
            this.hasLoaded = true
            this.isLoading = false

            // Return canvas state for restoration
            return canvasState || null
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
        if (!this.boardProvider) {
            return { success: false, error: 'No board provider set' }
        }

        const { blocks, canvasState } = this.collectData()
        logger.log('Manual save:', blocks.length, 'blocks')

        const blocksResult = await this.boardProvider.saveBlocks(blocks)
        const stateResult = await this.boardProvider.saveCanvasState(canvasState)

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

        // Get current canvas state from store (single source of truth)
        const { offset, zoom } = useCanvasViewStore.getState()
        const canvasState = { offset, zoom }

        logger.log('collectData - canvasState:', canvasState)

        return {
            blocks,
            canvasState
        }
    }

    /**
     * Clear all saved canvas data for current board
     * @returns {Promise<Object>} Clear result
     */
    async clearData() {
        if (!this.boardProvider) {
            return { success: false, error: 'No board provider set' }
        }

        logger.log('Clearing saved canvas data')
        const result = await this.boardProvider.clearCanvasData()

        if (result.success) {
            logger.log('Canvas data cleared successfully')
        } else {
            logger.error('Failed to clear canvas data:', result.error)
        }

        return result
    }

    // Images methods (delegated to board provider)

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
        if (!this.boardProvider) {
            return false
        }

        try {
            const blob = await this.dataUrlToBlob(dataUrl)
            return await this.boardProvider.saveImage(id, blob)
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
        if (!this.boardProvider) {
            return null
        }

        try {
            const blob = await this.boardProvider.loadImage(id)
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
        if (!this.boardProvider) {
            return null
        }

        try {
            const blob = await this.boardProvider.loadImage(id)
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
        if (!this.boardProvider) {
            return false
        }
        return await this.boardProvider.deleteImage(id)
    }

    /**
     * Clone image
     * @param {string} sourceId - Source image ID
     * @param {string} targetId - Target image ID
     * @returns {Promise<boolean>} Success status
     */
    async cloneImage(sourceId, targetId) {
        if (!this.boardProvider) {
            return false
        }
        return await this.boardProvider.cloneImage(sourceId, targetId)
    }

    /**
     * Duplicate image
     * Creates a copy of an image with a new unique ID
     * @param {string} sourceId - Source image ID
     * @returns {Promise<string|null>} New image ID or null if failed
     */
    async duplicateImage(sourceId) {
        if (!this.boardProvider) {
            return null
        }

        try {
            const newId = generateId()
            const success = await this.boardProvider.cloneImage(sourceId, newId)
            if (success) {
                logger.log('Duplicated image:', sourceId, '->', newId)
                return newId
            }
            return null
        } catch (error) {
            logger.error('Error duplicating image:', error)
            return null
        }
    }

    /**
     * Get all image IDs
     * @returns {Promise<Array<string>>} Array of image IDs
     */
    async getAllImageIds() {
        if (!this.boardProvider) {
            return []
        }
        return await this.boardProvider.getAllImageIds()
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

    // Settings methods (delegated to main provider)

    /**
     * Save a single setting
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     * @returns {Promise<boolean>} Success status
     */
    async saveSetting(key, value) {
        return await this.mainProvider.saveSetting(key, value)
    }

    /**
     * Load all settings as an object
     * @returns {Promise<Object>} Settings object
     */
    async loadAllSettings() {
        return await this.mainProvider.loadAllSettings()
    }

    // Statistics methods (delegated to main provider)

    /**
     * Save daily statistics
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {Object} stats - Statistics object for the day
     * @returns {Promise<boolean>} Success status
     */
    async saveDailyStats(date, stats) {
        return await this.mainProvider.saveDailyStats(date, stats)
    }

    /**
     * Load all statistics as an object with dates as keys
     * @returns {Promise<Object>} Statistics object with dates as keys
     */
    async loadAllStatistics() {
        return await this.mainProvider.loadAllStatistics()
    }

    /**
     * Load statistics for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<Object|null>} Statistics object or null if not found
     */
    async loadDailyStats(date) {
        return await this.mainProvider.loadDailyStats(date)
    }

    /**
     * Delete statistics for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<boolean>} Success status
     */
    async deleteDailyStats(date) {
        return await this.mainProvider.deleteDailyStats(date)
    }

    // Model selection methods

    /**
     * Save last selected model for text or image
     * @param {string} type - 'text' or 'image'
     * @param {string} model - Model name
     * @returns {Promise<boolean>} Success status
     */
    async saveLastModel(type, model) {
        try {
            if (type === 'text') {
                this.lastTextModel = model
                await this.mainProvider.saveState('lastTextModel', model)
            } else if (type === 'image') {
                this.lastImageModel = model
                await this.mainProvider.saveState('lastImageModel', model)
            }

            return true
        } catch (error) {
            logger.error(`Error saving last ${type} model:`, error)
            return false
        }
    }

    /**
     * Load last selected model for text or image
     * @param {string} type - 'text' or 'image'
     * @returns {Promise<string|null>} Last selected model or null
     */
    async loadLastModel(type) {
        try {
            // If data is already loaded, return from memory
            if (this.hasLoaded) {
                if (type === 'text') {
                    return this.lastTextModel
                } else if (type === 'image') {
                    return this.lastImageModel
                }
                return null
            }

            // Otherwise load from main DB state
            if (type === 'text') {
                return await this.mainProvider.loadState('lastTextModel')
            } else if (type === 'image') {
                return await this.mainProvider.loadState('lastImageModel')
            }
            return null
        } catch (error) {
            logger.error(`Error loading last ${type} model:`, error)
            return null
        }
    }

    // Block chat history methods (delegated to board provider)

    /**
     * Get chat history for a block
     * @param {string} blockId - Block ID
     * @returns {Promise<Array>} Array of messages
     */
    async getBlockChatHistory(blockId) {
        if (!this.boardProvider) {
            return []
        }
        return await this.boardProvider.getBlockChatHistory(blockId)
    }

    /**
     * Save chat history for a block
     * @param {string} blockId - Block ID
     * @param {Array} messages - Array of messages
     * @returns {Promise<boolean>} Success status
     */
    async saveBlockChatHistory(blockId, messages) {
        if (!this.boardProvider) {
            return false
        }
        return await this.boardProvider.saveBlockChatHistory(blockId, messages)
    }

    /**
     * Clear chat history for a block
     * @param {string} blockId - Block ID
     * @returns {Promise<boolean>} Success status
     */
    async clearBlockChatHistory(blockId) {
        if (!this.boardProvider) {
            return false
        }
        return await this.boardProvider.clearBlockChatHistory(blockId)
    }

    /**
     * Check if block has chat history
     * @param {string} blockId - Block ID
     * @returns {Promise<boolean>} True if has history
     */
    async hasBlockChatHistory(blockId) {
        if (!this.boardProvider) {
            return false
        }
        return await this.boardProvider.hasBlockChatHistory(blockId)
    }

    /**
     * Get all image IDs from all chat histories
     * @returns {Promise<Array<string>>} Array of image IDs
     */
    async getAllChatHistoryImageIds() {
        if (!this.boardProvider) {
            return []
        }
        return await this.boardProvider.getAllChatHistoryImageIds()
    }

    /**
     * Cleanup
     * Clears timers and unsubscribes from listeners
     * Note: Does NOT reset isInitialized to support React StrictMode
     */
    destroy() {
        logger.log('Cleaning up StorageManager subscriptions')

        // Clear debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer)
            this.debounceTimer = null
        }

        // Clear cleanup timer
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer)
            this.cleanupTimer = null
        }

        // Unsubscribe from store
        if (this.unsubscribeStore) {
            this.unsubscribeStore()
            this.unsubscribeStore = null
        }

        // Unsubscribe from events
        this.eventUnsubscribers.forEach(unsub => unsub())
        this.eventUnsubscribers = []

        // Note: Keep isInitialized as true to prevent re-initialization
        // This allows React StrictMode to work correctly
        logger.log('StorageManager subscriptions cleaned up')
    }

    /**
     * Full reset - use only for testing or complete teardown
     * @private
     */
    _reset() {
        this.destroy()
        this.isInitialized = false
        this.hasLoaded = false
        this.isLoading = false
        this.isLoadingInitialData = false
        logger.log('StorageManager fully reset')
    }
}

export default StorageManager
