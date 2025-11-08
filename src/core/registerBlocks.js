import { createLogger } from '../utils/logger'
import BlockRegistry from './BlockRegistry';
import TextBlock from '../components/blocks/TextBlock/TextBlock';
import ImageBlock from '../components/blocks/ImageBlock/ImageBlock';
import ChatBlock from '../components/blocks/ChatBlock/ChatBlock';
import { ELEMENT } from '../constants';

const logger = createLogger('registerBlocks')

/**
 * Register all built-in block types
 * This function should be called once at application startup
 */
export function registerBlocks() {
    logger.log('[registerBlocks] Starting block registration...')

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

    // Register Chat Block
    BlockRegistry.register('chat', {
        component: ChatBlock,
        label: 'Chat Block',
        icon: 'message-square',
        defaultSize: {
            width: ELEMENT.CHAT_BLOCK.DEFAULT_WIDTH,
            height: ELEMENT.CHAT_BLOCK.DEFAULT_HEIGHT
        },
        createDefault: () => ({})
    });

    logger.log('[registerBlocks] Registered all block types:', BlockRegistry.getTypes());
}

// Auto-register blocks on module import (helps with HMR)
if (import.meta.hot) {
    // In development, re-register blocks on HMR
    registerBlocks()
    import.meta.hot.accept(() => {
        logger.log('[registerBlocks] HMR: Re-registering blocks...')
        registerBlocks()
    })
}

export default registerBlocks;
