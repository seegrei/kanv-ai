import { create } from 'zustand'
import { createLogger } from '../utils/logger'
import { STORAGE } from '../constants'

const logger = createLogger('useSettingsStore')

const STORAGE_KEY = STORAGE.KEYS.SETTINGS

// Load settings from localStorage
const loadSettings = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            return JSON.parse(stored)
        }
    } catch (error) {
        logger.error('Failed to load settings from localStorage:', error)
    }
    return {}
}

// Save settings to localStorage
const saveSettings = (settings) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
        logger.error('Failed to save settings to localStorage:', error)
    }
}

/**
 * Settings Store
 * Manages application settings with localStorage persistence
 */
export const useSettingsStore = create((set, get) => {
    const initialSettings = loadSettings()

    return {
        // Settings
        openRouterApiKey: initialSettings.openRouterApiKey || '',
        isSettingsOpen: false,

        // Set OpenRouter API key
        setOpenRouterApiKey: (apiKey) => {
            set({ openRouterApiKey: apiKey })
            const settings = { ...loadSettings(), openRouterApiKey: apiKey }
            saveSettings(settings)
            logger.log('OpenRouter API key updated')
        },

        // Open settings dialog
        openSettings: () => {
            set({ isSettingsOpen: true })
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
