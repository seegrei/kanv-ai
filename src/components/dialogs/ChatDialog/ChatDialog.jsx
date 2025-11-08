import { memo, forwardRef } from 'react'
import ChatCore from '../../chat/ChatCore/ChatCore'
import './ChatDialog.css'

/**
 * ChatDialog Component
 * Popup wrapper for ChatCore - positioned next to blocks
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
const ChatDialog = memo(forwardRef(({
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
    const popupStyle = {
        left: `${blockX + blockWidth + 20}px`,
        top: `${blockY}px`
    }

    return (
        <div
            ref={ref}
            className='chat-panel'
            style={popupStyle}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <ChatCore
                type={type}
                prompt={prompt}
                setPrompt={setPrompt}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                onSubmit={onSubmit}
                isGenerating={isGenerating}
                chatHistory={chatHistory}
                onApply={onApply}
                onCreate={onCreate}
                onClearHistory={onClearHistory}
                showHeader={true}
                showTypeToggle={true}
            />
        </div>
    )
}))

ChatDialog.displayName = 'ChatDialog'

export default ChatDialog
