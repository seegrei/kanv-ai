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
     * Generate text with chat history context
     * @param {Array} chatHistory - Array of previous messages [{type: 'user'|'assistant', content: string, model: string}]
     * @param {string} newPrompt - New user prompt
     * @param {string} model - Model to use
     * @param {string} currentContent - Current block content for context
     * @param {string} blockType - Type of the block ('text' or 'image')
     * @param {function} onChunk - Callback for streaming chunks
     * @returns {Promise<string>} Generated text
     */
    async generateTextWithHistory(chatHistory, newPrompt, model, currentContent = '', blockType = 'text', onChunk = null) {
        // For text generation, include images as image_url if blockType is 'image' (vision models)
        // Otherwise, images in history will be represented as text placeholders
        const includeImages = blockType === 'image'
        const messages = await this.buildMessagesWithHistory(chatHistory, newPrompt, currentContent, blockType, includeImages)

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

            // Track token usage
            if (result.usage) {
                this.tokenTracker.track({ usage: result.usage }, model, 'text')
            } else {
                this.tokenTracker.track({
                    usage: {
                        total_tokens: this.estimateTokens(newPrompt + generatedText),
                        prompt_tokens: this.estimateTokens(newPrompt),
                        completion_tokens: this.estimateTokens(generatedText)
                    }
                }, model, 'text')
            }

            return generatedText
        } catch (error) {
            logger.error('Error generating text with history:', error)
            throw error
        }
    }

    /**
     * Generate image from prompt
     * @param {string} prompt - User prompt
     * @param {string} model - Model to use
     * @param {string} currentContent - Current block content (imageId for image blocks, HTML for text blocks)
     * @param {string} blockType - Type of the block ('text' or 'image')
     * @param {Array} chatHistory - Array of previous messages for context
     * @returns {Promise<string>} Generated image URL
     */
    async generateImage(prompt, model, currentContent = '', blockType = 'image', chatHistory = []) {
        let imageDataUrl = ''
        let textContext = ''

        // Handle content based on block type
        if (blockType === 'image' && currentContent) {
            // This is an image block - currentContent is imageId
            // Check if currentContent is an imageId (not a data URL or HTTP URL)
            if (!currentContent.startsWith('data:') && !currentContent.startsWith('http://') && !currentContent.startsWith('https://')) {
                // This is an imageId, load from IndexedDB
                try {
                    imageDataUrl = await storageManager.loadImageAsDataUrl(currentContent)
                    if (!imageDataUrl) {
                        imageDataUrl = ''
                    }
                } catch (error) {
                    logger.error('Error loading image from storage:', error)
                    imageDataUrl = ''
                }
            } else {
                imageDataUrl = currentContent
            }
        } else if (blockType === 'text' && currentContent && currentContent.trim()) {
            // This is a text block - currentContent is HTML text
            // Use it as text context for image generation
            textContext = currentContent
        }

        // Create cache key
        const cacheKey = this.createImageCacheKey(prompt, model, imageDataUrl + textContext)

        // Check cache
        if (this.imageCache.has(cacheKey)) {
            return this.imageCache.get(cacheKey)
        }

        try {
            const messages = await this.buildImageMessagesWithHistory(chatHistory, prompt, imageDataUrl, textContext)

            const response = await this.request('/chat/completions', {
                method: 'POST',
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    modalities: ['image', 'text'],
                    max_tokens: 1000,
                    temperature: 0.7,
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
     * Build messages array with chat history for context
     * Includes both text and images from chat history
     * @param {Array} chatHistory - Array of previous messages
     * @param {string} newPrompt - New user prompt
     * @param {string} currentContent - Current block content for context
     * @param {string} blockType - Type of the block ('text' or 'image')
     * @param {boolean} includeImages - Whether to include images as image_url (for vision models) or as text placeholders
     * @returns {Promise<array>} Messages array
     */
    async buildMessagesWithHistory(chatHistory, newPrompt, currentContent = '', blockType = 'text', includeImages = false) {
        const messages = []

        // Add system prompt for HTML formatting
        messages.push({
            role: 'system',
            content: 'You must always generate responses in HTML format. Use proper HTML tags for formatting text, including <h1>, <h2>, <h3> for headers, <ul>, <ol>, <li> for lists, <p> for paragraphs, <strong> for bold, <em> for italic, <code> for inline code, <pre><code> for code blocks, and other HTML elements. Do not wrap the content in a full HTML document structure (no <html>, <head>, <body> tags), just return the content HTML.'
        })

        // Add context based on block type
        if (blockType === 'text' && currentContent && currentContent.trim()) {
            // Text block - add HTML content as text context
            messages.push({
                role: 'system',
                content: `Current block content:\n${currentContent}`
            })
        } else if (blockType === 'image' && currentContent && includeImages) {
            // Image block - add image as image_url for vision models
            try {
                // Check if currentContent is an imageId (not a data URL or HTTP URL)
                let imageDataUrl = currentContent
                if (!currentContent.startsWith('data:') && !currentContent.startsWith('http://') && !currentContent.startsWith('https://')) {
                    imageDataUrl = await storageManager.loadImageAsDataUrl(currentContent)
                }

                if (imageDataUrl) {
                    messages.push({
                        role: 'user',
                        content: [
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageDataUrl
                                }
                            },
                            {
                                type: 'text',
                                text: 'This is the current image in the selected block'
                            }
                        ]
                    })
                }
            } catch (error) {
                logger.error('Error loading image from current block:', error)
            }
        }

        // Add chat history with both text and images
        for (const msg of chatHistory) {
            if (msg.type === 'user') {
                // User text message
                messages.push({
                    role: 'user',
                    content: msg.content
                })
            } else if (msg.type === 'assistant' && msg.contentType === 'text' && msg.content) {
                // Assistant text message
                messages.push({
                    role: 'assistant',
                    content: msg.content
                })
            } else if (msg.type === 'assistant' && msg.contentType === 'image' && msg.imageId) {
                // Assistant image - include as image_url for vision models or as text placeholder for text-only models
                if (includeImages) {
                    try {
                        const imageDataUrl = await storageManager.loadImageAsDataUrl(msg.imageId)
                        if (imageDataUrl) {
                            messages.push({
                                role: 'user',
                                content: [
                                    {
                                        type: 'image_url',
                                        image_url: {
                                            url: imageDataUrl
                                        }
                                    },
                                    {
                                        type: 'text',
                                        text: 'Previously generated image'
                                    }
                                ]
                            })
                        }
                    } catch (error) {
                        logger.error('Error loading image from chat history:', error)
                    }
                } else {
                    // For text-only models, add a text placeholder
                    messages.push({
                        role: 'assistant',
                        content: '[Image was generated here]'
                    })
                }
            }
        }

        // Add new user prompt
        messages.push({
            role: 'user',
            content: newPrompt
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

        // Add system prompt for image generation
        messages.push({
            role: 'system',
            content: 'You are an image generation assistant. Generate a single image based on the user\'s request. Return only the generated image.'
        })

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
                        text: 'This is the current image in the selected block. Generate a new image based on the following prompt:'
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
     * Build messages array for image generation with chat history
     * Includes full history with images and text for context
     * @param {Array} chatHistory - Array of previous messages
     * @param {string} prompt - User prompt
     * @param {string} currentImageData - Current image data URL
     * @param {string} textContext - Text context from text blocks
     * @returns {Promise<array>} Messages array
     */
    async buildImageMessagesWithHistory(chatHistory, prompt, currentImageData, textContext = '') {
        const messages = []

        // Add system prompt for image generation
        messages.push({
            role: 'system',
            content: 'You are an image generation assistant. Generate a single image based on the user\'s request. Return only the generated image.'
        })

        // If there's text context from a text block, add it
        if (textContext && textContext.trim()) {
            messages.push({
                role: 'system',
                content: `Context from text block:\n${textContext}`
            })
        }

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
                        text: 'This is the main image'
                    }
                ]
            })
        }

        // Add chat history with both text and images
        // For assistant images, we present them as user context
        for (const msg of chatHistory) {
            if (msg.type === 'user') {
                // User text message
                messages.push({
                    role: 'user',
                    content: msg.content
                })
            } else if (msg.type === 'assistant' && msg.contentType === 'image' && msg.imageId) {
                // Assistant image - present as user context so model can see what was generated
                try {
                    const imageDataUrl = await storageManager.loadImageAsDataUrl(msg.imageId)
                    if (imageDataUrl) {
                        messages.push({
                            role: 'user',
                            content: [
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: imageDataUrl
                                    }
                                },
                                {
                                    type: 'text',
                                    text: 'Previously generated image'
                                }
                            ]
                        })
                    }
                } catch (error) {
                    logger.error('Error loading image from chat history:', error)
                }
            } else if (msg.type === 'assistant' && msg.contentType === 'text' && msg.content) {
                messages.push({
                    role: 'assistant',
                    content: msg.content
                })
            }
        }

        // Add new user prompt
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

            // Check for images array in message (primary format for image generation with modalities)
            if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
                const imageData = message.images[0]
                // Images can be in different formats
                if (imageData.image_url?.url) {
                    return imageData.image_url.url
                }
                // Sometimes the URL is directly in the image object
                if (typeof imageData === 'object' && imageData.url) {
                    return imageData.url
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
