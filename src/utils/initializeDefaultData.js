import imageStorageService from '../services/storage/ImageStorageService'
import { createLogger } from './logger'

const logger = createLogger('initializeDefaultData')

/**
 * Load image from URL and convert to data URL
 * @param {string} url - Image URL
 * @returns {Promise<string>} Data URL
 */
async function loadImageAsDataUrl(url) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'

        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height

            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0)

            const dataUrl = canvas.toDataURL('image/png')
            resolve(dataUrl)
        }

        img.onerror = (error) => {
            reject(new Error(`Failed to load image: ${url}`))
        }

        img.src = url
    })
}

/**
 * Initialize default data on the board
 * This is called when there is no saved data
 * @returns {Promise<Object>} Initial data with elements and canvas state
 */
export async function initializeDefaultData() {
    try {
        logger.log('Initializing default data')

        // Load and save images to IndexedDB
        const images = [
            { id: 'seegrei', url: '/seegrei.png' },
            { id: 'logo', url: '/logo.png' }
        ]

        for (const image of images) {
            try {
                const dataUrl = await loadImageAsDataUrl(image.url)
                await imageStorageService.saveImage(image.id, dataUrl)
                logger.log(`Saved image: ${image.id}`)
            } catch (error) {
                logger.error(`Failed to load image ${image.id}:`, error)
            }
        }

        // Default elements
        const defaultElements = [
            {
                id: 1762283741579,
                type: 'image',
                x: 684.4430111743337,
                y: 264.64646826211776,
                width: 249.94601373773696,
                height: 249.94601373773696,
                imageId: 'seegrei',
                aspectRatio: 1
            },
            {
                id: 1762283794085,
                type: 'image',
                x: 1404.6690288863465,
                y: 593.9118078306449,
                width: 249.94601373773696,
                height: 249.94601373773696,
                imageId: 'logo',
                aspectRatio: 1
            },
            {
                id: 'block_1762283815563_1_m72ksil',
                type: 'text',
                x: 973.9281244742393,
                y: 284.8297004060388,
                width: 578.970226599811,
                height: 124,
                content: '<h1>Hello World!</h1><p>I\'m <a target="_blank" rel="noopener noreferrer nofollow" href="https://seegrei.com/">@seegrei</a>, I created this tool for myself and I use it every day. Feel free to use it! Join the Discord community, I\'d appreciate any feedback.</p>',
                isMarkdownView: true
            },
            {
                id: 'block_1762283944106_2_q95jvps',
                type: 'text',
                x: 788.8421087493646,
                y: 739.4975216432309,
                width: 574.946617562314,
                height: 77,
                content: '<meta charset=\'utf-8\'><p data-pm-slice="0 0 []"><a target="_blank" rel="noopener nofollow noreferrer ugc" class="relative pointer-events-auto a cursor-pointer\n  \n  \n  \n  \n  underline\n  " href="http://kanv.ai/"><u>https://kanv.ai</u></a>&nbsp;– an infinite thought board: notes, to-dos, images, and AI on one browser canvas. Data is stored locally. Open source.</p>',
                isMarkdownView: true
            },
            {
                id: 1762283992497.6074,
                type: 'text',
                x: 1011.3180532551064,
                y: 483.209701068418,
                width: 300,
                height: 195,
                content: '<h1>Tasks</h1><ul data-type="taskList"><li class="task-item" data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>Mark this as completed</p></div></li><li class="task-item" data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>Write down your thoughts</p></div></li><li class="task-item" data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>Generate an image</p></div></li></ul><p></p>',
                isMarkdownView: true
            }
        ]

        // Default canvas state
        const defaultCanvasState = {
            offset: {
                x: -304.8510651044319,
                y: -91.13191917850571
            },
            zoom: 0.9008596884808502
        }

        logger.log('Default data initialized with', defaultElements.length, 'elements')

        return {
            elements: defaultElements,
            canvasState: defaultCanvasState,
            timestamp: Date.now(),
            version: '1.0'
        }
    } catch (error) {
        logger.error('Failed to initialize default data:', error)
        return null
    }
}
