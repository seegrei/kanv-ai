import { createLogger } from './logger'
import { storageManager } from '../services/storage'
import { useElementsStore } from '../store/useElementsStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useSelectionStore } from '../store/useSelectionStore'

const logger = createLogger('ImportCanvas')

/**
 * Import canvas data from JSON file
 * Imports blocks, canvas state, images, and chat histories
 * Opens file picker dialog and imports selected file
 * @returns {Promise<void>}
 */
export async function importCanvas() {
    try {
        // Create file input
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'application/json,.json'

        // Wait for file selection
        const file = await new Promise((resolve) => {
            input.onchange = (e) => resolve(e.target.files[0])
            input.click()
        })

        // If no file selected, return
        if (!file) {
            logger.log('No file selected')
            return
        }

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
        if (!storageManager.boardProvider) {
            throw new Error('Board provider is not initialized')
        }

        await storageManager.boardProvider.saveBlocks(blocks)
        await storageManager.boardProvider.saveCanvasState({
            offset: importData.canvas.offset,
            zoom: importData.canvas.zoom
        })

        logger.log('Import completed successfully, reloading page...')

        // Reload page to restore canvas state (offset, zoom)
        window.location.reload()
    } catch (error) {
        logger.error('Import failed:', error)
        alert('Import error: ' + error.message)
        throw error
    }
}
