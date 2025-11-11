import { createLogger } from '../../utils/logger'

const logger = createLogger('BaseAPIService')

/**
 * Base class for API services with retry logic, error handling and request management
 */
class BaseAPIService {
    constructor(apiKey, baseURL) {
        this.apiKey = apiKey
        this.baseURL = baseURL
        this.abortControllers = new Map()
    }

    /**
     * Make an HTTP request with retry logic and exponential backoff
     * @param {string} endpoint - API endpoint
     * @param {object} options - Fetch options
     * @param {number} maxRetries - Maximum retry attempts (default: 3)
     * @param {string} requestId - Optional request ID for cancellation
     * @returns {Promise<Response>}
     */
    async request(endpoint, options = {}, maxRetries = 3, requestId = null) {
        // Validate API key
        if (!this.apiKey || this.apiKey.trim() === '') {
            throw new Error('No API key configured. Please set your OpenRouter API key in Settings.')
        }

        const url = this.baseURL + endpoint
        let lastError = null

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Create abort controller for this request
                const abortController = new AbortController()
                if (requestId) {
                    this.abortControllers.set(requestId, abortController)
                }

                // Merge options with abort signal
                const requestOptions = {
                    ...options,
                    signal: abortController.signal,
                    headers: {
                        ...this.getHeaders(),
                        ...options.headers
                    }
                }

                const response = await fetch(url, requestOptions)

                // Clean up abort controller
                if (requestId) {
                    this.abortControllers.delete(requestId)
                }

                // If successful, return response
                if (response.ok) {
                    return response
                }

                // Handle non-2xx responses
                const errorData = await response.json().catch(() => ({}))
                const error = new Error(
                    errorData.error?.message ||
                    `HTTP ${response.status}: ${response.statusText}`
                )
                error.response = response
                error.data = errorData

                // Don't retry on client errors (4xx)
                if (response.status >= 400 && response.status < 500) {
                    throw error
                }

                lastError = error
            } catch (error) {
                // Clean up abort controller on error
                if (requestId) {
                    this.abortControllers.delete(requestId)
                }

                // Don't retry on abort
                if (error.name === 'AbortError') {
                    throw error
                }

                lastError = error

                // If we have retries left, wait before retrying
                if (attempt < maxRetries) {
                    const delay = this.getRetryDelay(attempt)
                    await this.sleep(delay)
                    continue
                }
            }
        }

        // All retries exhausted
        throw this.handleError(lastError)
    }

    /**
     * Calculate exponential backoff delay
     * @param {number} attempt - Current attempt number
     * @returns {number} Delay in milliseconds
     */
    getRetryDelay(attempt) {
        // Exponential backoff: 1s, 2s, 4s
        return Math.min(1000 * Math.pow(2, attempt), 8000)
    }

    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    /**
     * Get default headers for requests
     * @returns {object} Headers object
     */
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.apiKey?.trim() || ''}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
            'X-Title': 'kanv.ai'
        }
    }

    /**
     * Handle and format errors
     * @param {Error} error - Error to handle
     * @returns {Error} Formatted error
     */
    handleError(error) {
        logger.error('API Error:', error)

        // Add more context to the error
        if (error.response) {
            error.message = `API request failed: ${error.message}`
        } else if (error.name === 'AbortError') {
            error.message = 'Request was cancelled'
        } else if (!navigator.onLine) {
            error.message = 'No internet connection'
        }

        return error
    }
}

export default BaseAPIService
