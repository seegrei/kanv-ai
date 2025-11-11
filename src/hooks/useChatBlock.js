import { useState, useRef, useCallback, useEffect } from 'react'
import { createLogger } from '../utils/logger'
import { generateId } from '../utils/generateId'
import { eventBus } from '../core/EventBus'
import { useSettingsStore } from '../store/useSettingsStore'
import { useSelectionStore } from '../store/useSelectionStore'
import { useCanvasActions } from '../store/useCanvasActions'
import { useHistoryStore } from '../store/useHistoryStore'
import { useElementsStore } from '../store/useElementsStore'
import { useViewStore } from '../store/useViewStore'
import UpdateContentCommand from '../commands/UpdateContentCommand'
import OpenRouterService from '../services/api/OpenRouterService'
import { storageManager } from '../services/storage'
import { AI, ELEMENT, CANVAS, VIEWS } from '../constants'

const logger = createLogger('useChatBlock')

/**
 * Hook for managing chat block state and AI generation
 * Unlike useAIGeneration, this manages a standalone chat block with its own history
 * History is stored in blocks_chat_history table in IndexedDB
 *
 * @param {Object} config
 * @param {string} config.id - Chat block ID
 * @param {number} config.x - Block X position
 * @param {number} config.y - Block Y position
 * @param {number} config.width - Block width
 * @param {number} config.height - Block height
 * @param {Array} [config.chatHistory] - Legacy: Chat history for migration from old format
 * @param {string} [config.lastModel] - Legacy: For backward compatibility (not used)
 * @param {string} [config.lastGenerationType] - Legacy: For backward compatibility (not used)
 * @returns {Object} Chat state and handlers
 */
