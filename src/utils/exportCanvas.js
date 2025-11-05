import { createLogger } from './logger'
import { storageManager } from '../services/storage'

const logger = createLogger('ExportCanvas')

/**
 * Export canvas data to JSON file
 * Exports all elements, canvas state, and images as base64
 * @returns {Promise<void>}
 */
export async function exportCanvas() {
    try {
        logger.log('Starting canvas export...')

        // Collect elements and canvas state
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

        // Create export structure
        const exportData = {
            version: '1.0.0',
            timestamp: Date.now(),
            canvas: data.canvasState,
            elements: data.blocks,
            images
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
