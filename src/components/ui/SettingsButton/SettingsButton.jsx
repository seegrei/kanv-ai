import { memo } from 'react'
import { useSettingsStore } from '../../../store/useSettingsStore'
import { createLogger } from '../../../utils/logger'
import './SettingsButton.css'

const logger = createLogger('SettingsButton')

const SettingsButton = memo(() => {
    const openSettings = useSettingsStore((state) => state.openSettings)

    const handleClick = () => {
        logger.log('Settings clicked')
        openSettings()
    }

    return (
        <button
            className='settings-button'
            onClick={handleClick}
            title='Настройки'
        >
            <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
                <line x1='3' y1='6' x2='21' y2='6' />
                <line x1='3' y1='12' x2='21' y2='12' />
                <line x1='3' y1='18' x2='21' y2='18' />
            </svg>
        </button>
    )
})

SettingsButton.displayName = 'SettingsButton'

export default SettingsButton
