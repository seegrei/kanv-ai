import { blockActionRegistry } from '../core/BlockActionRegistry'
import { eventBus } from '../core/EventBus'
import LightningIcon from '../components/icons/LightningIcon/LightningIcon'
import DownloadIcon from '../components/icons/DownloadIcon/DownloadIcon'
import { downloadAsMarkdown } from '../utils/htmlToMarkdown'
import { downloadImage } from '../utils/downloadImage'

/**
 * Initialize block actions
 * Register actions for different block types here
 *
 * This function is called once on app startup
 */
export const initializeBlockActions = () => {
    // Generate action for text and image blocks
    blockActionRegistry.registerAction({
        id: 'generate',
        types: ['text', 'image'],
        icon: <LightningIcon />,
        text: 'Generate',
        label: 'Generate',
        group: 'ai',
        order: 1,
        variant: 'primary',
        handler: (blockId, blockType, context) => {
            // Emit event to open generate popup
            eventBus.emit('block:generate', { blockId })
        }
    })

    // Download markdown action for text blocks
    blockActionRegistry.registerAction({
        id: 'download-markdown',
        types: ['text'],
        icon: <DownloadIcon />,
        label: 'Download .md',
        group: 'export',
        order: 1,
        handler: (blockId, blockType, context) => {
            const element = context.actions.getElementById(blockId)
            if (element && element.content) {
                downloadAsMarkdown(element.content, 'text-block.md')
            }
        }
    })

    // Download image action for image blocks
    blockActionRegistry.registerAction({
        id: 'download-image',
        types: ['image'],
        icon: <DownloadIcon />,
        label: 'Download image',
        group: 'export',
        order: 1,
        handler: async (blockId, blockType, context) => {
            const element = context.actions.getElementById(blockId)
            if (element && element.imageId) {
                await downloadImage(element.imageId, 'image')
            }
        }
    })

    console.log('Block actions initialized')
}

export default initializeBlockActions
