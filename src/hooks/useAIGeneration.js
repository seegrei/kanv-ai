import { useState, useRef, useEffect, useCallback } from 'react'
import { createLogger } from '../utils/logger'
import { eventBus } from '../core/EventBus'
import { useSettingsStore } from '../store/useSettingsStore'
import { useCanvasActions } from '../store/useCanvasActions'
import OpenRouterService from '../services/api/OpenRouterService'
import { storageManager } from '../services/storage'
import { AI, ELEMENT, CANVAS } from '../constants'

const logger = createLogger('useAIGeneration')

/**
 * Load last selected model from IndexedDB
 * @param {string} type - 'text' or 'image'
 * @returns {Promise<string|null>} Last selected model or null
 */
const loadLastModel = async (type) => {
    try {
        const settings = await storageManager.loadAllSettings()
        if (!settings || Object.keys(settings).length === 0) return null

        const key = type === 'text' ? 'lastTextModel' : 'lastImageModel'
        const lastModel = settings[key]

        // Verify model exists in available models
        const models = type === 'text' ? AI.MODELS : AI.IMAGE_MODELS
        if (lastModel && models.includes(lastModel)) {
            return lastModel
        }
        return null
    } catch (error) {
        logger.error('Error loading last model:', error)
        return null
    }
}

/**
 * Save last selected model to IndexedDB
 * @param {string} type - 'text' or 'image'
 * @param {string} model - Model name
 */
const saveLastModel = async (type, model) => {
    try {
        const key = type === 'text' ? 'lastTextModel' : 'lastImageModel'
        await storageManager.saveSetting(key, model)
    } catch (error) {
        logger.error('Error saving last model:', error)
    }
}

