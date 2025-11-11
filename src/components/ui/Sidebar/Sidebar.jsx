import { memo, useEffect } from 'react'
import { useSettingsStore } from '../../../store/useSettingsStore'
import { useViewStore } from '../../../store/useViewStore'
import { useBoardsStore } from '../../../store/useBoardsStore'
import { SIDEBAR, VIEWS } from '../../../constants'
import { BoardsList } from './BoardsList'
import { SidebarSection } from './SidebarSection'
import { SidebarButton } from './SidebarButton'
import packageJson from '../../../../package.json'
import './Sidebar.css'

export const Sidebar = memo(() => {
    const isSidebarCollapsed = useSettingsStore((state) => state.isSidebarCollapsed)
    const isSettingsLoaded = useSettingsStore((state) => state._isLoaded)
    const toggleSidebar = useSettingsStore((state) => state.toggleSidebar)
    const setView = useViewStore((state) => state.setView)
    const currentView = useViewStore((state) => state.currentView)
    const currentBoardId = useBoardsStore((state) => state.currentBoardId)

    const handleViewChange = (view) => {
        setView(view)
    }

    // Update CSS variable for sidebar width
    useEffect(() => {
        const width = isSidebarCollapsed ? SIDEBAR.COLLAPSED_WIDTH : SIDEBAR.WIDTH
        document.documentElement.style.setProperty('--sidebar-width', `${width}px`)
    }, [isSidebarCollapsed])

    // Add/remove class to disable transitions until settings are loaded
    useEffect(() => {
        if (isSettingsLoaded) {
            document.documentElement.classList.remove('settings-loading')
        } else {
            document.documentElement.classList.add('settings-loading')
        }
    }, [isSettingsLoaded])

    return (
        <>
            {/* Toggle Button */}
            {currentBoardId && currentView === VIEWS.BOARD && (
                <button
                    className={`sidebar-toggle ${!isSettingsLoaded ? 'sidebar-toggle--no-transition' : ''}`}
                    onClick={toggleSidebar}
                    aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <svg width='24' height='24' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth='1.4' strokeLinecap='round' strokeLinejoin='round'>
                        <rect x='4' y='4' width='16' height='16' rx='2' />
                        <line x1='10' y1='4' x2='10' y2='20' />
                    </svg>
                </button>
            )}

            {/* Logo */}
            {!isSidebarCollapsed && (
                <div className='sidebar-logo'>
                    kanv.ai
                </div>
            )}

            {/* Sidebar */}
            <div
                className={`sidebar ${isSidebarCollapsed ? 'sidebar--collapsed' : ''}`}
                style={{
                    width: isSidebarCollapsed ? SIDEBAR.COLLAPSED_WIDTH : SIDEBAR.WIDTH,
                    transition: isSettingsLoaded ? `width ${SIDEBAR.TRANSITION_DURATION}ms ease-in-out` : 'none'
                }}
            >
                <div className='sidebar__content'>
                    <div className='sidebar__scrollable'>
                        {/* Boards Section */}
                        <SidebarSection>
                            <BoardsList />
                        </SidebarSection>

                        <div className='sidebar__divider'></div>

                        {/* Views Section */}
                        <SidebarSection>
                            <SidebarButton
                                icon={<svg width='16' height='16' viewBox='0 0 32 32' fill='currentColor'>
                                    <path d='M29.21 11.84a3.92 3.92 0 0 1-3.09-5.3a1.84 1.84 0 0 0-.55-2.07a14.75 14.75 0 0 0-4.4-2.55a1.85 1.85 0 0 0-2.09.58a3.91 3.91 0 0 1-6.16 0a1.85 1.85 0 0 0-2.09-.58a14.82 14.82 0 0 0-4.1 2.3a1.86 1.86 0 0 0-.58 2.13a3.9 3.9 0 0 1-3.25 5.36a1.85 1.85 0 0 0-1.62 1.49A14.14 14.14 0 0 0 1 16a14.32 14.32 0 0 0 .19 2.35a1.85 1.85 0 0 0 1.63 1.55A3.9 3.9 0 0 1 6 25.41a1.82 1.82 0 0 0 .51 2.18a14.86 14.86 0 0 0 4.36 2.51a2 2 0 0 0 .63.11a1.84 1.84 0 0 0 1.5-.78a3.87 3.87 0 0 1 3.2-1.68a3.92 3.92 0 0 1 3.14 1.58a1.84 1.84 0 0 0 2.16.61a15 15 0 0 0 4-2.39a1.85 1.85 0 0 0 .54-2.11a3.9 3.9 0 0 1 3.13-5.39a1.85 1.85 0 0 0 1.57-1.52A14.5 14.5 0 0 0 31 16a14.35 14.35 0 0 0-.25-2.67a1.83 1.83 0 0 0-1.54-1.49zM21 16a5 5 0 1 1-5-5a5 5 0 0 1 5 5z' />
                                </svg>}
                                label='Settings'
                                active={currentView === VIEWS.SETTINGS}
                                onClick={() => handleViewChange(VIEWS.SETTINGS)}
                            />
                            <SidebarButton
                                icon={<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                    <line x1='18' y1='20' x2='18' y2='10' />
                                    <line x1='12' y1='20' x2='12' y2='4' />
                                    <line x1='6' y1='20' x2='6' y2='14' />
                                </svg>}
                                label='Statistics'
                                active={currentView === VIEWS.STATISTICS}
                                onClick={() => handleViewChange(VIEWS.STATISTICS)}
                            />
                        </SidebarSection>

                        <div className='sidebar__divider'></div>

                        {/* Community Section */}
                        <SidebarSection>
                            <SidebarButton
                                icon={<svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
                                    <path d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z' />
                                </svg>}
                                label='Discord chat'
                                onClick={() => window.open('https://discord.gg/TXNSaTbm55', '_blank')}
                            />
                            <SidebarButton
                                icon={<svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
                                    <path d='M18.244 2.25h3.308l-7.227 8.26l8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
                                </svg>}
                                label='Follow us'
                                onClick={() => window.open('https://x.com/seegrei', '_blank')}
                            />
                            <SidebarButton
                                icon={<svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
                                    <path d='M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12a12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547l-.8 3.747c1.824.07 3.48.632 4.674 1.488c.308-.309.73-.491 1.207-.491c.968 0 1.754.786 1.754 1.754c0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87c-3.874 0-7.004-2.176-7.004-4.87c0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754c.463 0 .898.196 1.207.49c1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197a.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248c.687 0 1.248-.561 1.248-1.249c0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25c0 .687.561 1.248 1.249 1.248c.688 0 1.249-.561 1.249-1.249c0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094a.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913c.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463a.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73c-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z' />
                                </svg>}
                                label='Reddit community'
                                onClick={() => window.open('https://reddit.com/r/kanv', '_blank')}
                            />
                            <SidebarButton
                                icon={<svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
                                    <path d='M12 0c-6.626 0-12 5.373-12 12c0 5.302 3.438 9.8 8.207 11.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416c-.546-1.387-1.333-1.756-1.333-1.756c-1.089-.745.083-.729.083-.729c1.205.084 1.839 1.237 1.839 1.237c1.07 1.834 2.807 1.304 3.492.997c.107-.775.418-1.305.762-1.604c-2.665-.305-5.467-1.334-5.467-5.931c0-1.311.469-2.381 1.236-3.221c-.124-.303-.535-1.524.117-3.176c0 0 1.008-.322 3.301 1.23c.957-.266 1.983-.399 3.003-.404c1.02.005 2.047.138 3.006.404c2.291-1.552 3.297-1.23 3.297-1.23c.653 1.653.242 2.874.118 3.176c.77.84 1.235 1.911 1.235 3.221c0 4.609-2.807 5.624-5.479 5.921c.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576c4.765-1.589 8.199-6.086 8.199-11.386c0-6.627-5.373-12-12-12z' />
                                </svg>}
                                label='GitHub'
                                onClick={() => window.open('https://github.com/seegrei/kanv-ai', '_blank')}
                            />
                        </SidebarSection>
                    </div>

                    {/* Version at bottom */}
                    <div className='sidebar__footer'>
                        <div className='sidebar__version'>
                            v{packageJson.version}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
})

Sidebar.displayName = 'Sidebar'
