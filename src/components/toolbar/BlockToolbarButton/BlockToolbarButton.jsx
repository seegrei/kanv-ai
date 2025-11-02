import { memo } from 'react'

/**
 * Button component for Block Floating Toolbar
 * Displays an icon and optional text, executes an action when clicked
 *
 * @param {Object} props
 * @param {ReactNode} props.icon - Icon element to display (SVG or other)
 * @param {string} props.text - Optional text to display next to icon
 * @param {Function} props.onClick - Click handler
 * @param {string} props.label - Tooltip label
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {string} props.variant - Button variant ('default', 'primary') for styling
 */
const BlockToolbarButton = memo(({ icon, text, onClick, label, disabled = false, variant = 'default' }) => {
    const handleClick = (e) => {
        e.stopPropagation()
        if (!disabled && onClick) {
            onClick(e)
        }
    }

    const className = [
        'block-toolbar-button',
        disabled && 'block-toolbar-button--disabled',
        variant === 'primary' && 'block-toolbar-button--primary',
        text && 'block-toolbar-button--with-text'
    ].filter(Boolean).join(' ')

    return (
        <button
            className={className}
            onClick={handleClick}
            title={label}
            disabled={disabled}
            type='button'
        >
            {icon}
            {text && <span className='block-toolbar-button-text'>{text}</span>}
        </button>
    )
})

BlockToolbarButton.displayName = 'BlockToolbarButton'

export default BlockToolbarButton
