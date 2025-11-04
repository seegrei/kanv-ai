import { create } from 'zustand'
import { createLogger } from '../utils/logger'
import { STORAGE, STATISTICS } from '../constants'

const logger = createLogger('useUsageStatsStore')

const STORAGE_KEY = STORAGE.KEYS.STATISTICS

// Get current date in YYYY-MM-DD format
const getCurrentDate = () => {
    const now = new Date()
    return now.toISOString().split('T')[0]
}

// Load statistics from localStorage
const loadStatistics = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            return JSON.parse(stored)
        }
    } catch (error) {
        logger.error('Failed to load statistics from localStorage:', error)
    }
    return { data: {}, showStatistics: true }
}

// Save statistics to localStorage
const saveStatistics = (statistics) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(statistics))
    } catch (error) {
        logger.error('Failed to save statistics to localStorage:', error)
    }
}

// Cleanup old data (keep only last N days)
const cleanupOldData = (data) => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - STATISTICS.HISTORY_DAYS)
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

    const cleaned = {}
    for (const date in data) {
        if (date >= cutoffDateStr) {
            cleaned[date] = data[date]
        }
    }
    return cleaned
}

/**
 * Usage Statistics Store
 * Manages token/money usage statistics with localStorage persistence
 *
 * Data structure:
 * {
 *   data: {
 *     "2025-11-04": {
 *       "openai/gpt-4o": { tokens: 1500, cost: 0.045, requests: 3 },
 *       "anthropic/claude-sonnet-4.5": { tokens: 2000, cost: 0.060, requests: 2 }
 *     }
 *   },
 *   showStatistics: true
 * }
 */
export const useUsageStatsStore = create((set, get) => {
    const initialData = loadStatistics()

    return {
        // Statistics data
        data: initialData.data || {},
        showStatistics: initialData.showStatistics !== false,

        // Add usage for a specific date and model
        addUsage: (date, model, tokens, cost = 0) => {
            const state = get()
            const newData = { ...state.data }

            // Initialize date if not exists
            if (!newData[date]) {
                newData[date] = {}
            }

            // Initialize model for this date if not exists
            if (!newData[date][model]) {
                newData[date][model] = { tokens: 0, cost: 0, requests: 0 }
            }

            // Add to existing values
            newData[date][model].tokens += tokens
            newData[date][model].cost += cost
            newData[date][model].requests += 1

            // Cleanup old data
            const cleanedData = cleanupOldData(newData)

            set({ data: cleanedData })
            saveStatistics({ data: cleanedData, showStatistics: state.showStatistics })

            logger.log(`Added usage for ${model}: ${tokens} tokens, $${cost.toFixed(4)}`)
        },

        // Get today's aggregated usage across all models
        getTodayUsage: () => {
            const state = get()
            const today = getCurrentDate()
            const todayData = state.data[today]

            if (!todayData) {
                return { tokens: 0, cost: 0, requests: 0 }
            }

            let totalTokens = 0
            let totalCost = 0
            let totalRequests = 0

            for (const model in todayData) {
                totalTokens += todayData[model].tokens
                totalCost += todayData[model].cost
                totalRequests += todayData[model].requests
            }

            return { tokens: totalTokens, cost: totalCost, requests: totalRequests }
        },

        // Get usage for a specific date
        getUsageByDate: (date) => {
            const state = get()
            return state.data[date] || {}
        },

        // Get all historical data
        getAllData: () => {
            return get().data
        },

        // Toggle statistics display
        setShowStatistics: (show) => {
            const state = get()
            set({ showStatistics: show })
            saveStatistics({ data: state.data, showStatistics: show })
            logger.log(`Statistics display ${show ? 'enabled' : 'disabled'}`)
        },

        // Clear all statistics
        clearStatistics: () => {
            const state = get()
            set({ data: {} })
            saveStatistics({ data: {}, showStatistics: state.showStatistics })
            logger.log('Statistics cleared')
        }
    }
})

export default useUsageStatsStore
