import { useState, useEffect, useRef } from 'react'
import { createLogger } from '../utils/logger'
import imageStorageService from '../services/storage/ImageStorageService'

const logger = createLogger('useImageStorage')

/**
 * Hook for managing image storage with IndexedDB
 * Automatically handles conversion between data URLs and blob URLs
 * Manages lifecycle and prevents memory leaks
 *
 * @param {string} imageId - Unique image ID
 * @param {string} initialImageData - Initial image data (data URL or blob URL)
 * @returns {Object} { imageUrl, isLoading, saveImage, updateImage }
 */
const useImageStorage = (imageId, initialImageData) => {
    const [imageUrl, setImageUrl] = useState(initialImageData || '')
    const [isLoading, setIsLoading] = useState(false)
    const blobUrlRef = useRef(null)

    /**
     * Check if data is a data URL
     */
    const isDataUrl = (data) => {
        return data && typeof data === 'string' && data.startsWith('data:')
    }

    /**
     * Check if data is a blob URL
     */
    const isBlobUrl = (data) => {
        return data && typeof data === 'string' && data.startsWith('blob:')
    }

    /**
     * Load image from IndexedDB when imageId changes
     */
    useEffect(() => {
        const loadImage = async () => {
            // Skip if no image ID
            if (!imageId) {
                // Cleanup previous blob URL if exists
                if (blobUrlRef.current) {
                    imageStorageService.revokeBlobUrl(blobUrlRef.current)
                    blobUrlRef.current = null
                }
                setImageUrl('')
                return
            }

            // Cleanup previous blob URL before loading new one
            if (blobUrlRef.current) {
                imageStorageService.revokeBlobUrl(blobUrlRef.current)
                blobUrlRef.current = null
            }

            setIsLoading(true)
            try {
                // If initial data is a data URL, save to IndexedDB first
                if (initialImageData && isDataUrl(initialImageData)) {
                    await imageStorageService.saveImage(imageId, initialImageData)
                }

                // Load blob URL from IndexedDB
                const blobUrl = await imageStorageService.loadImage(imageId)
                if (blobUrl) {
                    blobUrlRef.current = blobUrl
                    setImageUrl(blobUrl)
                } else if (initialImageData) {
                    // Fallback to initial data if IndexedDB doesn't have it
                    setImageUrl(initialImageData)
                }
            } catch (error) {
                logger.error('Error loading image:', error)
                // Fallback to initial data if available
                if (initialImageData) {
                    setImageUrl(initialImageData)
                }
            } finally {
                setIsLoading(false)
            }
        }

        loadImage()
    }, [imageId, initialImageData])

    /**
     * Save new image data
     * @param {string} data - Image data URL
     * @returns {Promise<string>} Blob URL
     */
    const saveImage = async (data) => {
        if (!imageId || !data) return ''

        setIsLoading(true)
        try {
            // Revoke previous blob URL if exists
            if (blobUrlRef.current) {
                imageStorageService.revokeBlobUrl(blobUrlRef.current)
                blobUrlRef.current = null
            }

            // Save to IndexedDB
            await imageStorageService.saveImage(imageId, data)

            // Load blob URL
            const blobUrl = await imageStorageService.loadImage(imageId)
            if (blobUrl) {
                blobUrlRef.current = blobUrl
                setImageUrl(blobUrl)
                return blobUrl
            } else {
                // Fallback to data URL
                setImageUrl(data)
                return data
            }
        } catch (error) {
            logger.error('Error saving image:', error)
            // Fallback to data URL
            setImageUrl(data)
            return data
        } finally {
            setIsLoading(false)
        }
    }

    /**
     * Update image with new data
     * @param {string} newData - New image data URL
     * @returns {Promise<string>} Blob URL
     */
    const updateImage = async (newData) => {
        return await saveImage(newData)
    }

    /**
     * Cleanup blob URLs on unmount
     */
    useEffect(() => {
        return () => {
            if (blobUrlRef.current) {
                imageStorageService.revokeBlobUrl(blobUrlRef.current)
                blobUrlRef.current = null
            }
        }
    }, [])

    return {
        imageUrl,
        isLoading,
        saveImage,
        updateImage
    }
}

export default useImageStorage
