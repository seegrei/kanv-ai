import { useState, useEffect } from 'react'
import ChatMessagePreview from './ChatMessagePreview'
import { storageManager } from '../../../services/storage'
import './ChatMessage.css'

/**
 * ChatMessage Component
 * Displays a single message in the chat history
 * Supports user messages, assistant messages (text/image), and loading state
 */
const ChatMessage = ({ message, onApply, onCreate, blockType, isLastMessage, isGenerating }) => {
    const [imageUrl, setImageUrl] = useState(null)
    const [isLoadingImage, setIsLoadingImage] = useState(false)
    const [imageLoadError, setImageLoadError] = useState(false)

    const loadImage = async (imageId) => {
        try {
            setIsLoadingImage(true)
            setImageLoadError(false)
            const url = await storageManager.loadImage(imageId)
            if (url) {
                setImageUrl(url)
            } else {
                setImageLoadError(true)
            }
        } catch (error) {
            console.error('Failed to load image:', error)
            setImageLoadError(true)
        } finally {
            setIsLoadingImage(false)
        }
    }

    // Load image if this is an image message
    useEffect(() => {
        if (message.type === 'assistant' && message.contentType === 'image' && message.imageId) {
            loadImage(message.imageId)
        }

        return () => {
            // Cleanup: revoke blob URL when component unmounts or imageId changes
            if (imageUrl) {
                storageManager.revokeBlobUrl(imageUrl)
            }
        }
    }, [message.type, message.contentType, message.imageId])

    // User message
    if (message.type === 'user') {
        return (
            <div className='chat-message chat-message-user'>
                <div className='chat-message-user-label'>You</div>
                <div className='chat-message-content'>
                    {message.content}
                </div>
            </div>
        )
    }

    // Loading message
    if (message.type === 'loading') {
        return (
            <div className='chat-message chat-message-loading'>
                <div className='chat-message-spinner'></div>
                <div className='chat-message-loading-text'>Generating...</div>
            </div>
        )
    }

    // Assistant message
    if (message.type === 'assistant') {
        // Determine if buttons should be shown
        // Hide buttons if this is the last message and generation is in progress
        const isCurrentlyGenerating = isLastMessage && isGenerating
        const shouldShowButtons = !isCurrentlyGenerating && (
            message.contentType === 'text' ||
            (message.contentType === 'image' && imageUrl && !isLoadingImage && !imageLoadError)
        )

        // Check if content type is compatible with block type
        // Text blocks can only accept text content, image blocks can only accept image content
        const isContentCompatible = blockType === message.contentType

        return (
            <div className='chat-message chat-message-assistant'>
                {message.model && (
                    <div className='chat-message-model'>{message.model}</div>
                )}
                <div className='chat-message-content'>
                    {message.contentType === 'text' ? (
                        <ChatMessagePreview content={message.content} />
                    ) : message.contentType === 'image' ? (
                        isLoadingImage ? (
                            <div className='chat-message-loading-image'>Loading image...</div>
                        ) : imageUrl ? (
                            <img
                                src={imageUrl}
                                alt='Generated'
                                className='chat-message-image'
                            />
                        ) : imageLoadError ? (
                            <div className='chat-message-error'>Image not available</div>
                        ) : (
                            <div className='chat-message-loading-image'>Loading image...</div>
                        )
                    ) : null}
                </div>
                {shouldShowButtons && (
                    <div className='chat-message-actions'>
                        <button
                            className='chat-message-action-button'
                            onClick={() => onApply(message)}
                            disabled={!isContentCompatible}
                            title={!isContentCompatible ? `Cannot apply ${message.contentType} to ${blockType} block` : 'Apply to block'}
                        >
                            Apply to selected block
                        </button>
                        <button
                            className='chat-message-action-button'
                            onClick={() => onCreate(message)}
                        >
                            Copy to new block
                        </button>
                    </div>
                )}
            </div>
        )
    }

    return null
}

export default ChatMessage
