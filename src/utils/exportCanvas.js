import { createLogger } from './logger'
import { storageManager } from '../services/storage'
import { getAppVersion } from './version'

const logger = createLogger('ExportCanvas')

/**
 * Export canvas data to JSON file
 * Exports all blocks, canvas state, images as base64, and chat histories
 * @returns {Promise<void>}
 */
export async function exportCanvas() {
    try {
        logger.log('Starting canvas export...')

        // Collect blocks and canvas state
        const data = storageManager.collectData()

        // Find all image elements
        const imageElements = data.blocks.filter(el => el.type === 'image' && el.imageId)

        // Load all images as base64 data URLs
        const images = {}
        for (const element of imageElements) {
            const imageId = element.imageId
            logger.log('Loading image:', imageId)

            const dataUrl = await storageManager.loadImageAsDataUrl(imageId)

            if (dataUrl) {
                images[imageId] = dataUrl
            } else {
                logger.warn('Failed to load image:', imageId)
            }
        }

        // Load chat histories for all blocks
        const chatHistories = {}
        for (const block of data.blocks) {
            const history = await storageManager.getBlockChatHistory(block.id)
            if (history && history.length > 0) {
                chatHistories[block.id] = history
                logger.log('Loaded chat history for block:', block.id, '(' + history.length + ' messages)')
            }
        }

        // Load images from chat histories
        for (const blockId in chatHistories) {
            const messages = chatHistories[blockId]
            for (const message of messages) {
                if (message.contentType === 'image' && message.imageId) {
                    const imageId = message.imageId
                    if (!images[imageId]) {
                        logger.log('Loading image from chat history:', imageId)
                        const dataUrl = await storageManager.loadImageAsDataUrl(imageId)
                        if (dataUrl) {
                            images[imageId] = dataUrl
                        } else {
                            logger.warn('Failed to load image from chat history:', imageId)
                        }
                    }
                }
            }
        }

        // Create export structure
        const exportData = {
            version: getAppVersion(),
            canvas: data.canvasState,
            blocks: data.blocks,
            images,
            chatHistories
        }

        // Convert to JSON
        const json = JSON.stringify(exportData, null, 2)

        // Create blob and download
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        // Create temporary link and trigger download
        const a = document.createElement('a')
        a.href = url
        a.download = `kanv-ai-export-${Date.now()}.json`
        document.body.appendChild(a)
        a.click()

        // Cleanup
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        logger.log('Export completed successfully')
    } catch (error) {
        logger.error('Export failed:', error)
        throw error
    }
}
