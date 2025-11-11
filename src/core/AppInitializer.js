import { createLogger } from '../utils/logger'
import { registerBlocks } from './RegisterBlocks'
import { initializeBlockActions } from './blockActions.jsx'
import { storageManager } from '../services/storage'
import '../services/analytics/AnalyticsService'

const logger = createLogger('AppInitializer')

/**
 * Application Initializer
 * Singleton pattern for one-time initialization of the entire application
 * Ensures that core services are initialized only once regardless of React re-renders
 */
class AppInitializer {
    constructor() {
        this.isInitialized = false
        this.isInitializing = false
        this.initPromise = null
    }

    /**
     * Initialize all core application services
     * This method can be called multiple times safely - it will only execute once
     * @returns {Promise<void>}
     */
    async init() {
        // Return existing promise if already initializing
        if (this.isInitializing && this.initPromise) {
            logger.log('Already initializing, returning existing promise')
            return this.initPromise
        }

        // Skip if already initialized
        if (this.isInitialized) {
            logger.log('Already initialized, skipping')
            return
        }

        // Mark as initializing
        this.isInitializing = true

        // Create initialization promise
        this.initPromise = this._performInit()

        try {
            await this.initPromise
            this.isInitialized = true
            logger.log('Application initialization completed')
        } catch (error) {
            logger.error('Application initialization failed:', error)
            throw error
        } finally {
            this.isInitializing = false
            this.initPromise = null
        }
    }

    /**
     * Perform actual initialization
     * @private
     */
    async _performInit() {
        logger.log('Starting application initialization...')

        // 1. Register block types
        registerBlocks()

        // 2. Initialize block actions
        initializeBlockActions()

        // 3. Analytics is auto-initialized via import

        logger.log('Core services initialized')
    }

    /**
     * Initialize StorageManager with canvas refs
     * This is separate because it depends on Canvas component being mounted
     * @param {Object} offsetRef - Canvas offset ref
     * @param {Object} zoomRef - Canvas zoom ref
     */
    initStorage(offsetRef, zoomRef) {
        if (!storageManager.isInitialized) {
            storageManager.init(offsetRef, zoomRef)
            logger.log('StorageManager initialized')
        } else {
            logger.log('StorageManager already initialized, skipping')
        }
    }

    /**
     * Check if application is initialized
     * @returns {boolean}
     */
    isAppInitialized() {
        return this.isInitialized
    }

    /**
     * Reset initialization state (for testing purposes only)
     * @private
     */
    _reset() {
        this.isInitialized = false
        this.isInitializing = false
        this.initPromise = null
    }
}

// Export singleton instance
export const appInitializer = new AppInitializer()

// Auto-initialize on module load (for HMR support)
if (import.meta.hot) {
    // In development, handle HMR
    import.meta.hot.accept(() => {
        logger.log('HMR: Module reloaded')
    })
}

export default appInitializer
