import StorageManager from './StorageManager'
import IndexedDBProvider from './IndexedDBProvider'

// Create provider instance
const provider = new IndexedDBProvider()

// Create storage manager singleton
export const storageManager = new StorageManager(provider)

// Export classes for testing or custom implementations
export { StorageManager, IndexedDBProvider }
export { default as StorageProvider } from './StorageProvider'
