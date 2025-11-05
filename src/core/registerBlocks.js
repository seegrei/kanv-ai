import { createLogger } from '../utils/logger'
import BlockRegistry from './BlockRegistry';
import TextBlock from '../components/blocks/TextBlock/TextBlock';
import ImageBlock from '../components/blocks/ImageBlock/ImageBlock';
import { ELEMENT } from '../constants';

const logger = createLogger('registerBlocks')

/**
 * Register all built-in block types
 * This function should be called once at application startup
 */
export function registerBlocks() {
    // Register Text Block
    BlockRegistry.register('text', {
        component: TextBlock,
        label: 'Text Block',
        icon: 'text',
        defaultSize: {
            width: ELEMENT.TEXT_BLOCK.MIN_WIDTH,
            height: ELEMENT.TEXT_BLOCK.MIN_HEIGHT
        },
        createDefault: () => ({
            content: ''
        })
    });

    // Register Image Block
    BlockRegistry.register('image', {
        component: ImageBlock,
        label: 'Image Block',
        icon: 'image',
        defaultSize: {
            width: ELEMENT.IMAGE.DEFAULT_WIDTH,
            height: ELEMENT.IMAGE.DEFAULT_HEIGHT
        },
        createDefault: () => ({
            imageId: null,
            aspectRatio: 1
        })
    });

    logger.log('[registerBlocks] Registered all block types:', BlockRegistry.getTypes());
}

export default registerBlocks;
