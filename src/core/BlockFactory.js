import BlockRegistry from './BlockRegistry';

/**
 * Block Factory
 * Centralized factory for creating block instances
 * Generates unique IDs, applies defaults, validates configuration
 */
class BlockFactory {
    /**
     * Generate unique block ID
     * @returns {string} Unique ID
     */
    static generateId() {
        const random = Math.random().toString(36).substring(2, 11);
        return `${Date.now()}_${random}`;
    }

    /**
     * Create a new block instance
     * @param {string} type - Block type (must be registered)
     * @param {Object} config - Block configuration
     * @param {number} config.x - X position
     * @param {number} config.y - Y position
     * @param {number} config.width - Block width (optional, uses default)
     * @param {number} config.height - Block height (optional, uses default)
     * @param {string} config.id - Custom ID (optional, auto-generated if not provided)
     * @returns {Object} Block data object
     */
    static create(type, config = {}) {
        // Validate type is registered
        if (!BlockRegistry.has(type)) {
            throw new Error(`Cannot create block: type "${type}" is not registered. Register it with BlockRegistry.register() first.`);
        }

        const blockConfig = BlockRegistry.get(type);
        const defaultSize = BlockRegistry.getDefaultSize(type);
        const createDefault = BlockRegistry.getDefaultCreator(type);

        // Generate ID if not provided
        const id = config.id || this.generateId();

        // Create default data for this block type
        const defaultData = createDefault ? createDefault() : {};

        // Merge with provided config
        const blockData = {
            id,
            type,
            x: config.x ?? 0,
            y: config.y ?? 0,
            width: config.width ?? defaultSize.width,
            height: config.height ?? defaultSize.height,
            ...defaultData,
            ...config
        };

        return blockData;
    }

    /**
     * Create a block at a specific position
     * @param {string} type - Block type
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} additionalConfig - Additional configuration
     * @returns {Object} Block data object
     */
    static createAt(type, x, y, additionalConfig = {}) {
        return this.create(type, {
            x,
            y,
            ...additionalConfig
        });
    }

    /**
     * Create a block with custom size
     * @param {string} type - Block type
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Block width
     * @param {number} height - Block height
     * @param {Object} additionalConfig - Additional configuration
     * @returns {Object} Block data object
     */
    static createWithSize(type, x, y, width, height, additionalConfig = {}) {
        return this.create(type, {
            x,
            y,
            width,
            height,
            ...additionalConfig
        });
    }
}

export default BlockFactory;
