import { memo, forwardRef } from 'react'
import { AI } from '../../../constants'
import './GeneratePopup.css'

/**
 * Universal AI generation popup component
 * Supports both text and image generation
 *
 * @param {Object} props
 * @param {string} props.type - Type of generation ('text' or 'image')
 * @param {number} props.blockX - Block X position
 * @param {number} props.blockY - Block Y position
 * @param {number} props.blockWidth - Block width
 * @param {string} props.prompt - Current prompt value
 * @param {Function} props.setPrompt - Set prompt function
 * @param {string} props.selectedModel - Selected AI model
 * @param {Function} props.setSelectedModel - Set model function
 * @param {boolean} props.createNewBlock - Create new block flag
 * @param {Function} props.setCreateNewBlock - Set create new block function
 * @param {Function} props.onSubmit - Submit handler
 * @param {Function} props.onClose - Close handler
 * @param {boolean} props.isGenerating - Is currently generating
 */
const GeneratePopup = memo(forwardRef(({
    type = 'text',
    blockX,
    blockY,
    blockWidth,
    prompt,
    setPrompt,
    selectedModel,
    setSelectedModel,
    createNewBlock,
    setCreateNewBlock,
    onSubmit,
    onClose,
    isGenerating = false
}, ref) => {
    const isImageType = type === 'image';
    const models = isImageType ? AI.IMAGE_MODELS : AI.MODELS;
    const title = isImageType ? 'Generate image' : 'Generate anything';

    const handleSubmit = (e) => {
        e.preventDefault()
        if (prompt.trim() && !isGenerating) {
            onSubmit(prompt, selectedModel, createNewBlock)
        }
    }

    const popupStyle = {
        left: `${blockX + blockWidth + 20}px`,
        top: `${blockY}px`
    }

    return (
        <div
            ref={ref}
            className='generate-popup'
            style={popupStyle}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className='generate-popup-header'>
                <h3 className='generate-popup-title'>{title}</h3>
            </div>
            <form onSubmit={handleSubmit} className='generate-popup-form'>
                <textarea
                    className='generate-popup-textarea'
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder='Enter your prompt...'
                    rows={4}
                    disabled={isGenerating}
                />
                <div className='generate-popup-controls'>
                    <label className='generate-popup-checkbox-label'>
                        <input
                            type='checkbox'
                            className='generate-popup-checkbox'
                            checked={createNewBlock}
                            onChange={(e) => setCreateNewBlock(e.target.checked)}
                            disabled={isGenerating}
                        />
                        <span>Create new block</span>
                    </label>
                    <select
                        className='generate-popup-select'
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={isGenerating}
                    >
                        {models.map((model) => (
                            <option key={model} value={model}>
                                {model}
                            </option>
                        ))}
                    </select>
                    <button type='submit' className='generate-popup-submit' disabled={isGenerating}>
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

GeneratePopup.displayName = 'GeneratePopup'

export default GeneratePopup
