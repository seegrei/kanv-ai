import { createLogger } from '../../utils/logger'
import { eventBus } from '../../core/EventBus'
import { useElementsStore } from '../../store/useElementsStore'
import { CANVAS } from '../../constants'

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

        const data = this.collectData()

        // Skip save if no elements and no saved data
        if (data.elements.length === 0 && !(await this.provider.hasSavedData())) {
            logger.log('Skipping auto-save: no elements and no saved data')
            return
        }

        logger.log('Auto-saving', data.elements.length, 'elements')

        const result = await this.provider.save(data)

        if (result.success) {
            logger.log('Auto-save successful')
            // Cleanup unused images after successful save
            this.cleanupUnusedImages()
        } else {
            logger.error('Auto-save failed:', result.error)
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
     * Restores elements and canvas state
     * @returns {Promise<Object|null>} Loaded data or null
     */
    async load() {
        logger.log('Loading data from storage')

        try {
            const savedData = await this.provider.load()

            if (savedData && savedData.elements) {
                // Set flag to prevent auto-save during initial load
                this.isLoadingInitialData = true

                // Restore elements to store
                useElementsStore.getState().setElements(savedData.elements)

                // Clear flag after loading
                this.isLoadingInitialData = false

                logger.log('Loaded', savedData.elements.length, 'elements from storage')

                // Mark as loaded
                this.hasLoaded = true

                // Return canvas state for restoration
                return savedData.canvasState || null
            } else {
                logger.log('No saved data found')
                this.hasLoaded = true
                return null
            }
        } catch (error) {
            logger.error('Failed to load data:', error)
            this.isLoadingInitialData = false
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
        const data = this.collectData()
        logger.log('Manual save:', data.elements.length, 'elements')

        const result = await this.provider.save(data)

        if (result.success) {
            logger.log('Manual save successful')
        } else {
            logger.error('Manual save failed:', result.error)
        }

        return result
    }

    /**
     * Collect data from all stores for saving
     * @returns {Object} Data to save
     */
    collectData() {
        const elements = useElementsStore.getState().elements

        // Get current canvas state from refs if available
        const canvasState = {
            offset: this.offsetRef?.current || this.canvasOffset,
            zoom: this.zoomRef?.current || this.canvasZoom
        }

        return {
            elements,
            canvasState,
            timestamp: Date.now(),
            version: '1.0'
        }
    }

    /**
     * Clear all saved data
     * @returns {Promise<Object>} Clear result
     */
    async clear() {
        logger.log('Clearing saved data')
        const result = await this.provider.clear()

        if (result.success) {
            logger.log('Data cleared successfully')
        } else {
            logger.error('Failed to clear data:', result.error)
        }

        return result
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