/**
 * Universal AI generation hook for text and image blocks
 * Manages AI generation state, popup visibility, and generation logic
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

    // Always show all models in the list
    const availableModels = type === 'text' ? AI.MODELS : AI.IMAGE_MODELS

    // AI Generation state
    const [showPopup, setShowPopup] = useState(false)
    const [prompt, setPrompt] = useState('')
    const [selectedModel, setSelectedModel] = useState(() => {
        const models = type === 'text' ? AI.MODELS : AI.IMAGE_MODELS
        return models[0]
    })
    const [createNewBlock, setCreateNewBlock] = useState(true)
    const [isGenerating, setIsGenerating] = useState(false)

    // Refs
    const popupRef = useRef(null)
    const serviceRef = useRef(null)

    // Get canvas actions for block management without commands
    const createBlockWithoutCommand = useCanvasActions((state) => state.createBlockWithoutCommand)
    const addBlockToHistory = useCanvasActions((state) => state.addBlockToHistory)
    const deleteBlockWithoutCommand = useCanvasActions((state) => state.deleteBlockWithoutCommand)

    // Initialize service
    useEffect(() => {
        // Get API key from settings or use fallback key
        const apiKey = openRouterApiKey || AI.FALLBACK_API_KEY

        serviceRef.current = new OpenRouterService(apiKey)
    }, [type, openRouterApiKey])

    // Load last selected model on mount
    useEffect(() => {
        const loadModel = async () => {
            const lastModel = await loadLastModel(type)
            if (lastModel) {
                setSelectedModel(lastModel)
            }
        }
        loadModel()
    }, [type])

    // Save selected model to IndexedDB when it changes
    useEffect(() => {
        saveLastModel(type, selectedModel)
    }, [type, selectedModel])

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

    const handlePromptSubmit = useCallback(async (promptText, model, shouldCreateNewBlock) => {
        // Check if no API key is available at all (neither user's nor fallback)
        if (!openRouterApiKey && !AI.FALLBACK_API_KEY) {
            const errorMessage = 'OpenRouter API key is not configured.\n\nPlease open Settings (button in the top-left corner) and add your API key to use AI generation.\n\nYou can get your API key at https://openrouter.ai/keys'
            logger.error('No API key available')
            alert(errorMessage)
            return
        }

        // Check if image generation requires API key
        if (type === 'image' && isUsingFallbackKey) {
            const errorMessage = 'Image generation requires your own API key.\n\nPlease open Settings (button in the top-left corner) and add your OpenRouter API key.\n\nYou can get your API key at https://openrouter.ai/keys'
            logger.error('Image generation requires API key')
            alert(errorMessage)
            return
        }

        // Check if text generation with paid model requires API key
        if (type === 'text' && isUsingFallbackKey && !AI.FREE_MODELS.includes(model)) {
            const errorMessage = 'This model requires your own API key.\n\nPlease either:\n1. Select a free model (marked with :free), or\n2. Open Settings and add your OpenRouter API key\n\nYou can get your API key at https://openrouter.ai/keys'
            logger.error('Paid model requires API key')
            alert(errorMessage)
            return
        }

        setIsGenerating(true)
        let newBlockId = null
        let blockCreated = false
        let blockDeleted = false

        try {
            if (type === 'text') {
                // Text generation with streaming
                const generatedContent = await serviceRef.current.generateText(
                    promptText,
                    model,
                    currentContent,
                    (chunk) => {
                        // Create new block on first chunk if needed (without command)
                        if (shouldCreateNewBlock && !blockCreated) {
                            const blockWidth = width || ELEMENT.TEXT_BLOCK.MIN_WIDTH
                            const blockHeight = height || ELEMENT.TEXT_BLOCK.MIN_HEIGHT

                            const popupHeight = popupRef.current ? popupRef.current.offsetHeight : 200
                            const popupX = x + blockWidth + 20
                            const popupY = y

                            const newX = popupX
                            const newY = popupY + popupHeight + ELEMENT.TEXT_BLOCK.BLOCK_SPACING

                            newBlockId = createBlockWithoutCommand(
                                'text',
                                newX,
                                newY,
                                blockWidth,
                                blockHeight,
                                { content: chunk }
                            )
                            blockCreated = true
                        } else if (shouldCreateNewBlock && newBlockId) {
                            onUpdate(newBlockId, { content: chunk })
                        } else {
                            onUpdate(id, { content: chunk })
                        }
                    }
                )

                if (shouldCreateNewBlock && newBlockId) {
                    onUpdate(newBlockId, { content: generatedContent })
                    // Add block to history with final content
                    addBlockToHistory(newBlockId)
                } else {
                    onUpdate(id, { content: generatedContent })
                }
            } else {
                // Image generation
                const generatedImageData = await serviceRef.current.generateImage(promptText, model, currentContent)

                // Generate unique image ID
                const newImageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

                // Save image to IndexedDB
                await storageManager.saveImage(newImageId, generatedImageData)

                // Create new block after receiving image data (without command)
                if (shouldCreateNewBlock) {
                    const blockWidth = width || ELEMENT.IMAGE.DEFAULT_WIDTH
                    const blockHeight = height || ELEMENT.IMAGE.DEFAULT_HEIGHT

                    const popupHeight = popupRef.current ? popupRef.current.offsetHeight : 200
                    const popupX = x + blockWidth + 20
                    const popupY = y

                    const newX = popupX
                    const newY = popupY + popupHeight + ELEMENT.TEXT_BLOCK.BLOCK_SPACING

                    newBlockId = createBlockWithoutCommand(
                        'image',
                        newX,
                        newY,
                        blockWidth,
                        blockHeight,
                        { imageId: null, aspectRatio: blockWidth / blockHeight }
                    )
                }

                // Load image to get dimensions and calculate aspect ratio
                const img = new Image()
                img.onload = () => {
                    // Don't update if block was deleted due to error
                    if (blockDeleted) return

                    const imgWidth = img.naturalWidth
                    const imgHeight = img.naturalHeight
                    const newAspectRatio = imgWidth / imgHeight

                    const currentWidth = width || ELEMENT.IMAGE.DEFAULT_WIDTH
                    const maxWidth = Math.min(currentWidth, CANVAS.MAX_IMAGE_SIZE)
                    const newWidth = Math.min(imgWidth, maxWidth)
                    const newHeight = newWidth / newAspectRatio

                    const targetId = shouldCreateNewBlock ? newBlockId : id
                    onUpdate(targetId, {
                        imageId: newImageId,
                        width: newWidth,
                        height: newHeight,
                        aspectRatio: newAspectRatio
                    })

                    // Add block to history with final image after load completes
                    if (shouldCreateNewBlock && newBlockId) {
                        addBlockToHistory(newBlockId)
                    }
                }

                img.onerror = () => {
                    // Don't update if block was deleted due to error
                    if (blockDeleted) return

                    const targetId = shouldCreateNewBlock ? newBlockId : id
                    onUpdate(targetId, { imageId: newImageId })

                    // Add block to history even on image load error
                    if (shouldCreateNewBlock && newBlockId) {
                        addBlockToHistory(newBlockId)
                    }
                }

                img.src = generatedImageData
            }

            if (!shouldCreateNewBlock) {
                setShowPopup(false)
            }
            setPrompt('')
        } catch (error) {
            logger.error(`Error generating ${type}:`, error)
            alert(`Error generating ${type}: ${error.message}`)

            // If error occurred and block was created, delete it without command
            if (shouldCreateNewBlock && newBlockId) {
                deleteBlockWithoutCommand(newBlockId)
                blockDeleted = true
            }
        } finally {
            setIsGenerating(false)
        }
    }, [type, width, height, x, y, currentContent, id, onUpdate, createBlockWithoutCommand, addBlockToHistory, deleteBlockWithoutCommand, isUsingFallbackKey, openRouterApiKey])

    return {
        // State
        showPopup,
        isGenerating,

        // Refs
        popupRef,

        // Handlers
        handleGenerateClick,

        // Props for GeneratePopup
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
            createNewBlock,
            setCreateNewBlock,
            onSubmit: handlePromptSubmit,
            isGenerating,
            availableModels
        }
    }
}

export default useAIGeneration
