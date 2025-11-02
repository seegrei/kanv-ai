/**
 * LRU (Least Recently Used) cache with TTL (Time To Live) support
 * Automatically evicts oldest entries when max size is reached
 */
class RequestCache {
    constructor(maxSize = 100, ttl = 300000) {
        this.cache = new Map()
        this.maxSize = maxSize
        this.ttl = ttl // Time to live in milliseconds (default: 5 minutes)
    }

    /**
     * Get value from cache
     * @param {string} key - Cache key
     * @returns {any} Cached value or undefined if not found or expired
     */
    get(key) {
        const entry = this.cache.get(key)

        if (!entry) {
            return undefined
        }

        // Check if entry has expired
        if (this.isExpired(entry)) {
            this.cache.delete(key)
            return undefined
        }

        // Move to end (most recently used)
        this.cache.delete(key)
        this.cache.set(key, entry)

        return entry.value
    }

    /**
     * Set value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     */
    set(key, value) {
        // If key exists, delete it first to update position
        if (this.cache.has(key)) {
            this.cache.delete(key)
        }

        // If cache is full, remove least recently used (first) entry
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value
            this.cache.delete(firstKey)
        }

        // Add new entry with timestamp
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        })
    }

    /**
     * Check if cache has a valid entry for key
     * @param {string} key - Cache key
     * @returns {boolean} True if key exists and not expired
     */
    has(key) {
        const entry = this.cache.get(key)

        if (!entry) {
            return false
        }

        // Check if entry has expired
        if (this.isExpired(entry)) {
            this.cache.delete(key)
            return false
        }

        return true
    }

    /**
     * Check if cache entry has expired
     * @param {object} entry - Cache entry with timestamp
     * @returns {boolean} True if entry has expired
     */
    isExpired(entry) {
        if (!this.ttl) {
            return false
        }

        const age = Date.now() - entry.timestamp
        return age > this.ttl
    }

    /**
     * Clear all entries from cache
     */
    clear() {
        this.cache.clear()
    }

    /**
     * Get current cache size
     * @returns {number} Number of entries in cache
     */
    get size() {
        return this.cache.size
    }

    /**
     * Get cache statistics
     * @returns {object} Cache statistics
     */
    getStats() {
        const now = Date.now()
        let expiredCount = 0

        for (const entry of this.cache.values()) {
            if (this.isExpired(entry)) {
                expiredCount++
            }
        }

        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            expiredCount,
            validCount: this.cache.size - expiredCount,
            utilizationPercent: (this.cache.size / this.maxSize * 100).toFixed(2)
        }
    }
}

export default RequestCache
