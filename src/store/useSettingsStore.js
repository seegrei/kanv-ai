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
        isSidebarCollapsed: false,
        _isLoaded: false,
        _isLoading: false,

        // Load settings from IndexedDB
        loadSettings: async () => {
            const state = get()

            // Skip if already loaded or currently loading
            if (state._isLoaded) {
                return
            }
            if (state._isLoading) {
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
            // Trim the key to remove leading/trailing whitespace
            const trimmedKey = apiKey?.trim() || ''
            set({ openRouterApiKey: trimmedKey })
            try {
                await storageManager.saveSetting('openRouterApiKey', trimmedKey)
            } catch (error) {
                logger.error('Failed to save settings:', error)
            }
        },

        // Set show statistics
        setShowStatistics: async (show) => {
            set({ showStatistics: show })
            try {
                await storageManager.saveSetting('showStatistics', show)
            } catch (error) {
                logger.error('Failed to save settings:', error)
            }
        },

        // Toggle sidebar collapsed state
        toggleSidebar: () => {
            const newState = !get().isSidebarCollapsed
            set({ isSidebarCollapsed: newState })
        }
    }
})

export default useSettingsStore
