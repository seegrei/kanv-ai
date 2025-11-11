import { memo, useCallback } from 'react'
import { useUsageStatsStore } from '../../store/useUsageStatsStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import './StatisticsView.css'

export const StatisticsView = memo(() => {
    const getAllData = useUsageStatsStore((state) => state.getAllData)
    const clearStatistics = useUsageStatsStore((state) => state.clearStatistics)
    const showStatistics = useSettingsStore((state) => state.showStatistics)
    const setShowStatistics = useSettingsStore((state) => state.setShowStatistics)

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

    const handleClearStatistics = useCallback(() => {
        if (window.confirm('Are you sure you want to clear all usage statistics? This action cannot be undone.')) {
            clearStatistics()
        }
    }, [clearStatistics])

    const handleToggleDisplay = useCallback((e) => {
        setShowStatistics(e.target.checked)
    }, [setShowStatistics])

    return (
        <div className='statistics-view'>
            <div className='statistics-view__container'>
                <h1 className='statistics-view__title'>Usage Statistics</h1>
                <p className='statistics-view__description'>
                    Track your AI generation usage and costs
                </p>

                <div className='statistics-view__section'>
                    <label className='statistics-view__checkbox-label'>
                        <input
                            type='checkbox'
                            checked={showStatistics}
                            onChange={handleToggleDisplay}
                            className='statistics-view__checkbox'
                        />
                        <span>Show usage statistics in bottom-left corner</span>
                    </label>
                </div>

                <div className='statistics-view__summary'>
                    <h2 className='statistics-view__section-title'>Total Usage</h2>
                    <div className='statistics-view__stats-grid'>
                        <div className='statistics-view__stat-card'>
                            <div className='statistics-view__stat-label'>Total Tokens</div>
                            <div className='statistics-view__stat-value'>{formatTokens(totalTokens)}</div>
                        </div>
                        <div className='statistics-view__stat-card'>
                            <div className='statistics-view__stat-label'>Total Cost</div>
                            <div className='statistics-view__stat-value'>${totalCost.toFixed(4)}</div>
                        </div>
                        <div className='statistics-view__stat-card'>
                            <div className='statistics-view__stat-label'>Total Requests</div>
                            <div className='statistics-view__stat-value'>{totalRequests}</div>
                        </div>
                    </div>
                </div>

                {dates.length > 0 && (
                    <div className='statistics-view__history'>
                        <h2 className='statistics-view__section-title'>History (Last 30 Days)</h2>
                        <div className='statistics-view__timeline'>
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
                                    <div key={date} className='statistics-view__day'>
                                        <div className='statistics-view__day-header'>
                                            <strong className='statistics-view__day-date'>{date}</strong>
                                            <span className='statistics-view__day-summary'>
                                                {formatTokens(dayTokens)} tokens • ${dayCost.toFixed(4)}
                                            </span>
                                        </div>
                                        <div className='statistics-view__models'>
                                            {Object.entries(dayData).map(([model, stats]) => (
                                                <div key={model} className='statistics-view__model'>
                                                    <span className='statistics-view__model-name'>{model}</span>
                                                    <span className='statistics-view__model-stats'>
                                                        {formatTokens(stats.tokens)} tokens • ${stats.cost.toFixed(4)} • {stats.requests} requests
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

                <div className='statistics-view__actions'>
                    <button
                        className='statistics-view__clear-button'
                        onClick={handleClearStatistics}
                    >
                        Clear All Statistics
                    </button>
                </div>
            </div>
        </div>
    )
})

StatisticsView.displayName = 'StatisticsView'
