import { blockActionRegistry } from '../core/BlockActionRegistry'
import { eventBus } from '../core/EventBus'
import LightningIcon from '../components/icons/LightningIcon/LightningIcon'
import DownloadIcon from '../components/icons/DownloadIcon/DownloadIcon'
import TrashIcon from '../components/icons/TrashIcon/TrashIcon'
import DeleteBlockCommand from '../commands/DeleteBlockCommand'
import { downloadAsMarkdown } from '../utils/export/htmlToMarkdown'
import { downloadImage } from '../utils/export/downloadImage'
import { createLogger } from '../utils/logger'

const logger = createLogger('blockActions')

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

    // Clear history action for chat blocks
    blockActionRegistry.registerAction({
        id: 'clear-chat-history',
        types: ['chat'],
        icon: <TrashIcon />,
        label: 'Clear history',
        group: 'chat',
        order: 1,
        handler: (blockId, blockType, context) => {
            const element = context.actions.getElementById(blockId)
            if (element && element.chatHistory && element.chatHistory.length > 0) {
                if (confirm('Are you sure you want to clear the chat history?')) {
                    context.actions.updateElement(blockId, { chatHistory: [] })
                }
            }
        },
        isVisible: (blockId, blockType, context) => {
            const element = context.actions.getElementById(blockId)
            return element && element.chatHistory && element.chatHistory.length > 0
        }
    })

    // Delete action for text and image blocks
    blockActionRegistry.registerAction({
        id: 'delete',
        types: ['text', 'image'],
        icon: <TrashIcon />,
        label: 'Delete',
        group: 'export',
        order: 2,
        handler: (blockId, blockType, context) => {
            const element = context.actions.getElementById(blockId)
            if (element) {
                const command = new DeleteBlockCommand(element)
                context.stores.historyStore.executeCommand(command)
                context.stores.selectionStore.clearSelection()
            }
        }
    })

    // Delete action for chat blocks
    blockActionRegistry.registerAction({
        id: 'delete-chat',
        types: ['chat'],
        icon: <TrashIcon />,
        label: 'Delete',
        group: 'export',
        order: 2,
        handler: (blockId, blockType, context) => {
            const element = context.actions.getElementById(blockId)
            if (element) {
                const command = new DeleteBlockCommand(element)
                context.stores.historyStore.executeCommand(command)
                context.stores.selectionStore.clearSelection()
            }
        }
    })

    logger.log('Block actions initialized')
}

export default initializeBlockActions
