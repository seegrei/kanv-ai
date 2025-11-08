import { create } from 'zustand';
import { createLogger } from '../utils/logger';
import { storageManager } from '../services/storage';
import { useElementsStore } from './useElementsStore';
import { useSelectionStore } from './useSelectionStore';
import { useClipboardStore } from './useClipboardStore';
import useHistoryStore from './useHistoryStore';
import BlockFactory from '../core/BlockFactory';
import { ELEMENT, CANVAS } from '../constants';
import CreateBlockCommand from '../commands/CreateBlockCommand';
import DeleteBlockCommand from '../commands/DeleteBlockCommand';
import DuplicateBlockCommand from '../commands/DuplicateBlockCommand';
import CompositeCommand from '../commands/CompositeCommand';

const logger = createLogger('useCanvasActions');

/**
 * Canvas Actions Store
 * Coordinates complex operations between multiple stores
 * Handles paste, duplicate, and other multi-store operations
 */
export const useCanvasActions = create((set) => ({

    // Copy selected elements to clipboard
    copySelectedElements: () => {
        const selectedIds = useSelectionStore.getState().selectedIds;
        if (selectedIds.length === 0) return;

        const elements = useElementsStore.getState().getElementsByIds(selectedIds);
        useClipboardStore.getState().copy(elements);
    },

    // Paste elements from clipboard
    pasteElements: async (offsetRef, zoomRef, imageData = null, textData = null) => {
        // Handle image paste
        if (imageData) {
            const currentOffset = offsetRef.current;
            const currentZoom = zoomRef.current;

            const viewportCenterX = -currentOffset.x / currentZoom + window.innerWidth / 2 / currentZoom;
            const viewportCenterY = -currentOffset.y / currentZoom + window.innerHeight / 2 / currentZoom;

            const img = new Image();
            img.onload = async () => {
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                const maxSize = CANVAS.MAX_IMAGE_SIZE;
                let imageWidth = img.naturalWidth;
                let imageHeight = img.naturalHeight;

                if (imageWidth > maxSize || imageHeight > maxSize) {
                    if (imageWidth > imageHeight) {
                        imageWidth = maxSize;
                        imageHeight = imageWidth / aspectRatio;
                    } else {
                        imageHeight = maxSize;
                        imageWidth = imageHeight * aspectRatio;
                    }
                }

                const blockWidth = imageWidth + ELEMENT.IMAGE.PADDING * 2;
                const blockHeight = imageHeight + ELEMENT.IMAGE.PADDING * 2;

                // Generate unique image ID
                const imageId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

                // Save image to IndexedDB
                await storageManager.saveImage(imageId, imageData);

                const newElement = {
                    id: BlockFactory.generateId(),
                    type: 'image',
                    x: viewportCenterX - blockWidth / 2,
                    y: viewportCenterY - blockHeight / 2,
                    width: blockWidth,
                    height: blockHeight,
                    imageId: imageId,
                    aspectRatio: aspectRatio
                };

                const command = new CreateBlockCommand(newElement);
                useHistoryStore.getState().executeCommand(command);
                useSelectionStore.getState().setSelectedIds([newElement.id]);
            };
            img.src = imageData;
            return;
        }

        // Handle text paste
        if (textData) {
            const currentOffset = offsetRef.current;
            const currentZoom = zoomRef.current;

            const viewportCenterX = -currentOffset.x / currentZoom + window.innerWidth / 2 / currentZoom;
            const viewportCenterY = -currentOffset.y / currentZoom + window.innerHeight / 2 / currentZoom;

            // Helper function to escape HTML entities
            const escapeHtml = (text) => {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            };

            // Convert text to HTML if needed
            let htmlContent = '';
            if (textData.type === 'html') {
                htmlContent = textData.content;
            } else {
                // Convert plain text to HTML paragraphs (escape HTML entities)
                const text = textData.content.trim();
                if (text === '') {
                    htmlContent = '<p></p>';
                } else {
                    const lines = text.split('\n');
                    htmlContent = lines.map(line => {
                        const trimmedLine = line.trim();
                        return trimmedLine === '' ? '<p><br></p>' : `<p>${escapeHtml(trimmedLine)}</p>`;
                    }).join('');
                }
            }

            const defaultSize = { width: ELEMENT.TEXT_BLOCK.MIN_WIDTH, height: ELEMENT.TEXT_BLOCK.MIN_HEIGHT };
            const newBlock = BlockFactory.createAt(
                'text',
                viewportCenterX - defaultSize.width / 2,
                viewportCenterY - defaultSize.height / 2,
                { content: htmlContent }
            );

            const command = new CreateBlockCommand(newBlock);
            useHistoryStore.getState().executeCommand(command);
            useSelectionStore.getState().setSelectedIds([newBlock.id]);

            logger.log('Text block created from paste:', newBlock.id);
            return;
        }

        // Handle element paste
        const clipboard = useClipboardStore.getState().clipboard;
        if (clipboard.length === 0) return;

        const currentOffset = offsetRef.current;
        const currentZoom = zoomRef.current;

        const viewportCenterX = -currentOffset.x / currentZoom + window.innerWidth / 2 / currentZoom;
        const viewportCenterY = -currentOffset.y / currentZoom + window.innerHeight / 2 / currentZoom;

        // Calculate clipboard center
        const clipboardCenterX = clipboard.reduce((sum, el) => sum + el.x, 0) / clipboard.length;
        const clipboardCenterY = clipboard.reduce((sum, el) => sum + el.y, 0) / clipboard.length;

        const offsetX = viewportCenterX - clipboardCenterX;
        const offsetY = viewportCenterY - clipboardCenterY;

        // Create new elements with offset and clone images/chat history if needed
        const newElements = await Promise.all(clipboard.map(async (el) => {
            const newElement = {
                ...el,
                id: BlockFactory.generateId(),
                x: el.x + offsetX,
                y: el.y + offsetY
            };

            // If element is an image with imageId, clone the image in IndexedDB
            if (el.type === 'image' && el.imageId) {
                const newImageId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                await storageManager.cloneImage(el.imageId, newImageId);
                newElement.imageId = newImageId;
            }

            // If element is a chat block, clone chat history and images
            if (el.type === 'chat') {
                const chatHistory = await storageManager.getBlockChatHistory(el.id);

                if (chatHistory.length > 0) {
                    // Clone all images from chat history
                    const newChatHistory = await Promise.all(chatHistory.map(async (message) => {
                        if (message.type === 'assistant' && message.contentType === 'image' && message.imageId) {
                            // Clone image
                            const newImageId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                            await storageManager.cloneImage(message.imageId, newImageId);

                            // Return message with new image ID
                            return {
                                ...message,
                                imageId: newImageId
                            };
                        }
                        return message;
                    }));

                    // Save chat history for new block
                    await storageManager.saveBlockChatHistory(newElement.id, newChatHistory);
                }
            }

            return newElement;
        }));

        // Create composite command for all paste operations
        const compositeCommand = new CompositeCommand('Вставить элементы');
        newElements.forEach(element => {
            compositeCommand.addCommand(new CreateBlockCommand(element));
        });

        // Execute command
        useHistoryStore.getState().executeCommand(compositeCommand);

        // Select pasted elements
        const newElementIds = newElements.map(el => el.id);
        useSelectionStore.getState().setSelectedIds(newElementIds);
    },

    // Duplicate selected elements
    duplicateSelectedElements: async () => {
        const selectedIds = useSelectionStore.getState().selectedIds;
        if (selectedIds.length === 0) return;

        const selectedElements = useElementsStore.getState().getElementsByIds(selectedIds);
        const offset = CANVAS.DUPLICATE_OFFSET;

        // Clone images and chat history BEFORE creating command (async operation)
        const duplicatedBlocks = await Promise.all(selectedElements.map(async (el) => {
            const newElement = {
                ...el,
                id: BlockFactory.generateId(),
                x: el.x + offset,
                y: el.y + offset
            };

            // If element is an image with imageId, clone the image in IndexedDB
            if (el.type === 'image' && el.imageId) {
                const newImageId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                await storageManager.cloneImage(el.imageId, newImageId);
                newElement.imageId = newImageId;
            }

            // If element is a chat block, clone chat history and images
            if (el.type === 'chat') {
                const chatHistory = await storageManager.getBlockChatHistory(el.id);

                if (chatHistory.length > 0) {
                    // Clone all images from chat history
                    const newChatHistory = await Promise.all(chatHistory.map(async (message) => {
                        if (message.type === 'assistant' && message.contentType === 'image' && message.imageId) {
                            // Clone image
                            const newImageId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                            await storageManager.cloneImage(message.imageId, newImageId);

                            // Return message with new image ID
                            return {
                                ...message,
                                imageId: newImageId
                            };
                        }
                        return message;
                    }));

                    // Save chat history for new block
                    await storageManager.saveBlockChatHistory(newElement.id, newChatHistory);
                }
            }

            return newElement;
        }));

        // Create and execute composite command
        const command = new DuplicateBlockCommand(duplicatedBlocks);
        useHistoryStore.getState().executeCommand(command);

        // Select duplicated elements
        const newElementIds = duplicatedBlocks.map(el => el.id);
        useSelectionStore.getState().setSelectedIds(newElementIds);
    },

    // Select all elements
    selectAllElements: () => {
        const elements = useElementsStore.getState().elements;
        const elementIds = elements.map(el => el.id);
        useSelectionStore.getState().selectAll(elementIds);
    },

    // Delete selected elements
    deleteSelectedElements: () => {
        const selectedIds = useSelectionStore.getState().selectedIds;
        if (selectedIds.length === 0) return;

        // Get full block data before deletion for undo support
        const elements = useElementsStore.getState().elements;
        const blocksToDelete = elements.filter(element => selectedIds.includes(element.id));

        const command = new DeleteBlockCommand(blocksToDelete);
        useHistoryStore.getState().executeCommand(command);
        useSelectionStore.getState().clearSelection();
    },

    // Create new text block in viewport center
    createTextBlock: (offsetRef, zoomRef) => {
        const currentOffset = offsetRef.current;
        const currentZoom = zoomRef.current;

        const viewportCenterX = -currentOffset.x / currentZoom + window.innerWidth / 2 / currentZoom;
        const viewportCenterY = -currentOffset.y / currentZoom + window.innerHeight / 2 / currentZoom;

        const defaultSize = { width: ELEMENT.TEXT_BLOCK.MIN_WIDTH, height: ELEMENT.TEXT_BLOCK.MIN_HEIGHT };
        const newBlock = BlockFactory.createAt('text', viewportCenterX - defaultSize.width / 2, viewportCenterY - defaultSize.height / 2);

        const command = new CreateBlockCommand(newBlock);
        useHistoryStore.getState().executeCommand(command);
        useSelectionStore.getState().setSelectedIds([newBlock.id]);

        logger.log('Text block created:', newBlock.id);
    },

    // Create new image block in viewport center
    createImageBlock: (offsetRef, zoomRef) => {
        const currentOffset = offsetRef.current;
        const currentZoom = zoomRef.current;

        const viewportCenterX = -currentOffset.x / currentZoom + window.innerWidth / 2 / currentZoom;
        const viewportCenterY = -currentOffset.y / currentZoom + window.innerHeight / 2 / currentZoom;

        const defaultSize = { width: ELEMENT.IMAGE.MIN_WIDTH, height: ELEMENT.IMAGE.MIN_HEIGHT };
        const newBlock = BlockFactory.createAt('image', viewportCenterX - defaultSize.width / 2, viewportCenterY - defaultSize.height / 2);

        const command = new CreateBlockCommand(newBlock);
        useHistoryStore.getState().executeCommand(command);
        useSelectionStore.getState().setSelectedIds([newBlock.id]);

        logger.log('Image block created:', newBlock.id);
    },

    // Create new chat block in viewport center
    createChatBlock: (offsetRef, zoomRef) => {
        const currentOffset = offsetRef.current;
        const currentZoom = zoomRef.current;

        const viewportCenterX = -currentOffset.x / currentZoom + window.innerWidth / 2 / currentZoom;
        const viewportCenterY = -currentOffset.y / currentZoom + window.innerHeight / 2 / currentZoom;

        const defaultSize = { width: ELEMENT.CHAT_BLOCK.DEFAULT_WIDTH, height: ELEMENT.CHAT_BLOCK.DEFAULT_HEIGHT };
        const newBlock = BlockFactory.createAt('chat', viewportCenterX - defaultSize.width / 2, viewportCenterY - defaultSize.height / 2);

        const command = new CreateBlockCommand(newBlock);
        useHistoryStore.getState().executeCommand(command);
        useSelectionStore.getState().setSelectedIds([newBlock.id]);

        logger.log('Chat block created:', newBlock.id);
    },

    // Create text block at specific position (for AI generation)
    createTextBlockAt: (x, y, width, height, content = '<p></p>') => {
        const newBlock = BlockFactory.createWithSize('text', x, y, width, height, { content });

        const command = new CreateBlockCommand(newBlock);
        useHistoryStore.getState().executeCommand(command);

        logger.log('Text block created at position:', newBlock.id, { x, y, width, height });
        return newBlock.id;
    },

    // Create image block at specific position (for AI generation)
    createImageBlockAt: (x, y, width, height, imageId = null) => {
        const newBlock = BlockFactory.createWithSize('image', x, y, width, height, {
            imageId,
            aspectRatio: width / height
        });

        const command = new CreateBlockCommand(newBlock);
        useHistoryStore.getState().executeCommand(command);

        logger.log('Image block created at position:', newBlock.id, { x, y, width, height });
        return newBlock.id;
    },

    // Create block without command (for AI generation before streaming completes)
    createBlockWithoutCommand: (type, x, y, width, height, data = {}) => {
        const newBlock = BlockFactory.createWithSize(type, x, y, width, height, data);
        useElementsStore.getState().addElement(newBlock);
        logger.log('Block created without command:', newBlock.id, { type, x, y, width, height });
        return newBlock.id;
    },

    // Add command for already created block (after AI generation completes)
    addBlockToHistory: (blockId) => {
        const block = useElementsStore.getState().getElementById(blockId);
        if (!block) {
            logger.error('Block not found:', blockId);
            return;
        }
        const command = new CreateBlockCommand(block);
        useHistoryStore.getState().addCommandToHistory(command);
        logger.log('Block added to history:', blockId);
    },

    // Delete block without command (for cleanup on error)
    deleteBlockWithoutCommand: (blockId) => {
        useElementsStore.getState().deleteElement(blockId);
        logger.log('Block deleted without command:', blockId);
    }
}));

export default useCanvasActions;
