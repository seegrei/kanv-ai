import { memo, useEffect } from 'react'
import { useViewStore } from '../../store/useViewStore'
import { useBoardsStore } from '../../store/useBoardsStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useUsageStatsStore } from '../../store/useUsageStatsStore'
import { VIEWS, SIDEBAR } from '../../constants'
import { BoardView } from './BoardView'
import { SettingsView } from './SettingsView'
import { StatisticsView } from './StatisticsView'
import './ViewContainer.css'

export const ViewContainer = memo(() => {
    const currentView = useViewStore((state) => state.currentView)
    const isLoading = useBoardsStore((state) => state.isLoading)

    useEffect(() => {
        const initializeApp = async () => {
            // Load settings and statistics first
            await Promise.all([
                useSettingsStore.getState().loadSettings(),
                useUsageStatsStore.getState().loadStatistics()
            ])

            // Then initialize boards
            await useBoardsStore.getState().initialize()
        }

        initializeApp()
    }, [])

    if (isLoading) {
        return (
            <div className='view-container'>
                <div className='view-container__loading'>Loading...</div>
            </div>
        )
    }

    return (
        <div className='view-container'>
            {currentView === VIEWS.BOARD && <BoardView />}
            {currentView === VIEWS.SETTINGS && <SettingsView />}
            {currentView === VIEWS.STATISTICS && <StatisticsView />}
        </div>
    )
})

ViewContainer.displayName = 'ViewContainer'
