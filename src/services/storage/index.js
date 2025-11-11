import StorageManager from './StorageManager'
import IndexedDBProvider from './IndexedDBProvider'
import MainStorageProvider from './MainStorageProvider'

// Create main provider instance (for boards list, settings, statistics)
const mainProvider = new MainStorageProvider()

// Create storage manager singleton with main provider
// Board provider will be set later via useBoardsStore
export const storageManager = new StorageManager(mainProvider)

// Export classes for testing or custom implementations
export { StorageManager, IndexedDBProvider, MainStorageProvider }
export { default as StorageProvider } from './StorageProvider'
