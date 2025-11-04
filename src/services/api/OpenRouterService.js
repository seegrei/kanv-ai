import { createLogger } from '../../utils/logger'
import BaseAPIService from './BaseAPIService'
import RequestCache from '../utils/RequestCache'
import TokenTracker from '../utils/TokenTracker'

const logger = createLogger('OpenRouterService')

class OpenRouterService extends BaseAPIService {
    constructor(apiKey) {
        super(apiKey, 'https://openrouter.ai/api/v1')
        this.cache = new RequestCache(100, 300000) // 100 entries, 5 min TTL
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
    async generate(prompt, model, currentContent = '', onChunk = null) {
        // Create cache key
        const cacheKey = this.createCacheKey(prompt, model, currentContent)

        // Check cache for non-streaming requests
        if (!onChunk && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)
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
                this.cache.set(cacheKey, generatedText)
            }

            return generatedText
        } catch (error) {
            logger.error('Error generating content:', error)
            throw error
        }
    }

    /**
     * Build messages array for API request
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
     * Create cache key from request parameters
     * @param {string} prompt - User prompt
     * @param {string} model - Model name
     * @param {string} currentContent - Current content
     * @returns {string} Cache key
     */
    createCacheKey(prompt, model, currentContent) {
        return `${model}:${prompt}:${currentContent.substring(0, 100)}`
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
