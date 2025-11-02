import StorageManager from './StorageManager'
import LocalStorageProvider from './LocalStorageProvider'

// Create provider instance
const provider = new LocalStorageProvider()

// Create storage manager singleton
export const storageManager = new StorageManager(provider)

// Export classes for testing or custom implementations
export { StorageManager, LocalStorageProvider }
export { default as StorageProvider } from './StorageProvider'
export { default as ImageStorageService } from './ImageStorageService'
