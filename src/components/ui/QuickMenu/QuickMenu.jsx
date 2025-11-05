import { memo, useEffect, useRef } from 'react'
import { useSettingsStore } from '../../../store/useSettingsStore'
import { createLogger } from '../../../utils/logger'
import { exportCanvas } from '../../../utils/exportCanvas'
import { importCanvas } from '../../../utils/importCanvas'
import packageJson from '../../../../package.json'
import './QuickMenu.css'

const logger = createLogger('QuickMenu')

const QuickMenu = memo(() => {
    const { isQuickMenuOpen, closeQuickMenu, openSettings } = useSettingsStore()
    const menuRef = useRef(null)
    const fileInputRef = useRef(null)

    useEffect(() => {
        if (!isQuickMenuOpen) return

        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                const quickMenuButton = document.querySelector('.quick-menu-button')
                if (quickMenuButton && quickMenuButton.contains(e.target)) {
                    return
                }
                closeQuickMenu()
            }
        }

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeQuickMenu()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEscape)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [isQuickMenuOpen, closeQuickMenu])

    if (!isQuickMenuOpen) {
        return null
    }

    const handleSettingsClick = () => {
        logger.log('Settings clicked')
        openSettings()
    }

    const handleDiscordClick = () => {
        logger.log('Discord clicked')
        window.open('https://discord.gg/TXNSaTbm55', '_blank')
        closeQuickMenu()
    }

    const handleXClick = () => {
        logger.log('X (Twitter) clicked')
        window.open('https://x.com/seegrei', '_blank')
        closeQuickMenu()
    }

    const handleGitHubClick = () => {
        logger.log('GitHub clicked')
        window.open('https://github.com/seegrei/kanv-ai', '_blank')
        closeQuickMenu()
    }

    const handleKanvAiClick = () => {
        logger.log('kanv.ai clicked')
        window.open('https://kanv.ai', '_blank')
        closeQuickMenu()
    }

    const handleExportClick = async () => {
        logger.log('Export clicked')
        try {
            await exportCanvas()
            closeQuickMenu()
        } catch (error) {
            logger.error('Export failed:', error)
        }
    }

    const handleImportClick = () => {
        logger.log('Import clicked')
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]
        if (file) {
            try {
                await importCanvas(file)
                closeQuickMenu()
            } catch (error) {
                logger.error('Import failed:', error)
            }
        }
        // Reset input value to allow importing the same file again
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    return (
        <div className='quick-menu' ref={menuRef}>
            <input
                ref={fileInputRef}
                type='file'
                accept='application/json'
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
            <button className='quick-menu-item' onClick={handleExportClick}>
                <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
                    <path d='M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z'/>
                </svg>
                Save to file
            </button>
            <button className='quick-menu-item' onClick={handleImportClick}>
                <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
                    <path d='M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z'/>
                </svg>
                Open
            </button>
            <button className='quick-menu-item' onClick={handleSettingsClick}>
                <svg width='16' height='16' viewBox='0 0 32 32' fill='currentColor'>
                    <path d='M29.21 11.84a3.92 3.92 0 0 1-3.09-5.3 1.84 1.84 0 0 0-.55-2.07 14.75 14.75 0 0 0-4.4-2.55 1.85 1.85 0 0 0-2.09.58 3.91 3.91 0 0 1-6.16 0 1.85 1.85 0 0 0-2.09-.58 14.82 14.82 0 0 0-4.1 2.3 1.86 1.86 0 0 0-.58 2.13 3.9 3.9 0 0 1-3.25 5.36 1.85 1.85 0 0 0-1.62 1.49A14.14 14.14 0 0 0 1 16a14.32 14.32 0 0 0 .19 2.35 1.85 1.85 0 0 0 1.63 1.55A3.9 3.9 0 0 1 6 25.41a1.82 1.82 0 0 0 .51 2.18 14.86 14.86 0 0 0 4.36 2.51 2 2 0 0 0 .63.11 1.84 1.84 0 0 0 1.5-.78 3.87 3.87 0 0 1 3.2-1.68 3.92 3.92 0 0 1 3.14 1.58 1.84 1.84 0 0 0 2.16.61 15 15 0 0 0 4-2.39 1.85 1.85 0 0 0 .54-2.11 3.9 3.9 0 0 1 3.13-5.39 1.85 1.85 0 0 0 1.57-1.52A14.5 14.5 0 0 0 31 16a14.35 14.35 0 0 0-.25-2.67 1.83 1.83 0 0 0-1.54-1.49zM21 16a5 5 0 1 1-5-5 5 5 0 0 1 5 5z' />
                </svg>
                Settings
            </button>
            <button className='quick-menu-item' onClick={handleDiscordClick}>
                <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
                    <path d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z'/>
                </svg>
                Join Discord
            </button>
            <button className='quick-menu-item' onClick={handleXClick}>
                <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
                    <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'/>
                </svg>
                Follow on X
            </button>
            <button className='quick-menu-item' onClick={handleGitHubClick}>
                <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
                    <path d='M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z'/>
                </svg>
                GitHub
            </button>
            <button className='quick-menu-item' onClick={handleKanvAiClick}>
                <svg width='16' height='16' viewBox='0 0 16 16' fill='currentColor'>
                    <text x='50%' y='50%' dominantBaseline='middle' textAnchor='middle' fontSize='14' fontWeight='bold' fontFamily='system-ui, -apple-system, sans-serif'>K</text>
                </svg>
                kanv.ai – v{packageJson.version}
            </button>
        </div>
    )
})

QuickMenu.displayName = 'QuickMenu'

export default QuickMenu
