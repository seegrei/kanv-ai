import { create } from 'zustand'
import { createLogger } from '../utils/logger'
import { storageManager } from '../services/storage'

const logger = createLogger('useSettingsStore')

/**
 * Settings Store
 * Manages application settings with IndexedDB persistence
 */
export const useSettingsStore = create((set, get) => {
    return {
        // Settings
        openRouterApiKey: '',
        showStatistics: true,
        isSettingsOpen: false,
        isQuickMenuOpen: false,
        _isLoaded: false,
        _isLoading: false,

        // Load settings from IndexedDB
        loadSettings: async () => {
            const state = get()

            // Skip if already loaded or currently loading
            if (state._isLoaded) {
                logger.log('Settings already loaded, skipping')
                return
            }
            if (state._isLoading) {
                logger.log('Settings are currently loading, skipping duplicate request')
                return
            }

            // Mark as loading
            set({ _isLoading: true })

            try {
                const settings = await storageManager.loadAllSettings()
                if (settings && Object.keys(settings).length > 0) {
                    set({
                        openRouterApiKey: settings.openRouterApiKey || '',
                        showStatistics: settings.showStatistics !== false,
                        _isLoaded: true,
                        _isLoading: false
                    })
                    logger.log('Settings loaded from IndexedDB')
                } else {
                    set({ _isLoaded: true, _isLoading: false })
                }
            } catch (error) {
                logger.error('Failed to load settings from IndexedDB:', error)
                set({ _isLoaded: true, _isLoading: false })
            }
        },

        // Set OpenRouter API key
        setOpenRouterApiKey: async (apiKey) => {
            set({ openRouterApiKey: apiKey })
            try {
                await storageManager.saveSetting('openRouterApiKey', apiKey)
                logger.log('OpenRouter API key updated')
            } catch (error) {
                logger.error('Failed to save settings:', error)
            }
        },

        // Set show statistics
        setShowStatistics: async (show) => {
            set({ showStatistics: show })
            try {
                await storageManager.saveSetting('showStatistics', show)
                logger.log(`Statistics display ${show ? 'enabled' : 'disabled'}`)
            } catch (error) {
                logger.error('Failed to save settings:', error)
            }
        },

        // Open quick menu
        openQuickMenu: () => {
            set({ isQuickMenuOpen: true })
            logger.log('Quick menu opened')
        },

        // Close quick menu
        closeQuickMenu: () => {
            set({ isQuickMenuOpen: false })
            logger.log('Quick menu closed')
        },

        // Open settings dialog
        openSettings: () => {
            set({ isSettingsOpen: true, isQuickMenuOpen: false })
            logger.log('Settings opened')
        },

        // Close settings dialog
        closeSettings: () => {
            set({ isSettingsOpen: false })
            logger.log('Settings closed')
        }
    }
})

export default useSettingsStore
