import { createLogger } from '../../utils/logger'
import BaseAPIService from './BaseAPIService'
import RequestCache from '../utils/RequestCache'
import TokenTracker from '../utils/TokenTracker'
import imageStorageService from '../storage/ImageStorageService'

const logger = createLogger('ImageGenerationService')

class ImageGenerationService extends BaseAPIService {
    constructor(apiKey) {
        super(apiKey, 'https://openrouter.ai/api/v1')
        this.cache = new RequestCache(50, 600000) // 50 entries, 10 min TTL
        this.tokenTracker = new TokenTracker()
    }

    /**
     * Generate image from prompt
     * @param {string} prompt - User prompt
     * @param {string} model - Model to use
     * @param {string} currentImageData - Current image ID or data URL for context
     * @returns {Promise<string>} Generated image URL
     */
    async generate(prompt, model, currentImageData = '') {
        // Convert imageId to data URL if needed
        let imageDataUrl = currentImageData
        if (currentImageData && currentImageData.startsWith('img_')) {
            // This is an imageId, load from IndexedDB
            try {
                imageDataUrl = await imageStorageService.loadImageAsDataUrl(currentImageData)
                if (!imageDataUrl) {
                    logger.warn(`Image not found in storage: ${currentImageData}`)
                    imageDataUrl = ''
                }
            } catch (error) {
                logger.error('Error loading image from storage:', error)
                imageDataUrl = ''
            }
        }

        // Create cache key
        const cacheKey = this.createCacheKey(prompt, model, imageDataUrl)

        // Check cache
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)
        }

        try {
            const messages = this.buildMessages(prompt, imageDataUrl)

            const response = await this.request('/chat/completions', {
                method: 'POST',
                body: JSON.stringify({
                    model: model,
                    messages: messages
                })
            })

            const data = await response.json()

            // Extract image URL from response
            const imageUrl = this.extractImageUrl(data)

            // Track token usage
            this.tokenTracker.track(data, model, 'image')

            // Cache result
            this.cache.set(cacheKey, imageUrl)

            return imageUrl
        } catch (error) {
            logger.error('Error generating image:', error)
            throw error
        }
    }

    /**
     * Build messages array for API request
     * @param {string} prompt - User prompt
     * @param {string} currentImageData - Current image data URL
     * @returns {array} Messages array
     */
    buildMessages(prompt, currentImageData) {
        const messages = []

        // If there's a current image, add it as context
        if (currentImageData && currentImageData.trim()) {
            messages.push({
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: {
                            url: currentImageData
                        }
                    },
                    {
                        type: 'text',
                        text: 'This is the current image in the selected block.'
                    }
                ]
            })
        }

        // Add user prompt
        messages.push({
            role: 'user',
            content: prompt
        })

        return messages
    }

    /**
     * Extract image URL from API response
     * Handles multiple response formats
     * @param {object} data - API response data
     * @returns {string} Image URL
     */
    extractImageUrl(data) {
        // Check if response contains image URL
        if (data.choices && data.choices[0]) {
            const message = data.choices[0].message

            // Check for images array in message (this is the format OpenRouter uses)
            if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
                const imageData = message.images[0]
                if (imageData.image_url?.url) {
                    return imageData.image_url.url
                }
            }

            // Check for image_url in content parts (some models return this format)
            if (message?.content && Array.isArray(message.content)) {
                for (const part of message.content) {
                    if (part.type === 'image_url' && part.image_url?.url) {
                        return part.image_url.url
                    }
                }
            }

            // Check for content property with URL
            if (message?.content && typeof message.content === 'string') {
                const content = message.content

                // Try to extract image URL from content
                // Check if content is a URL
                const urlMatch = content.match(/(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/i)
                if (urlMatch) {
                    return urlMatch[0]
                }

                // Check if content contains markdown image
                const markdownMatch = content.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/)
                if (markdownMatch) {
                    return markdownMatch[1]
                }

                // If content is just a URL without extension
                const simpleUrlMatch = content.match(/(https?:\/\/[^\s]+)/i)
                if (simpleUrlMatch) {
                    return simpleUrlMatch[0]
                }
            }

            // Check if there's a data field with image info
            if (data.data && Array.isArray(data.data) && data.data[0]?.url) {
                return data.data[0].url
            }
        }

        throw new Error('No image URL found in API response')
    }

    /**
     * Create cache key from request parameters
     * @param {string} prompt - User prompt
     * @param {string} model - Model name
     * @param {string} currentImageData - Current image data
     * @returns {string} Cache key
     */
    createCacheKey(prompt, model, currentImageData) {
        const imageHash = currentImageData ? currentImageData.substring(0, 50) : 'none'
        return `${model}:${prompt}:${imageHash}`
    }
}

export default ImageGenerationService
