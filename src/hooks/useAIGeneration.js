import { useState, useRef, useEffect, useCallback } from 'react'
import { createLogger } from '../utils/logger'
import { eventBus } from '../core/EventBus'
import { useSettingsStore } from '../store/useSettingsStore'
import { useCanvasActions } from '../store/useCanvasActions'
import { useHistoryStore } from '../store/useHistoryStore'
import UpdateContentCommand from '../commands/UpdateContentCommand'
import OpenRouterService from '../services/api/OpenRouterService'
import { storageManager } from '../services/storage'
import { AI, ELEMENT, CANVAS } from '../constants'

const logger = createLogger('useAIGeneration')

/**
 * Universal AI generation hook for text and image blocks
 * Manages AI generation state, popup visibility, chat history, and generation logic
 *
 * @param {Object} config
 * @param {string} config.type - 'text' or 'image'
 * @param {string} config.id - Block ID
 * @param {number} config.x - Block X position
 * @param {number} config.y - Block Y position
 * @param {number} config.width - Block width
 * @param {number} config.height - Block height
 * @param {string|object} config.currentContent - Current content (HTML for text, imageId for image)
 * @param {Function} config.onUpdate - Update callback
 * @param {Function} config.onAddBlockAt - Add block callback
 * @param {Function} config.onClick - Click callback
 * @param {boolean} config.isSelected - Is block selected
 * @param {number} [config.aspectRatio] - Current aspect ratio (for images)
 * @returns {Object} Generation state and handlers
 */
