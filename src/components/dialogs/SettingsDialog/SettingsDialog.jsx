import { memo, useState, useEffect, useCallback } from 'react'
import { useSettingsStore } from '../../../store/useSettingsStore'
import { useUsageStatsStore } from '../../../store/useUsageStatsStore'
import { createLogger } from '../../../utils/logger'
import packageJson from '../../../../package.json'
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
        setOpenRouterApiKey
    } = useSettingsStore()

    const {
        showStatistics,
        setShowStatistics,
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
                                Your API key is stored locally in your browser
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

                        <div className='settings-sidebar-links'>
                            <a
                                href='https://discord.gg/TXNSaTbm55'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='settings-sidebar-link'
                            >
                                <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
                                    <path d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z'/>
                                </svg>
                                Discord
                            </a>
                            <a
                                href='https://github.com/seegrei/kanv-ai'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='settings-sidebar-link'
                            >
                                <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
                                    <path d='M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z'/>
                                </svg>
                                Github
                            </a>
                            <a
                                href='https://kanv.ai'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='settings-version'
                            >
                                <span className='settings-version-link'>kanv.ai</span> – v{packageJson.version}
                            </a>
                        </div>
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
