import { create } from 'zustand'
import { createLogger } from '../utils/logger'
import { storageManager } from '../services/storage'
import { STATISTICS } from '../constants'

const logger = createLogger('useUsageStatsStore')

// Get current date in YYYY-MM-DD format
const getCurrentDate = () => {
    const now = new Date()
    return now.toISOString().split('T')[0]
}

// Debounce timer for saving
let saveDebounceTimer = null

// Save statistics to IndexedDB with debounce
const debouncedSaveDailyStats = (date, stats) => {
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer)
    }

    saveDebounceTimer = setTimeout(async () => {
        try {
            await storageManager.saveDailyStats(date, stats)
        } catch (error) {
            logger.error('Failed to save statistics to IndexedDB:', error)
        }
    }, STATISTICS.UPDATE_DEBOUNCE)
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
 * Manages token/money usage statistics with IndexedDB persistence
 *
 * Data structure:
 * {
 *   "2025-11-04": {
 *     "openai/gpt-4o": { tokens: 1500, cost: 0.045, requests: 3 },
 *     "anthropic/claude-sonnet-4.5": { tokens: 2000, cost: 0.060, requests: 2 }
 *   },
 *   "2025-11-05": { ... }
 * }
 */
export const useUsageStatsStore = create((set, get) => {
    return {
        // Statistics data
        data: {},
        _isLoaded: false,
        _isLoading: false,

        // Load statistics from IndexedDB
        loadStatistics: async () => {
            const state = get()

            // Skip if already loaded or currently loading
            if (state._isLoaded) {
                logger.log('Statistics already loaded, skipping')
                return
            }
            if (state._isLoading) {
                logger.log('Statistics are currently loading, skipping duplicate request')
                return
            }

            // Mark as loading
            set({ _isLoading: true })

            try {
                const statistics = await storageManager.loadAllStatistics()
                if (statistics && Object.keys(statistics).length > 0) {
                    set({
                        data: statistics,
                        _isLoaded: true,
                        _isLoading: false
                    })
                    logger.log('Statistics loaded from IndexedDB')
                } else {
                    set({ _isLoaded: true, _isLoading: false })
                }
            } catch (error) {
                logger.error('Failed to load statistics from IndexedDB:', error)
                set({ _isLoaded: true, _isLoading: false })
            }
        },

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

            // Save only the updated date
            debouncedSaveDailyStats(date, cleanedData[date])

            // Delete old dates from IndexedDB
            for (const d in state.data) {
                if (!cleanedData[d]) {
                    storageManager.deleteDailyStats(d).catch(error => {
                        logger.error(`Failed to delete old statistics for ${d}:`, error)
                    })
                }
            }

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

        // Clear all statistics
        clearStatistics: async () => {
            const state = get()
            const dates = Object.keys(state.data)

            set({ data: {} })

            // Delete all dates from IndexedDB
            try {
                await Promise.all(
                    dates.map(date => storageManager.deleteDailyStats(date))
                )
                logger.log('Statistics cleared')
            } catch (error) {
                logger.error('Failed to clear statistics:', error)
            }
        }
    }
})

export default useUsageStatsStore
