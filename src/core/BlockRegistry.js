import { createLogger } from '../utils/logger'

const logger = createLogger('BlockRegistry')

/**
 * Block Registry
 * Central registry for all block types in the application
 * Provides plugin architecture for adding new block types
 */
class BlockRegistry {
    static blocks = new Map();

    /**
     * Register a new block type
     * @param {string} type - Unique block type identifier
     * @param {Object} config - Block configuration
     * @param {React.Component} config.component - React component for rendering
     * @param {Function} config.createDefault - Function to create default block data
     * @param {Object} config.defaultSize - Default size {width, height}
     * @param {string} config.icon - Icon identifier for toolbar
     * @param {string} config.label - Human-readable label
     */
    static register(type, config) {
        if (!type) {
            throw new Error('Block type is required');
        }

        if (this.blocks.has(type)) {
            logger.warn(`Block type "${type}" is already registered. Overwriting.`);
        }

        if (!config.component) {
            throw new Error(`Block type "${type}" must have a component`);
        }

        if (!config.createDefault || typeof config.createDefault !== 'function') {
            throw new Error(`Block type "${type}" must have a createDefault function`);
        }

        this.blocks.set(type, {
            type,
            component: config.component,
            createDefault: config.createDefault,
            defaultSize: config.defaultSize || { width: 300, height: 200 },
            icon: config.icon || 'default',
            label: config.label || type,
            ...config
        });

        logger.log(`[BlockRegistry] Registered block type: ${type}`);
    }

    /**
     * Get block configuration by type
     * @param {string} type - Block type
     * @returns {Object|null} Block configuration or null if not found
     */
    static get(type) {
        return this.blocks.get(type) || null;
    }

    /**
     * Get React component for a block type
     * @param {string} type - Block type
     * @returns {React.Component|null} Component or null if not found
     */
    static getComponent(type) {
        const config = this.get(type);
        return config ? config.component : null;
    }

    /**
     * Get default data creator function for a block type
     * @param {string} type - Block type
     * @returns {Function|null} Creator function or null if not found
     */
    static getDefaultCreator(type) {
        const config = this.get(type);
        return config ? config.createDefault : null;
    }

    /**
     * Get default size for a block type
     * @param {string} type - Block type
     * @returns {Object} Default size {width, height}
     */
    static getDefaultSize(type) {
        const config = this.get(type);
        return config ? config.defaultSize : { width: 300, height: 200 };
    }

    /**
     * Check if a block type is registered
     * @param {string} type - Block type
     * @returns {boolean}
     */
    static has(type) {
        return this.blocks.has(type);
    }

    /**
     * Get all registered block types
     * @returns {Array<string>} Array of block type identifiers
     */
    static getTypes() {
        return Array.from(this.blocks.keys());
    }
}

export default BlockRegistry;
