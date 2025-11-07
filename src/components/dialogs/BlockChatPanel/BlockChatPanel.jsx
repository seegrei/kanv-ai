import { memo, forwardRef, useRef, useEffect, useState, useMemo } from 'react'
import ChatMessage from './ChatMessage'
import { AI } from '../../../constants'
import { storageManager } from '../../../services/storage'
import './BlockChatPanel.css'

/**
 * BlockChatPanel Component
 * Chat-based AI generation interface for blocks
 * Maintains conversation history and allows applying responses to blocks
 *
 * @param {Object} props
 * @param {string} props.type - Type of block ('text' or 'image')
 * @param {number} props.blockX - Block X position
 * @param {number} props.blockY - Block Y position
 * @param {number} props.blockWidth - Block width
 * @param {string} props.prompt - Current prompt value
 * @param {Function} props.setPrompt - Set prompt function
 * @param {string} props.selectedModel - Selected AI model
 * @param {Function} props.setSelectedModel - Set model function
 * @param {Function} props.onSubmit - Submit handler (receives promptText, model, generationType)
 * @param {Function} props.onClose - Close handler
 * @param {boolean} props.isGenerating - Is currently generating
 * @param {Array} props.chatHistory - Chat history messages
 * @param {Function} props.onApply - Apply message to block handler
 * @param {Function} props.onCreate - Create new block from message handler
 * @param {Function} props.onClearHistory - Clear history handler
 */
const BlockChatPanel = memo(forwardRef(({
    type = 'text',
    blockX,
    blockY,
    blockWidth,
    prompt,
    setPrompt,
    selectedModel,
    setSelectedModel,
    onSubmit,
    onClose,
    isGenerating = false,
    chatHistory = [],
    onApply,
    onCreate,
    onClearHistory
}, ref) => {
    const messagesEndRef = useRef(null)
    const isLoadingModel = useRef(false)
    const modelLoadTimestamp = useRef(Date.now())

    // Generation type state (text or image)
    const [generationType, setGenerationType] = useState(type)

    // Get available models based on generation type
    const availableModels = useMemo(() => {
        return generationType === 'text' ? AI.MODELS : AI.IMAGE_MODELS
    }, [generationType])

    // Load saved model on mount and when generation type changes
    useEffect(() => {
        const loadModelForType = async () => {
            isLoadingModel.current = true
            const savedModel = await storageManager.loadLastModel(generationType)
            const models = generationType === 'text' ? AI.MODELS : AI.IMAGE_MODELS

            if (savedModel && models.includes(savedModel)) {
                setSelectedModel(savedModel)
            } else {
                setSelectedModel(models[0])
            }

            // Mark the time when model was loaded to prevent immediate save
            modelLoadTimestamp.current = Date.now()
            isLoadingModel.current = false
        }

        loadModelForType()
    }, [generationType, setSelectedModel])

    // Save selected model when it changes (but not immediately after loading)
    useEffect(() => {
        // Skip save if model was just loaded (within 100ms)
        const timeSinceLoad = Date.now() - modelLoadTimestamp.current
        if (timeSinceLoad < 100 || isLoadingModel.current) {
            return
        }

        const models = generationType === 'text' ? AI.MODELS : AI.IMAGE_MODELS
        if (selectedModel && models.includes(selectedModel)) {
            storageManager.saveLastModel(generationType, selectedModel)
        }
    }, [generationType, selectedModel])

    const handleSubmit = (e) => {
        e.preventDefault()
        if (prompt.trim() && !isGenerating) {
            onSubmit(prompt, selectedModel, generationType)
        }
    }

    const handleKeyDown = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault()
            if (prompt.trim() && !isGenerating) {
                onSubmit(prompt, selectedModel, generationType)
            }
        }
    }

    const popupStyle = {
        left: `${blockX + blockWidth + 20}px`,
        top: `${blockY}px`
    }

    return (
        <div
            ref={ref}
            className='block-chat-panel'
            style={popupStyle}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className='chat-panel-header'>
                <h3 className='chat-panel-title'>Ask anything</h3>
                <button
                    className='chat-clear-button'
                    onClick={onClearHistory}
                    title='Clear history'
                    disabled={isGenerating || chatHistory.length === 0}
                >
                    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                        <path d='M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' />
                    </svg>
                </button>
            </div>

            {/* Chat history */}
            <div className='chat-messages-container'>
                {chatHistory.length === 0 ? (
                    <div className='chat-empty-state'>
                        <p>No messages yet</p>
                    </div>
                ) : (
                    chatHistory.map((message, index) => (
                        <ChatMessage
                            key={message.id || index}
                            message={message}
                            onApply={onApply}
                            onCreate={onCreate}
                            blockType={type}
                            isLastMessage={index === chatHistory.length - 1}
                            isGenerating={isGenerating}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSubmit} className='chat-input-form'>
                {/* Generation type toggle */}
                <div className='generation-type-toggle'>
                    <button
                        type='button'
                        className={`toggle-button ${generationType === 'text' ? 'active' : ''}`}
                        onClick={() => setGenerationType('text')}
                        disabled={isGenerating}
                    >
                        Text
                    </button>
                    <button
                        type='button'
                        className={`toggle-button ${generationType === 'image' ? 'active' : ''}`}
                        onClick={() => setGenerationType('image')}
                        disabled={isGenerating}
                    >
                        Image
                    </button>
                </div>

                <textarea
                    className='chat-input-textarea'
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='Enter your prompt...'
                    rows={3}
                    disabled={isGenerating}
                />
                <div className='chat-input-controls'>
                    <select
                        className='chat-model-select'
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={isGenerating}
                    >
                        {availableModels.map((model) => (
                            <option key={model} value={model}>
                                {model}
                            </option>
                        ))}
                    </select>
                    <button
                        type='submit'
                        className='chat-submit-button'
                        disabled={isGenerating || !prompt.trim()}
                    >
                        {isGenerating ? (
                            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                <circle cx='12' cy='12' r='10' opacity='0.25' />
                                <path d='M12 2a10 10 0 0 1 10 10' strokeLinecap='round'>
                                    <animateTransform
                                        attributeName='transform'
                                        type='rotate'
                                        from='0 12 12'
                                        to='360 12 12'
                                        dur='1s'
                                        repeatCount='indefinite'
                                    />
                                </path>
                            </svg>
                        ) : (
                            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                <path d='M12 19V5M5 12l7-7 7 7' />
                            </svg>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}))

BlockChatPanel.displayName = 'BlockChatPanel'

export default BlockChatPanel
