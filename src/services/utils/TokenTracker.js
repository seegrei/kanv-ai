import { useUsageStatsStore } from '../../store/useUsageStatsStore'

/**
 * Tracks token usage for API requests
 * Helps monitor and optimize API costs
 */
class TokenTracker {
    constructor() {
        this.usage = {
            totalTokens: 0,
            promptTokens: 0,
            completionTokens: 0,
            requestCount: 0
        }

        this.history = []
        this.maxHistorySize = 100
    }

    /**
     * Get current date in YYYY-MM-DD format
     */
    getCurrentDate() {
        const now = new Date()
        return now.toISOString().split('T')[0]
    }

    /**
     * Track token usage from API response
     * @param {object} response - API response with usage data
     * @param {string} model - Model name used
     * @param {string} type - Request type (text, image, etc.)
     */
    track(response, model = 'unknown', type = 'text') {
        // Extract usage from different response formats
        const usage = this.extractUsage(response)

        if (!usage) {
            return
        }

        // Update cumulative usage
        this.usage.totalTokens += usage.totalTokens || 0
        this.usage.promptTokens += usage.promptTokens || 0
        this.usage.completionTokens += usage.completionTokens || 0
        this.usage.requestCount++

        // Add to history
        this.addToHistory({
            timestamp: Date.now(),
            model,
            type,
            usage: {
                totalTokens: usage.totalTokens || 0,
                promptTokens: usage.promptTokens || 0,
                completionTokens: usage.completionTokens || 0
            }
        })

        // Save to usage statistics store (daily breakdown by model)
        const currentDate = this.getCurrentDate()
        const statsStore = useUsageStatsStore.getState()
        statsStore.addUsage(currentDate, model, usage.totalTokens || 0, usage.cost || 0)
    }

    /**
     * Extract usage data from API response
     * Handles different response formats
     * @param {object} response - API response
     * @returns {object|null} Usage data or null
     */
    extractUsage(response) {
        // OpenRouter format
        if (response?.usage) {
            const extracted = {
                totalTokens: response.usage.total_tokens || 0,
                promptTokens: response.usage.prompt_tokens || 0,
                completionTokens: response.usage.completion_tokens || 0
            }

            // Try to extract cost if available (OpenRouter may provide this)
            if (response.usage.cost !== undefined) {
                extracted.cost = response.usage.cost
            } else if (response.usage.total_cost !== undefined) {
                extracted.cost = response.usage.total_cost
            }

            return extracted
        }

        // Alternative format
        if (response?.choices?.[0]?.usage) {
            const usage = response.choices[0].usage
            const extracted = {
                totalTokens: usage.total_tokens || 0,
                promptTokens: usage.prompt_tokens || 0,
                completionTokens: usage.completion_tokens || 0
            }

            // Try to extract cost if available
            if (usage.cost !== undefined) {
                extracted.cost = usage.cost
            } else if (usage.total_cost !== undefined) {
                extracted.cost = usage.total_cost
            }

            return extracted
        }

        return null
    }

    /**
     * Add entry to history
     * @param {object} entry - History entry
     */
    addToHistory(entry) {
        this.history.push(entry)

        // Keep history size under limit
        if (this.history.length > this.maxHistorySize) {
            this.history.shift()
        }
    }

    /**
     * Get current cumulative usage
     * @returns {object} Usage statistics
     */
    getUsage() {
        return {
            ...this.usage
        }
    }

    /**
     * Reset all usage statistics
     */
    reset() {
        this.usage = {
            totalTokens: 0,
            promptTokens: 0,
            completionTokens: 0,
            requestCount: 0
        }
        this.history = []
    }
}

export default TokenTracker
