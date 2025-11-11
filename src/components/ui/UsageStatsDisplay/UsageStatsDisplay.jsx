import { useEffect, useState } from 'react'
import { useUsageStatsStore } from '../../../store/useUsageStatsStore'
import { useSettingsStore } from '../../../store/useSettingsStore'
import { STATISTICS, SIDEBAR } from '../../../constants'
import './UsageStatsDisplay.css'

/**
 * UsageStatsDisplay Component
 * Displays token and cost usage statistics in the bottom-left corner
 * Adjusts position based on sidebar state
 */
const UsageStatsDisplay = () => {
    const showStatistics = useSettingsStore((state) => state.showStatistics)
    const isSidebarCollapsed = useSettingsStore((state) => state.isSidebarCollapsed)
    const isSettingsLoaded = useSettingsStore((state) => state._isLoaded)
    const getTodayUsage = useUsageStatsStore((state) => state.getTodayUsage)
    const [usage, setUsage] = useState({ tokens: 0, cost: 0, requests: 0 })

    useEffect(() => {
        // Update usage display
        const updateUsage = () => {
            const todayUsage = getTodayUsage()
            setUsage(todayUsage)
        }

        // Initial update
        updateUsage()

        // Set up periodic updates
        const interval = setInterval(updateUsage, STATISTICS.UPDATE_DEBOUNCE)

        return () => clearInterval(interval)
    }, [getTodayUsage])

    // Don't render if statistics are disabled
    if (!showStatistics) {
        return null
    }

    // Format cost with appropriate precision
    const formatCost = (cost) => {
        if (cost === 0) {
            return '$0.00'
        }
        if (cost < 0.01) {
            return `$${cost.toFixed(4)}`
        }
        return `$${cost.toFixed(2)}`
    }

    // Format tokens with k suffix for thousands
    const formatTokens = (tokens) => {
        if (tokens >= 1000) {
            return `${(tokens / 1000).toFixed(1)}k`
        }
        return tokens.toString()
    }

    // Calculate left position based on sidebar state
    const leftPosition = isSidebarCollapsed ? 20 : SIDEBAR.WIDTH + 20

    return (
        <div
            className={`usage-stats-display ${!isSettingsLoaded ? 'usage-stats-display--no-transition' : ''}`}
            style={{ left: `${leftPosition}px` }}
        >
            Usage today: {formatTokens(usage.tokens)} tokens / {formatCost(usage.cost)}
        </div>
    )
}

export default UsageStatsDisplay
