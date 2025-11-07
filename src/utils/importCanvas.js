import { createLogger } from './logger'
import { storageManager } from '../services/storage'
import { useElementsStore } from '../store/useElementsStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useSelectionStore } from '../store/useSelectionStore'
import { getAppVersion } from './version'

const logger = createLogger('ImportCanvas')

/**
 * Import canvas data from JSON file
 * Imports blocks, canvas state, images, and chat histories
 * @param {File} file - JSON file to import
 * @returns {Promise<void>}
 */
export async function importCanvas(file) {
    try {
        logger.log('Starting canvas import...')

        // Read file as text
        const text = await file.text()
        const importData = JSON.parse(text)

        // Support backward compatibility: handle both 'blocks' and 'elements' (old format)
        const blocks = importData.blocks || importData.elements

        // Validate structure
        if (!importData.version || !blocks || !importData.canvas) {
            throw new Error('Invalid export file structure')
        }

        // Show confirmation dialog
        const confirmed = window.confirm(
            'Importing will delete all current data on the board. Continue?'
        )

        if (!confirmed) {
            logger.log('Import cancelled by user')
            return
        }

        logger.log('Importing', blocks.length, 'blocks')

        // Clear current selection
        useSelectionStore.getState().clearSelection()

        // Clear history
        useHistoryStore.getState().commandHistory.clear()

        // Clear current blocks
        useElementsStore.getState().setElements([])

        // Import images first
        if (importData.images) {
            const imageIds = Object.keys(importData.images)
            logger.log('Importing', imageIds.length, 'images')

            for (const imageId of imageIds) {
                const dataUrl = importData.images[imageId]
                await storageManager.saveImage(imageId, dataUrl)
            }
        }

        // Import chat histories
        if (importData.chatHistories) {
            const blockIds = Object.keys(importData.chatHistories)
            logger.log('Importing chat histories for', blockIds.length, 'blocks')

            for (const blockId of blockIds) {
                const messages = importData.chatHistories[blockId]
                if (messages && messages.length > 0) {
                    await storageManager.saveBlockChatHistory(blockId, messages)
                    logger.log('Imported', messages.length, 'messages for block:', blockId)
                }
            }
        }

        // Import blocks
        useElementsStore.getState().setElements(blocks)

        // Save to storage
        await storageManager.provider.saveBlocks(blocks)
        await storageManager.provider.saveCanvasState({
            offset: importData.canvas.offset,
            zoom: importData.canvas.zoom
        })

        // Save version to meta (use imported version or fallback to current app version)
        const versionToSave = importData.version || getAppVersion()
        await storageManager.provider.saveMeta('version', versionToSave)

        logger.log('Import completed successfully, reloading page...')

        // Reload page to restore canvas state (offset, zoom)
        window.location.reload()
    } catch (error) {
        logger.error('Import failed:', error)
        alert('Import error: ' + error.message)
        throw error
    }
}