const useAIGeneration = ({
    type,
    id,
    x,
    y,
    width,
    height,
    currentContent,
    onUpdate,
    onAddBlockAt,
    onClick,
    isSelected,
    aspectRatio
}) => {
    // Get API key from settings
    const openRouterApiKey = useSettingsStore((state) => state.openRouterApiKey)

    // Determine if using fallback API key
    const isUsingFallbackKey = !openRouterApiKey

    // AI Generation state
    const [showPopup, setShowPopup] = useState(false)
    const [prompt, setPrompt] = useState('')
    const [selectedModel, setSelectedModel] = useState(() => {
        // Try to get saved model from memory first
        const savedModel = type === 'text' ? storageManager.lastTextModel : storageManager.lastImageModel
        if (savedModel) {
            const models = type === 'text' ? AI.MODELS : AI.IMAGE_MODELS
            if (models.includes(savedModel)) {
                return savedModel
            }
        }
        // Fallback to first model
        const models = type === 'text' ? AI.MODELS : AI.IMAGE_MODELS
        return models[0]
    })
    const [isGenerating, setIsGenerating] = useState(false)
    const [chatHistory, setChatHistory] = useState([])

    // Refs
    const popupRef = useRef(null)
    const serviceRef = useRef(null)

    // Get canvas actions for block management without commands
    const createBlockWithoutCommand = useCanvasActions((state) => state.createBlockWithoutCommand)
    const addBlockToHistory = useCanvasActions((state) => state.addBlockToHistory)
    const deleteBlockWithoutCommand = useCanvasActions((state) => state.deleteBlockWithoutCommand)
    const executeCommand = useHistoryStore((state) => state.executeCommand)

    // Initialize service
    useEffect(() => {
        // Get API key from settings or use fallback key
        const apiKey = openRouterApiKey || AI.FALLBACK_API_KEY

        serviceRef.current = new OpenRouterService(apiKey)
    }, [type, openRouterApiKey])

    // Model loading and saving is now handled in BlockChatPanel based on generationType
    // This prevents conflicts when switching between text/image generation

    // Load chat history when popup opens
    // Model loading is handled in BlockChatPanel based on generationType
    useEffect(() => {
        if (showPopup) {
            const loadData = async () => {
                const history = await storageManager.getBlockChatHistory(id)
                setChatHistory(history)
            }
            loadData()
        }
    }, [showPopup, id])

    // Hide popup when block is deselected (only if not generating)
    useEffect(() => {
        if (!isSelected && !isGenerating) {
            setShowPopup(false)
        }
    }, [isSelected, isGenerating])

    // Click outside to close popup (only if not generating)
    useEffect(() => {
        if (!showPopup) return

        const handleClickOutside = (e) => {
            if (!isGenerating && popupRef.current && !popupRef.current.contains(e.target)) {
                setShowPopup(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showPopup, isGenerating])

    // Close popup after generation completes if block is not selected
    useEffect(() => {
        if (!isGenerating && showPopup && !isSelected) {
            setShowPopup(false)
        }
    }, [isGenerating, showPopup, isSelected])

    // Listen for generate event from toolbar
    useEffect(() => {
        const handleGenerateEvent = ({ blockId }) => {
            if (blockId === id) {
                setShowPopup(true)
            }
        }

        eventBus.on('block:generate', handleGenerateEvent)

        return () => {
            eventBus.off('block:generate', handleGenerateEvent)
        }
    }, [id])

    const handleGenerateClick = useCallback((e) => {
        e.stopPropagation()
        onClick(id)
        setShowPopup(!showPopup)
    }, [id, onClick, showPopup])

    const handlePromptSubmit = useCallback(async (promptText, model, generationType) => {
        // Use provided generationType or fallback to block type
        const actualGenerationType = generationType || type

        // Check if no API key is available at all (neither user's nor fallback)
        if (!openRouterApiKey && !AI.FALLBACK_API_KEY) {
            const errorMessage = 'OpenRouter API key is not configured.\n\nPlease open Settings (button in the top-left corner) and add your API key to use AI generation.\n\nYou can get your API key at https://openrouter.ai/keys'
            logger.error('No API key available')
            alert(errorMessage)
            return
        }

        // Check if image generation requires API key
        if (actualGenerationType === 'image' && isUsingFallbackKey) {
            const errorMessage = 'Image generation requires your own API key.\n\nPlease open Settings (button in the top-left corner) and add your OpenRouter API key.\n\nYou can get your API key at https://openrouter.ai/keys'
            logger.error('Image generation requires API key')
            alert(errorMessage)
            return
        }

        // Check if text generation with paid model requires API key
        if (actualGenerationType === 'text' && isUsingFallbackKey && !AI.FREE_MODELS.includes(model)) {
            const errorMessage = 'This model requires your own API key.\n\nPlease either:\n1. Select a free model (marked with :free), or\n2. Open Settings and add your OpenRouter API key\n\nYou can get your API key at https://openrouter.ai/keys'
            logger.error('Paid model requires API key')
            alert(errorMessage)
            return
        }

        // Add user message to history
        const userMessage = {
            id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            type: 'user',
            content: promptText,
            model: model,
            timestamp: Date.now()
        }

        // Add loading message
        const loadingMessage = {
            id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            type: 'loading',
            timestamp: Date.now()
        }

        const newHistory = [...chatHistory, userMessage, loadingMessage]
        setChatHistory(newHistory)
        setPrompt('')
        setIsGenerating(true)

        try {
            if (actualGenerationType === 'text') {
                // Text generation with streaming and chat history
                let generatedContent = ''

                await serviceRef.current.generateTextWithHistory(
                    chatHistory,
                    promptText,
                    model,
                    currentContent,
                    (chunk) => {
                        generatedContent = chunk

                        // Update loading message with partial content
                        setChatHistory(prev => {
                            const updated = [...prev]
                            const loadingIndex = updated.findIndex(msg => msg.id === loadingMessage.id)
                            if (loadingIndex !== -1) {
                                updated[loadingIndex] = {
                                    ...updated[loadingIndex],
                                    type: 'assistant',
                                    content: chunk,
                                    contentType: 'text',
                                    model: model
                                }
                            }
                            return updated
                        })
                    }
                )

                // Final update with complete content
                const finalHistory = [...chatHistory, userMessage, {
                    id: loadingMessage.id,
                    type: 'assistant',
                    content: generatedContent,
                    contentType: 'text',
                    model: model,
                    timestamp: Date.now()
                }]

                setChatHistory(finalHistory)
                await storageManager.saveBlockChatHistory(id, finalHistory)

            } else {
                // Image generation with chat history
                const generatedImageData = await serviceRef.current.generateImage(promptText, model, currentContent, chatHistory)

                // Generate unique image ID
                const newImageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

                // Save image to IndexedDB
                await storageManager.saveImage(newImageId, generatedImageData)

                // Replace loading message with assistant message
                const finalHistory = [...chatHistory, userMessage, {
                    id: loadingMessage.id,
                    type: 'assistant',
                    contentType: 'image',
                    imageId: newImageId,
                    model: model,
                    timestamp: Date.now()
                }]

                setChatHistory(finalHistory)
                await storageManager.saveBlockChatHistory(id, finalHistory)
            }
        } catch (error) {
            logger.error(`Error generating ${actualGenerationType}:`, error)
            alert(`Error generating ${actualGenerationType}: ${error.message}`)

            // Remove loading message on error
            setChatHistory(prev => prev.filter(msg => msg.id !== loadingMessage.id))
        } finally {
            setIsGenerating(false)
        }
    }, [type, id, chatHistory, isUsingFallbackKey, openRouterApiKey, currentContent])

    const handleApplyToBlock = useCallback(async (message) => {
        if (message.type !== 'assistant') return

        try {
            if (message.contentType === 'text') {
                // Apply text content to block using command
                const command = new UpdateContentCommand(id, currentContent, message.content)
                executeCommand(command)
            } else if (message.contentType === 'image' && message.imageId) {
                // Duplicate image and apply to block
                const newImageId = await storageManager.duplicateImage(message.imageId)
                if (newImageId) {
                    // Load image to get dimensions
                    const imageUrl = await storageManager.loadImage(newImageId)
                    if (imageUrl) {
                        const img = new Image()
                        img.onload = () => {
                            const imgWidth = img.naturalWidth
                            const imgHeight = img.naturalHeight
                            const newAspectRatio = imgWidth / imgHeight

                            const currentWidth = width || ELEMENT.IMAGE.DEFAULT_WIDTH
                            const maxWidth = Math.min(currentWidth, CANVAS.MAX_IMAGE_SIZE)
                            const newWidth = Math.min(imgWidth, maxWidth)
                            const newHeight = newWidth / newAspectRatio

                            onUpdate(id, {
                                imageId: newImageId,
                                width: newWidth,
                                height: newHeight,
                                aspectRatio: newAspectRatio
                            })

                            storageManager.revokeBlobUrl(imageUrl)
                        }

                        img.onerror = () => {
                            onUpdate(id, { imageId: newImageId })
                            storageManager.revokeBlobUrl(imageUrl)
                        }

                        img.src = imageUrl
                    }
                }
            }
        } catch (error) {
            logger.error('Error applying to block:', error)
            alert(`Error applying to block: ${error.message}`)
        }
    }, [id, currentContent, width, executeCommand, onUpdate])

    const handleCreateNewBlock = useCallback(async (message) => {
        if (message.type !== 'assistant') return

        try {
            const blockWidth = width || (type === 'text' ? ELEMENT.TEXT_BLOCK.MIN_WIDTH : ELEMENT.IMAGE.DEFAULT_WIDTH)
            const blockHeight = height || (type === 'text' ? ELEMENT.TEXT_BLOCK.MIN_HEIGHT : ELEMENT.IMAGE.DEFAULT_HEIGHT)

            const popupHeight = popupRef.current ? popupRef.current.offsetHeight : 200
            const popupX = x + blockWidth + 20
            const popupY = y

            const newX = popupX
            const newY = popupY + popupHeight + ELEMENT.TEXT_BLOCK.BLOCK_SPACING

            if (message.contentType === 'text') {
                // Create text block
                const newBlockId = createBlockWithoutCommand(
                    'text',
                    newX,
                    newY,
                    blockWidth,
                    blockHeight,
                    { content: message.content }
                )
                addBlockToHistory(newBlockId)
            } else if (message.contentType === 'image' && message.imageId) {
                // Duplicate image and create block
                const newImageId = await storageManager.duplicateImage(message.imageId)
                if (newImageId) {
                    const imageUrl = await storageManager.loadImage(newImageId)
                    if (imageUrl) {
                        const img = new Image()
                        img.onload = () => {
                            const imgWidth = img.naturalWidth
                            const imgHeight = img.naturalHeight
                            const newAspectRatio = imgWidth / imgHeight

                            const maxWidth = Math.min(blockWidth, CANVAS.MAX_IMAGE_SIZE)
                            const newWidth = Math.min(imgWidth, maxWidth)
                            const newHeight = newWidth / newAspectRatio

                            const newBlockId = createBlockWithoutCommand(
                                'image',
                                newX,
                                newY,
                                newWidth,
                                newHeight,
                                {
                                    imageId: newImageId,
                                    aspectRatio: newAspectRatio
                                }
                            )
                            addBlockToHistory(newBlockId)

                            storageManager.revokeBlobUrl(imageUrl)
                        }

                        img.onerror = () => {
                            const newBlockId = createBlockWithoutCommand(
                                'image',
                                newX,
                                newY,
                                blockWidth,
                                blockHeight,
                                {
                                    imageId: newImageId,
                                    aspectRatio: blockWidth / blockHeight
                                }
                            )
                            addBlockToHistory(newBlockId)

                            storageManager.revokeBlobUrl(imageUrl)
                        }

                        img.src = imageUrl
                    }
                }
            }
        } catch (error) {
            logger.error('Error creating new block:', error)
            alert(`Error creating new block: ${error.message}`)
        }
    }, [type, x, y, width, height, createBlockWithoutCommand, addBlockToHistory])

    const handleClearHistory = useCallback(async () => {
        try {
            await storageManager.clearBlockChatHistory(id)
            setChatHistory([])
        } catch (error) {
            logger.error('Error clearing history:', error)
            alert(`Error clearing history: ${error.message}`)
        }
    }, [id])

    return {
        // State
        showPopup,
        isGenerating,

        // Refs
        popupRef,

        // Handlers
        handleGenerateClick,

        // Props for BlockChatPanel
        popupProps: {
            ref: popupRef,
            type,
            blockX: x,
            blockY: y,
            blockWidth: type === 'text'
                ? (width || ELEMENT.TEXT_BLOCK.MIN_WIDTH)
                : (width || ELEMENT.IMAGE.DEFAULT_WIDTH),
            prompt,
            setPrompt,
            selectedModel,
            setSelectedModel,
            onSubmit: handlePromptSubmit,
            isGenerating,
            chatHistory,
            onApply: handleApplyToBlock,
            onCreate: handleCreateNewBlock,
            onClearHistory: handleClearHistory
        }
    }
}

export default useAIGeneration
