import { createLogger } from './logger'
import { storageManager } from '../services/storage'
import { useElementsStore } from '../store/useElementsStore'
import { useHistoryStore } from '../store/useHistoryStore'
import { useSelectionStore } from '../store/useSelectionStore'

const logger = createLogger('ImportCanvas')

/**
 * Import canvas data from JSON file
 * Imports elements, canvas state, and images
 * @param {File} file - JSON file to import
 * @returns {Promise<void>}
 */
export async function importCanvas(file) {
    try {
        logger.log('Starting canvas import...')

        // Read file as text
        const text = await file.text()
        const importData = JSON.parse(text)

        // Validate structure
        if (!importData.version || !importData.elements || !importData.canvas) {
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

        logger.log('Importing', importData.elements.length, 'elements')

        // Clear current selection
        useSelectionStore.getState().clearSelection()

        // Clear history
        useHistoryStore.getState().commandHistory.clear()

        // Clear current elements
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

        // Import elements
        useElementsStore.getState().setElements(importData.elements)

        // Save to storage
        await storageManager.provider.saveBlocks(importData.elements)
        await storageManager.provider.saveCanvasState({
            offset: importData.canvas.offset,
            zoom: importData.canvas.zoom
        })

        // Save version to meta
        if (importData.version) {
            await storageManager.provider.saveMeta('version', importData.version)
        }

        logger.log('Import completed successfully, reloading page...')

        // Reload page to restore canvas state (offset, zoom)
        window.location.reload()
    } catch (error) {
        logger.error('Import failed:', error)
        alert('Import error: ' + error.message)
        throw error
    }
}
