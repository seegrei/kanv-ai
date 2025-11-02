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
            return {
                totalTokens: response.usage.total_tokens || 0,
                promptTokens: response.usage.prompt_tokens || 0,
                completionTokens: response.usage.completion_tokens || 0
            }
        }

        // Alternative format
        if (response?.choices?.[0]?.usage) {
            const usage = response.choices[0].usage
            return {
                totalTokens: usage.total_tokens || 0,
                promptTokens: usage.prompt_tokens || 0,
                completionTokens: usage.completion_tokens || 0
            }
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
