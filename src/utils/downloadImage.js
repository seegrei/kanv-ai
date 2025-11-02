import imageStorageService from '../services/storage/ImageStorageService'

/**
 * Download image from blob URL, data URL or imageId
 * @param {string} imageSource - Blob URL, data URL, or imageId
 * @param {string} filename - Name of the file (default: 'image')
 */
export const downloadImage = async (imageSource, filename = 'image') => {
    if (!imageSource) {
        console.warn('No image source provided')
        return
    }

    let imageUrl = imageSource

    // If it's an imageId (starts with 'img_'), load from IndexedDB
    if (imageSource.startsWith('img_')) {
        imageUrl = await imageStorageService.loadImage(imageSource)
        if (!imageUrl) {
            console.error('Failed to load image from IndexedDB')
            return
        }
    }

    // Extract file extension from data URL or use default
    let extension = 'png'

    if (imageUrl.startsWith('data:')) {
        // Extract MIME type from data URL (e.g., 'data:image/png;base64,...')
        const mimeMatch = imageUrl.match(/data:image\/(\w+);/)
        if (mimeMatch && mimeMatch[1]) {
            extension = mimeMatch[1]
        }
    } else if (imageUrl.startsWith('blob:')) {
        // For blob URLs, we need to fetch and convert to data URL
        try {
            const response = await fetch(imageUrl)
            const blob = await response.blob()
            const dataUrl = await blobToDataURL(blob)
            imageUrl = dataUrl

            // Extract extension from blob type
            if (blob.type.startsWith('image/')) {
                extension = blob.type.split('/')[1]
            }
        } catch (error) {
            console.error('Failed to convert blob URL:', error)
            return
        }
    } else {
        // Try to extract extension from URL
        const urlMatch = imageUrl.match(/\.(\w+)(?:\?|$)/)
        if (urlMatch && urlMatch[1]) {
            extension = urlMatch[1]
        }
    }

    // Add extension to filename if not already present
    const fullFilename = filename.includes('.') ? filename : `${filename}.${extension}`

    // Create download link
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = fullFilename

    // Trigger download
    document.body.appendChild(link)
    link.click()

    // Cleanup
    document.body.removeChild(link)

    // If we created a data URL from blob, revoke it
    if (imageSource.startsWith('img_')) {
        imageStorageService.revokeBlobUrl(imageUrl)
    }
}

/**
 * Convert Blob to Data URL
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}
