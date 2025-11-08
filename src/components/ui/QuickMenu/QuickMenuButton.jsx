import { memo } from 'react'
import { useSettingsStore } from '../../../store/useSettingsStore'
import { createLogger } from '../../../utils/logger'
import './QuickMenuButton.css'

const logger = createLogger('QuickMenuButton')

const QuickMenuButton = memo(() => {
    const { isQuickMenuOpen, openQuickMenu, closeQuickMenu } = useSettingsStore()

    const handleClick = () => {
        logger.log('Quick menu button clicked')
        if (isQuickMenuOpen) {
            closeQuickMenu()
        } else {
            openQuickMenu()
        }
    }

    return (
        <button
            className='quick-menu-button'
            onClick={handleClick}
            title='Menu'
        >
            <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
                <line x1='3' y1='6' x2='21' y2='6' />
                <line x1='3' y1='12' x2='21' y2='12' />
                <line x1='3' y1='18' x2='21' y2='18' />
            </svg>
        </button>
    )
})

QuickMenuButton.displayName = 'QuickMenuButton'

export default QuickMenuButton
