import { memo, useState, useEffect, useCallback } from 'react'
import { useSettingsStore } from '../../../store/useSettingsStore'
import { useUsageStatsStore } from '../../../store/useUsageStatsStore'
import { createLogger } from '../../../utils/logger'
import './SettingsDialog.css'

const logger = createLogger('SettingsDialog')

const SECTIONS = [
    { id: 'api', label: 'API Keys' },
    { id: 'usage', label: 'Usage Statistics' }
]

const SettingsDialog = memo(() => {
    const {
        isSettingsOpen,
        closeSettings,
        openRouterApiKey,
        setOpenRouterApiKey,
        showStatistics,
        setShowStatistics
    } = useSettingsStore()

    const {
        getAllData,
        clearStatistics
    } = useUsageStatsStore()

    const [activeSection, setActiveSection] = useState('api')
    const [apiKeyInput, setApiKeyInput] = useState('')
    const [showStatsInput, setShowStatsInput] = useState(true)

    // Initialize input with current value
    useEffect(() => {
        setApiKeyInput(openRouterApiKey)
        setShowStatsInput(showStatistics)
    }, [openRouterApiKey, showStatistics, isSettingsOpen])

    const handleCancel = useCallback(() => {
        setApiKeyInput(openRouterApiKey)
        setShowStatsInput(showStatistics)
        closeSettings()
    }, [openRouterApiKey, showStatistics, closeSettings])

    const handleClearStatistics = useCallback(() => {
        if (window.confirm('Are you sure you want to clear all usage statistics? This action cannot be undone.')) {
            clearStatistics()
            logger.log('Statistics cleared')
        }
    }, [clearStatistics])

    // Handle Escape key to close dialog
    useEffect(() => {
        if (!isSettingsOpen) return

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                handleCancel()
            }
        }

        document.addEventListener('keydown', handleEscape)

        return () => {
            document.removeEventListener('keydown', handleEscape)
        }
    }, [isSettingsOpen, handleCancel])

    if (!isSettingsOpen) {
        return null
    }

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            closeSettings()
        }
    }

    const handleSave = () => {
        setOpenRouterApiKey(apiKeyInput)
        setShowStatistics(showStatsInput)
        logger.log('Settings saved')
        closeSettings()
    }

    const renderContent = () => {
        switch (activeSection) {
            case 'api':
                return (
                    <div className='settings-content'>
                        <h2 className='settings-content-title'>API Keys</h2>
                        <p className='settings-content-description'>
                            Configure your API keys for AI generation services
                        </p>

                        <div className='settings-field'>
                            <label className='settings-label' htmlFor='openrouter-key'>
                                OpenRouter API Key
                            </label>
                            <input
                                id='openrouter-key'
                                type='password'
                                className='settings-input'
                                value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                                placeholder='sk-or-v1-...'
                            />
                            <p className='settings-hint'>
                                Get your API key from{' '}
                                <a
                                    href='https://openrouter.ai/keys'
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    className='settings-link'
                                >
                                    openrouter.ai/keys
                                </a>
                            </p>
                            <p className='settings-info-hint'>
                                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                    <circle cx='12' cy='12' r='10' />
                                    <line x1='12' y1='16' x2='12' y2='12' />
                                    <line x1='12' y1='8' x2='12.01' y2='8' />
                                </svg>
                                Your API key is stored locally in your browser. Without your own API key, you can only use free text models (marked with :free) and cannot generate images.
                            </p>
                        </div>
                    </div>
                )
            case 'usage':
                const allData = getAllData()
                const dates = Object.keys(allData).sort().reverse()

                // Format tokens with k suffix for thousands
                const formatTokens = (tokens) => {
                    if (tokens >= 1000) {
                        return `${(tokens / 1000).toFixed(1)}k`
                    }
                    return tokens.toString()
                }

                // Calculate total statistics
                let totalTokens = 0
                let totalCost = 0
                let totalRequests = 0

                for (const date in allData) {
                    for (const model in allData[date]) {
                        totalTokens += allData[date][model].tokens
                        totalCost += allData[date][model].cost
                        totalRequests += allData[date][model].requests
                    }
                }

                return (
                    <div className='settings-content'>
                        <h2 className='settings-content-title'>Usage Statistics</h2>
                        <p className='settings-content-description'>
                            Track your AI generation usage and costs
                        </p>

                        <div className='settings-field'>
                            <label className='settings-checkbox-label'>
                                <input
                                    type='checkbox'
                                    checked={showStatsInput}
                                    onChange={(e) => setShowStatsInput(e.target.checked)}
                                    className='settings-checkbox'
                                />
                                <span>Show usage statistics in bottom-left corner</span>
                            </label>
                        </div>

                        <div className='settings-stats-summary'>
                            <h3 className='settings-stats-title'>Total Usage</h3>
                            <div className='settings-stats-grid'>
                                <div className='settings-stat-item'>
                                    <div className='settings-stat-label'>Total Tokens</div>
                                    <div className='settings-stat-value'>{formatTokens(totalTokens)}</div>
                                </div>
                                <div className='settings-stat-item'>
                                    <div className='settings-stat-label'>Total Cost</div>
                                    <div className='settings-stat-value'>${totalCost.toFixed(4)}</div>
                                </div>
                                <div className='settings-stat-item'>
                                    <div className='settings-stat-label'>Total Requests</div>
                                    <div className='settings-stat-value'>{totalRequests}</div>
                                </div>
                            </div>
                        </div>

                        {dates.length > 0 && (
                            <div className='settings-stats-history'>
                                <h3 className='settings-stats-title'>History (Last 30 Days)</h3>
                                <div className='settings-stats-table'>
                                    {dates.map(date => {
                                        const dayData = allData[date]
                                        let dayTokens = 0
                                        let dayCost = 0
                                        let dayRequests = 0

                                        for (const model in dayData) {
                                            dayTokens += dayData[model].tokens
                                            dayCost += dayData[model].cost
                                            dayRequests += dayData[model].requests
                                        }

                                        return (
                                            <div key={date} className='settings-stats-day'>
                                                <div className='settings-stats-day-header'>
                                                    <strong>{date}</strong>
                                                    <span>{formatTokens(dayTokens)} tokens / ${dayCost.toFixed(4)}</span>
                                                </div>
                                                <div className='settings-stats-models'>
                                                    {Object.entries(dayData).map(([model, stats]) => (
                                                        <div key={model} className='settings-stats-model'>
                                                            <span className='settings-stats-model-name'>{model}</span>
                                                            <span className='settings-stats-model-stats'>
                                                                {formatTokens(stats.tokens)} tokens, ${stats.cost.toFixed(4)}, {stats.requests} requests
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        <br/>
                        <div className='settings-field'>
                            <button
                                className='settings-action-button settings-action-button-danger'
                                onClick={handleClearStatistics}
                            >
                                Clear All Statistics
                            </button>
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    return (
        <div className='settings-overlay' onClick={handleOverlayClick}>
            <div className='settings-dialog'>
                <div className='settings-header'>
                    <h1 className='settings-title'>Settings</h1>
                    <button
                        className='settings-close'
                        onClick={closeSettings}
                        title='Close'
                    >
                        <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
                            <line x1='18' y1='6' x2='6' y2='18' />
                            <line x1='6' y1='6' x2='18' y2='18' />
                        </svg>
                    </button>
                </div>

                <div className='settings-body'>
                    <div className='settings-sidebar'>
                        {SECTIONS.map((section) => (
                            <button
                                key={section.id}
                                className={`settings-section-button ${activeSection === section.id ? 'active' : ''}`}
                                onClick={() => setActiveSection(section.id)}
                            >
                                {section.label}
                            </button>
                        ))}
                    </div>

                    <div className='settings-main'>
                        {renderContent()}
                    </div>
                </div>

                <div className='settings-actions'>
                    <button
                        className='settings-action-button settings-action-button-secondary'
                        onClick={handleCancel}
                    >
                        Cancel
                    </button>
                    <button
                        className='settings-action-button settings-action-button-primary'
                        onClick={handleSave}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    )
})

SettingsDialog.displayName = 'SettingsDialog'

export default SettingsDialog