const useChatBlock = ({
    id,
    x,
    y,
    width,
    height,
    chatHistory = [],
    lastModel = null,
    lastGenerationType = 'text'
}) => {
    // Get API key from settings
    const openRouterApiKey = useSettingsStore((state) => state.openRouterApiKey)

    // Determine if using fallback API key (check trimmed value)
    const isUsingFallbackKey = !openRouterApiKey?.trim()

    // Local state
    const [prompt, setPrompt] = useState('')
    const [localChatHistory, setLocalChatHistory] = useState([])
    const [selectedModel, setSelectedModel] = useState(AI.MODELS[0])
    const [isGenerating, setIsGenerating] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // Refs
    const serviceRef = useRef(null)

    // Get stores
    const updateElement = useElementsStore((state) => state.updateElement)
    const createBlockWithoutCommand = useCanvasActions((state) => state.createBlockWithoutCommand)
    const addBlockToHistory = useCanvasActions((state) => state.addBlockToHistory)
    const executeCommand = useHistoryStore((state) => state.executeCommand)
    const selectedIds = useSelectionStore((state) => state.selectedIds)

    // Initialize service
    useEffect(() => {
        // Get API key from settings or use fallback key
        // Trim and check if key is not empty
        const userKey = openRouterApiKey?.trim()
        const apiKey = userKey || AI.FALLBACK_API_KEY

        serviceRef.current = new OpenRouterService(apiKey)
    }, [openRouterApiKey])

    // Load chat history from blocks_chat_history table on mount
    useEffect(() => {
        const loadHistory = async () => {
            setIsLoading(true)
            try {
                // Try to load from blocks_chat_history table
                const historyFromDB = await storageManager.getBlockChatHistory(id)

                // If no history in DB but we have old chatHistory prop, migrate it
                if (historyFromDB.length === 0 && chatHistory.length > 0) {
                    logger.log('Migrating chat history from block data to blocks_chat_history table')
                    await storageManager.saveBlockChatHistory(id, chatHistory)
                    setLocalChatHistory(chatHistory)

                    // Clear old chatHistory from block data
                    updateElement(id, { chatHistory: undefined })
                } else {
                    setLocalChatHistory(historyFromDB)
                }
            } catch (error) {
                logger.error('Error loading chat history:', error)
                // Fallback to prop if DB load fails
                setLocalChatHistory(chatHistory)
            } finally {
                setIsLoading(false)
            }
        }

        loadHistory()
    }, [id, chatHistory, updateElement])

    // Update chat history in blocks_chat_history table
    const updateChatHistory = useCallback(async (newHistory) => {
        setLocalChatHistory(newHistory)
        try {
            await storageManager.saveBlockChatHistory(id, newHistory)
        } catch (error) {
            logger.error('Error saving chat history:', error)
        }
    }, [id])

    // Handle prompt submission
    const handlePromptSubmit = useCallback(async (promptText, model, generationType) => {
        // Validation
        if (!openRouterApiKey && !AI.FALLBACK_API_KEY) {
            const errorMessage = 'OpenRouter API key is not configured.\n\nPlease open Settings (button in the top-left corner) and add your API key to use AI generation.\n\nYou can get your API key at https://openrouter.ai/keys'
            logger.error('No API key available')
            alert(errorMessage)
            return
        }

        if (generationType === 'image' && isUsingFallbackKey) {
            const errorMessage = 'Image generation requires your own API key.\n\nPlease open Settings (button in the top-left corner) and add your OpenRouter API key.\n\nYou can get your API key at https://openrouter.ai/keys'
            logger.error('Image generation requires API key')
            alert(errorMessage)
            return
        }

        if (generationType === 'text' && isUsingFallbackKey && !AI.FREE_MODELS.includes(model)) {
            const errorMessage = 'This model requires your own API key.\n\nPlease either:\n1. Select a free model (marked with :free), or\n2. Open Settings and add your OpenRouter API key\n\nYou can get your API key at https://openrouter.ai/keys'
            logger.error('Paid model requires API key')
            alert(errorMessage)
            return
        }

        // Add user message
        const userMessage = {
            id: generateId(),
            type: 'user',
            content: promptText,
            model: model,
            timestamp: Date.now()
        }

        // Add loading message
        const loadingMessage = {
            id: generateId(),
            type: 'loading',
            timestamp: Date.now()
        }

        const newHistory = [...localChatHistory, userMessage, loadingMessage]
        updateChatHistory(newHistory)
        setPrompt('')
        setIsGenerating(true)

        try {
            if (generationType === 'text') {
                // Text generation with streaming
                let generatedContent = ''

                await serviceRef.current.generateTextWithHistory(
                    localChatHistory,
                    promptText,
                    model,
                    '',
                    (chunk) => {
                        generatedContent = chunk

                        // Update with partial content
                        const updatedHistory = [...localChatHistory, userMessage, {
                            ...loadingMessage,
                            type: 'assistant',
                            content: chunk,
                            contentType: 'text',
                            model: model
                        }]
                        updateChatHistory(updatedHistory)
                    }
                )

                // Final update
                const finalHistory = [...localChatHistory, userMessage, {
                    id: loadingMessage.id,
                    type: 'assistant',
                    content: generatedContent,
                    contentType: 'text',
                    model: model,
                    timestamp: Date.now()
                }]

                updateChatHistory(finalHistory)

            } else {
                // Image generation
                const generatedImageData = await serviceRef.current.generateImage(promptText, model, '', localChatHistory)

                // Generate unique image ID
                const newImageId = generateId()

                // Save image to IndexedDB
                await storageManager.saveImage(newImageId, generatedImageData)

                // Update history with image
                const finalHistory = [...localChatHistory, userMessage, {
                    id: loadingMessage.id,
                    type: 'assistant',
                    contentType: 'image',
                    imageId: newImageId,
                    model: model,
                    timestamp: Date.now()
                }]

                updateChatHistory(finalHistory)
            }
        } catch (error) {
            logger.error(`Error generating ${generationType}:`, error)

            // Check if error is related to missing API key
            if (error.message.includes('No API key configured') || error.message.includes('No auth credentials')) {
                const goToSettings = window.confirm(
                    'OpenRouter API key is not configured.\n\n' +
                    'To use AI generation, you need to:\n' +
                    '1. Get an API key from openrouter.ai/keys\n' +
                    '2. Set it in Settings\n\n' +
                    'Click OK to go to Settings now.'
                )
                if (goToSettings) {
                    useViewStore.getState().setView(VIEWS.SETTINGS)
                }
            } else {
                alert(`Error generating ${generationType}: ${error.message}`)
            }

            // Remove loading message on error
            const errorHistory = newHistory.filter(msg => msg.id !== loadingMessage.id)
            updateChatHistory(errorHistory)
        } finally {
            setIsGenerating(false)
        }
    }, [localChatHistory, isUsingFallbackKey, openRouterApiKey, updateChatHistory])

    // Apply message to selected block
    const handleApplyToBlock = useCallback(async (message) => {
        if (message.type !== 'assistant') return

        // Get first selected block (excluding this chat block)
        const targetBlockIds = selectedIds.filter(blockId => blockId !== id)
        if (targetBlockIds.length === 0) {
            alert('Please select a block to apply the content to')
            return
        }

        const targetBlockId = targetBlockIds[0]
        const targetBlock = useElementsStore.getState().elements.find(el => el.id === targetBlockId)

        if (!targetBlock) return

        try {
            if (message.contentType === 'text' && targetBlock.type === 'text') {
                // Apply text to text block
                const command = new UpdateContentCommand(
                    targetBlockId,
                    targetBlock.content || '',
                    message.content
                )
                executeCommand(command)

            } else if (message.contentType === 'image' && targetBlock.type === 'image') {
                // Apply image to image block
                const newImageId = await storageManager.duplicateImage(message.imageId)
                if (newImageId) {
                    const imageUrl = await storageManager.loadImage(newImageId)
                    if (imageUrl) {
                        const img = new Image()
                        img.onload = () => {
                            const imgWidth = img.naturalWidth
                            const imgHeight = img.naturalHeight
                            const newAspectRatio = imgWidth / imgHeight

                            const currentWidth = targetBlock.width || ELEMENT.IMAGE.DEFAULT_WIDTH
                            const maxWidth = Math.min(currentWidth, CANVAS.MAX_IMAGE_SIZE)
                            const newWidth = Math.min(imgWidth, maxWidth)
                            const newHeight = newWidth / newAspectRatio

                            updateElement(targetBlockId, {
                                imageId: newImageId,
                                width: newWidth,
                                height: newHeight,
                                aspectRatio: newAspectRatio
                            })

                            storageManager.revokeBlobUrl(imageUrl)
                        }

                        img.onerror = () => {
                            updateElement(targetBlockId, { imageId: newImageId })
                            storageManager.revokeBlobUrl(imageUrl)
                        }

                        img.src = imageUrl
                    }
                }
            } else {
                alert(`Cannot apply ${message.contentType} content to ${targetBlock.type} block`)
            }
        } catch (error) {
            logger.error('Error applying to block:', error)
            alert(`Error applying to block: ${error.message}`)
        }
    }, [id, selectedIds, executeCommand, updateElement])

    // Create new block from message
    const handleCreateNewBlock = useCallback(async (message) => {
        if (message.type !== 'assistant') return

        try {
            // Position new block below chat block
            const spacing = ELEMENT.TEXT_BLOCK.BLOCK_SPACING
            const newX = x
            const newY = y + height + spacing

            if (message.contentType === 'text') {
                // Create text block
                const newBlockId = createBlockWithoutCommand(
                    'text',
                    newX,
                    newY,
                    ELEMENT.TEXT_BLOCK.DEFAULT_WIDTH,
                    ELEMENT.TEXT_BLOCK.DEFAULT_HEIGHT,
                    { content: message.content }
                )
                addBlockToHistory(newBlockId)

                // Select and focus on new block
                useSelectionStore.getState().setSelectedIds([newBlockId])
                setTimeout(() => {
                    eventBus.emit('block:created', { id: newBlockId })
                }, 100)

            } else if (message.contentType === 'image' && message.imageId) {
                // Create image block
                const newImageId = await storageManager.duplicateImage(message.imageId)
                if (newImageId) {
                    const imageUrl = await storageManager.loadImage(newImageId)
                    if (imageUrl) {
                        const img = new Image()
                        img.onload = () => {
                            const imgWidth = img.naturalWidth
                            const imgHeight = img.naturalHeight
                            const newAspectRatio = imgWidth / imgHeight

                            const maxWidth = CANVAS.MAX_IMAGE_SIZE
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

                            useSelectionStore.getState().setSelectedIds([newBlockId])
                            setTimeout(() => {
                                eventBus.emit('block:created', { id: newBlockId })
                            }, 100)

                            storageManager.revokeBlobUrl(imageUrl)
                        }

                        img.onerror = () => {
                            const newBlockId = createBlockWithoutCommand(
                                'image',
                                newX,
                                newY,
                                ELEMENT.IMAGE.DEFAULT_WIDTH,
                                ELEMENT.IMAGE.DEFAULT_HEIGHT,
                                {
                                    imageId: newImageId,
                                    aspectRatio: 1
                                }
                            )
                            addBlockToHistory(newBlockId)

                            useSelectionStore.getState().setSelectedIds([newBlockId])
                            setTimeout(() => {
                                eventBus.emit('block:created', { id: newBlockId })
                            }, 100)

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
    }, [x, y, height, createBlockWithoutCommand, addBlockToHistory])

    // Clear chat history
    const handleClearHistory = useCallback(() => {
        updateChatHistory([])
    }, [updateChatHistory])

    return {
        // Props for ChatCore
        props: {
            type: 'text', // Default type, ChatCore will manage its own state
            prompt,
            setPrompt,
            selectedModel,
            setSelectedModel,
            onSubmit: handlePromptSubmit,
            isGenerating: isGenerating, // Don't block UI while loading history
            chatHistory: localChatHistory,
            onApply: handleApplyToBlock,
            onCreate: handleCreateNewBlock,
            onClearHistory: handleClearHistory,
            showHeader: true,
            showTypeToggle: true,
            showApplyButton: false // Chat block doesn't need "Apply to selected block" button
        }
    }
}

export default useChatBlock
