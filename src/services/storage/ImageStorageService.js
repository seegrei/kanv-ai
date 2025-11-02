import { createLogger } from '../../utils/logger'
import { STORAGE } from '../../constants'

const logger = createLogger('ImageStorageService')

/**
 * IndexedDB-based storage service for images
 * Much more efficient than localStorage for binary data
 * Supports larger storage capacity and better performance
 */
class ImageStorageService {
    constructor() {
        this.dbName = STORAGE.INDEXED_DB.DB_NAME
        this.storeName = STORAGE.INDEXED_DB.IMAGES_STORE_NAME
        this.dbVersion = STORAGE.INDEXED_DB.DB_VERSION
        this.db = null
        this.initPromise = null
    }

    /**
     * Initialize IndexedDB
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        // Return existing init promise if already initializing
        if (this.initPromise) {
            return this.initPromise
        }

        // Return existing db if already initialized
        if (this.db) {
            return Promise.resolve(this.db)
        }

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion)

            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'))
            }

            request.onsuccess = (event) => {
                this.db = event.target.result
                resolve(this.db)
            }

            request.onupgradeneeded = (event) => {
                const db = event.target.result

                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName)
                }
            }
        })

        return this.initPromise
    }

    /**
     * Save image data to IndexedDB
     * Converts data URL to Blob for efficient storage
     * @param {string} id - Image ID
     * @param {string} dataUrl - Image data URL (data:image/...)
     * @returns {Promise<boolean>} Success status
     */
    async saveImage(id, dataUrl) {
        try {
            await this.init()

            // Convert data URL to Blob
            const blob = await this.dataUrlToBlob(dataUrl)

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite')
                const store = transaction.objectStore(this.storeName)
                const request = store.put(blob, id)

                request.onsuccess = () => resolve(true)
                request.onerror = () => reject(new Error('Failed to save image'))
            })
        } catch (error) {
            logger.error('Error saving image:', error)
            return false
        }
    }

    /**
     * Load image from IndexedDB
     * Returns Blob URL for efficient rendering
     * @param {string} id - Image ID
     * @returns {Promise<string|null>} Blob URL or null if not found
     */
    async loadImage(id) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readonly')
                const store = transaction.objectStore(this.storeName)
                const request = store.get(id)

                request.onsuccess = (event) => {
                    const blob = event.target.result

                    if (blob) {
                        // Create Blob URL for rendering
                        const blobUrl = URL.createObjectURL(blob)
                        resolve(blobUrl)
                    } else {
                        resolve(null)
                    }
                }

                request.onerror = () => reject(new Error('Failed to load image'))
            })
        } catch (error) {
            logger.error('Error loading image:', error)
            return null
        }
    }

    /**
     * Delete image from IndexedDB
     * @param {string} id - Image ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteImage(id) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite')
                const store = transaction.objectStore(this.storeName)
                const request = store.delete(id)

                request.onsuccess = () => resolve(true)
                request.onerror = () => reject(new Error('Failed to delete image'))
            })
        } catch (error) {
            logger.error('Error deleting image:', error)
            return false
        }
    }

    /**
     * Get all image IDs
     * @returns {Promise<Array<string>>} Array of image IDs
     */
    async getAllImageIds() {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readonly')
                const store = transaction.objectStore(this.storeName)
                const request = store.getAllKeys()

                request.onsuccess = (event) => {
                    resolve(event.target.result)
                }

                request.onerror = () => reject(new Error('Failed to get image IDs'))
            })
        } catch (error) {
            logger.error('Error getting image IDs:', error)
            return []
        }
    }

    /**
     * Convert data URL to Blob
     * @param {string} dataUrl - Data URL
     * @returns {Promise<Blob>}
     */
    async dataUrlToBlob(dataUrl) {
        return new Promise((resolve, reject) => {
            try {
                // Extract mime type and data
                const parts = dataUrl.split(',')
                const mimeMatch = parts[0].match(/:(.*?);/)
                const mime = mimeMatch ? mimeMatch[1] : 'image/png'
                const bstr = atob(parts[1])
                let n = bstr.length
                const u8arr = new Uint8Array(n)

                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n)
                }

                resolve(new Blob([u8arr], { type: mime }))
            } catch (error) {
                reject(error)
            }
        })
    }

    /**
     * Clone image with new ID
     * Useful for duplicating blocks with images
     * @param {string} sourceId - Source image ID
     * @param {string} targetId - Target image ID
     * @returns {Promise<boolean>} Success status
     */
    async cloneImage(sourceId, targetId) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite')
                const store = transaction.objectStore(this.storeName)

                // Get source image
                const getRequest = store.get(sourceId)

                getRequest.onsuccess = (event) => {
                    const blob = event.target.result

                    if (blob) {
                        // Save to new ID
                        const putRequest = store.put(blob, targetId)

                        putRequest.onsuccess = () => resolve(true)
                        putRequest.onerror = () => reject(new Error('Failed to clone image'))
                    } else {
                        resolve(false)
                    }
                }

                getRequest.onerror = () => reject(new Error('Failed to load source image'))
            })
        } catch (error) {
            logger.error('Error cloning image:', error)
            return false
        }
    }

    /**
     * Load image from IndexedDB as data URL
     * Useful for API requests that require base64 data
     * @param {string} id - Image ID
     * @returns {Promise<string|null>} Data URL or null if not found
     */
    async loadImageAsDataUrl(id) {
        try {
            await this.init()

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readonly')
                const store = transaction.objectStore(this.storeName)
                const request = store.get(id)

                request.onsuccess = (event) => {
                    const blob = event.target.result

                    if (blob) {
                        // Convert Blob to data URL
                        const reader = new FileReader()
                        reader.onload = () => {
                            resolve(reader.result)
                        }
                        reader.onerror = () => {
                            reject(new Error('Failed to convert blob to data URL'))
                        }
                        reader.readAsDataURL(blob)
                    } else {
                        resolve(null)
                    }
                }

                request.onerror = () => reject(new Error('Failed to load image'))
            })
        } catch (error) {
            logger.error('Error loading image as data URL:', error)
            return null
        }
    }

    /**
     * Cleanup blob URLs to prevent memory leaks
     * Call this when component unmounts or image is no longer needed
     * @param {string} blobUrl - Blob URL to revoke
     */
    revokeBlobUrl(blobUrl) {
        if (blobUrl && blobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(blobUrl)
        }
    }
}

// Create singleton instance
const imageStorageService = new ImageStorageService()

export default imageStorageService
