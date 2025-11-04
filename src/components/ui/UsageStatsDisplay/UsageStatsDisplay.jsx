import { useEffect, useState } from 'react'
import { useUsageStatsStore } from '../../../store/useUsageStatsStore'
import { STATISTICS } from '../../../constants'
import './UsageStatsDisplay.css'

/**
 * UsageStatsDisplay Component
 * Displays token and cost usage statistics in the bottom-left corner
 */
const UsageStatsDisplay = () => {
    const showStatistics = useUsageStatsStore((state) => state.showStatistics)
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

    return (
        <div className="usage-stats-display">
            Usage today: {formatTokens(usage.tokens)} tokens / {formatCost(usage.cost)}
        </div>
    )
}

export default UsageStatsDisplay
