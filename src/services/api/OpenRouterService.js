import { createLogger } from '../../utils/logger'
import BaseAPIService from './BaseAPIService'
import RequestCache from '../utils/RequestCache'
import TokenTracker from '../utils/TokenTracker'
import { storageManager } from '../storage'

const logger = createLogger('OpenRouterService')

class OpenRouterService extends BaseAPIService {
    constructor(apiKey) {
        super(apiKey, 'https://openrouter.ai/api/v1')
        this.textCache = new RequestCache(100, 300000) // 100 entries, 5 min TTL
        this.imageCache = new RequestCache(50, 600000) // 50 entries, 10 min TTL
        this.tokenTracker = new TokenTracker()
    }

    /**
     * Generate text content with streaming support
     * @param {string} prompt - User prompt
     * @param {string} model - Model to use
     * @param {string} currentContent - Current block content for context
     * @param {function} onChunk - Callback for streaming chunks
     * @returns {Promise<string>} Generated text
     */
    async generateText(prompt, model, currentContent = '', onChunk = null) {
        // Create cache key
        const cacheKey = this.createTextCacheKey(prompt, model, currentContent)

        // Check cache for non-streaming requests
        if (!onChunk && this.textCache.has(cacheKey)) {
            return this.textCache.get(cacheKey)
        }

        const messages = this.buildMessages(prompt, currentContent)

        try {
            const response = await this.request('/chat/completions', {
                method: 'POST',
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 8000,
                    stream: true,
                    usage: { include: true }
                })
            })

            const result = await this.processStreamResponse(response, onChunk)
            const generatedText = result.text

            // Track token usage from actual API response or use estimates
            if (result.usage) {
                this.tokenTracker.track({ usage: result.usage }, model, 'text')
            } else {
                // Fallback to estimated token usage if usage data not available
                this.tokenTracker.track({
                    usage: {
                        total_tokens: this.estimateTokens(prompt + currentContent + generatedText),
                        prompt_tokens: this.estimateTokens(prompt + currentContent),
                        completion_tokens: this.estimateTokens(generatedText)
                    }
                }, model, 'text')
            }

            // Cache result for non-streaming requests
            if (!onChunk) {
                this.textCache.set(cacheKey, generatedText)
            }

            return generatedText
        } catch (error) {
            logger.error('Error generating text:', error)
            throw error
        }
    }

    /**
     * Generate image from prompt
     * @param {string} prompt - User prompt
     * @param {string} model - Model to use
     * @param {string} currentImageData - Current image ID or data URL for context
     * @returns {Promise<string>} Generated image URL
     */
    async generateImage(prompt, model, currentImageData = '') {
        // Convert imageId to data URL if needed
        let imageDataUrl = currentImageData
        if (currentImageData && currentImageData.startsWith('img_')) {
            // This is an imageId, load from IndexedDB
            try {
                imageDataUrl = await storageManager.loadImageAsDataUrl(currentImageData)
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
        const cacheKey = this.createImageCacheKey(prompt, model, imageDataUrl)

        // Check cache
        if (this.imageCache.has(cacheKey)) {
            return this.imageCache.get(cacheKey)
        }

        try {
            const messages = this.buildImageMessages(prompt, imageDataUrl)

            const response = await this.request('/chat/completions', {
                method: 'POST',
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    usage: { include: true }
                })
            })

            const data = await response.json()

            // Extract image URL from response
            const imageUrl = this.extractImageUrl(data)

            // Track token usage
            this.tokenTracker.track(data, model, 'image')

            // Cache result
            this.imageCache.set(cacheKey, imageUrl)

            return imageUrl
        } catch (error) {
            logger.error('Error generating image:', error)
            throw error
        }
    }

    /**
     * Build messages array for text generation
     * @param {string} prompt - User prompt
     * @param {string} currentContent - Current content for context
     * @returns {array} Messages array
     */
    buildMessages(prompt, currentContent) {
        const messages = []

        // Add system prompt for HTML formatting
        messages.push({
            role: 'system',
            content: 'You must always generate responses in HTML format. Use proper HTML tags for formatting text, including <h1>, <h2>, <h3> for headers, <ul>, <ol>, <li> for lists, <p> for paragraphs, <strong> for bold, <em> for italic, <code> for inline code, <pre><code> for code blocks, and other HTML elements. Do not wrap the content in a full HTML document structure (no <html>, <head>, <body> tags), just return the content HTML.'
        })

        // Add context if current content exists
        if (currentContent && currentContent.trim()) {
            messages.push({
                role: 'system',
                content: `Current block content:\n${currentContent}`
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
     * Build messages array for image generation
     * @param {string} prompt - User prompt
     * @param {string} currentImageData - Current image data URL
     * @returns {array} Messages array
     */
    buildImageMessages(prompt, currentImageData) {
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
     * Process streaming response
     * @param {Response} response - Fetch response
     * @param {function} onChunk - Callback for chunks
     * @returns {Promise<object>} Object with generated text and usage data
     */
    async processStreamResponse(response, onChunk) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let generatedText = ''
        let usageData = null

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n').filter(line => line.trim() !== '')

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6)
                    if (data === '[DONE]') continue

                    try {
                        const parsed = JSON.parse(data)
                        const content = parsed.choices?.[0]?.delta?.content

                        if (content) {
                            generatedText += content
                            if (onChunk) {
                                onChunk(generatedText)
                            }
                        }

                        // Capture usage data from the last chunk
                        if (parsed.usage) {
                            usageData = parsed.usage
                        }
                    } catch (e) {
                        // Skip invalid JSON lines
                        logger.warn('Failed to parse SSE data:', e)
                    }
                }
            }
        }

        if (!generatedText || generatedText.trim() === '') {
            throw new Error('No content generated. The model may have returned an empty response.')
        }

        return { text: generatedText, usage: usageData }
    }

    /**
     * Create cache key for text generation
     * @param {string} prompt - User prompt
     * @param {string} model - Model name
     * @param {string} currentContent - Current content
     * @returns {string} Cache key
     */
    createTextCacheKey(prompt, model, currentContent) {
        return `text:${model}:${prompt}:${currentContent.substring(0, 100)}`
    }

    /**
     * Create cache key for image generation
     * @param {string} prompt - User prompt
     * @param {string} model - Model name
     * @param {string} currentImageData - Current image data
     * @returns {string} Cache key
     */
    createImageCacheKey(prompt, model, currentImageData) {
        const imageHash = currentImageData ? currentImageData.substring(0, 50) : 'none'
        return `image:${model}:${prompt}:${imageHash}`
    }

    /**
     * Estimate token count (rough approximation)
     * @param {string} text - Text to estimate
     * @returns {number} Estimated token count
     */
    estimateTokens(text) {
        // Rough estimate: ~4 characters per token
        return Math.ceil(text.length / 4)
    }
}

export default OpenRouterService
