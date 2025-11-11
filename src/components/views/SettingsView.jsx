import { memo, useState, useEffect } from 'react'
import { useSettingsStore } from '../../store/useSettingsStore'
import './SettingsView.css'

export const SettingsView = memo(() => {
    const openRouterApiKey = useSettingsStore((state) => state.openRouterApiKey)
    const setOpenRouterApiKey = useSettingsStore((state) => state.setOpenRouterApiKey)

    const [apiKeyInput, setApiKeyInput] = useState('')

    useEffect(() => {
        setApiKeyInput(openRouterApiKey)
    }, [openRouterApiKey])

    const handleSubmit = (e) => {
        e.preventDefault()
        setOpenRouterApiKey(apiKeyInput)
    }

    return (
        <div className='settings-view'>
            <div className='settings-view__container'>
                <h1 className='settings-view__title'>Settings</h1>

                <div className='settings-view__section'>
                    <h2 className='settings-view__section-title'>API Keys</h2>
                    <p className='settings-view__description'>
                        Configure your API keys for AI generation services
                    </p>

                    <div className='settings-view__field'>
                        <label className='settings-view__label' htmlFor='openrouter-key'>
                            OpenRouter API Key
                        </label>
                        <form onSubmit={handleSubmit}>
                            <input
                                id='openrouter-key'
                                type='password'
                                className='settings-view__input'
                                value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                                placeholder='sk-or-v1-...'
                                autoComplete='off'
                            />
                            <p className='settings-view__hint'>
                                Get your API key from{' '}
                                <a
                                    href='https://openrouter.ai/keys'
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    className='settings-view__link'
                                >
                                    openrouter.ai/keys
                                </a>
                            </p>
                            <p className='settings-view__info'>
                                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                    <circle cx='12' cy='12' r='10' />
                                    <line x1='12' y1='16' x2='12' y2='12' />
                                    <line x1='12' y1='8' x2='12.01' y2='8' />
                                </svg>
                                Your API key is stored locally in your browser. Without your own API key, you can only use free text models (marked with :free) and cannot generate images.
                            </p>
                            <button type='submit' className='settings-view__save-button'>
                                Save
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
})

SettingsView.displayName = 'SettingsView'
