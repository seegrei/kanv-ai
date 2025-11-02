import { create } from 'zustand';
import { createLogger } from '../utils/logger';
import { eventBus } from '../core/EventBus';
import imageStorageService from '../services/storage/ImageStorageService';
import useHistoryStore from './useHistoryStore';

const logger = createLogger('useElementsStore');

/**
 * Elements Store
 * Manages canvas elements (blocks) data and CRUD operations
 */
export const useElementsStore = create((set, get) => ({
    elements: [],

    // Get element by ID
    getElementById: (id) => get().elements.find((el) => el.id === id),

    // Get multiple elements by IDs
    getElementsByIds: (ids) =>
        get().elements.filter((el) => ids.includes(el.id)),

    // Set elements (replace all)
    setElements: (elements) => set({ elements }),

    // Add single element
    addElement: (element) => {
        set((state) => ({
            elements: [...state.elements, element]
        }));
        eventBus.emit('block:created', { id: element.id, type: element.type });
    },

    // Add element without selection (for AI generation)
    addElementWithoutSelection: (element) => {
        set((state) => ({
            elements: [...state.elements, element]
        }));
        // No event emission to avoid auto-selection
    },

    // Update single element
    updateElement: (id, updates) => {
        // Check if updates actually change any values
        const element = get().elements.find((el) => el.id === id);
        if (element) {
            let hasChanges = false;
            for (const key in updates) {
                if (element[key] !== updates[key]) {
                    hasChanges = true;
                    break;
                }
            }

            // Only update if there are actual changes
            if (!hasChanges) {
                return;
            }
        }

        set((state) => ({
            elements: state.elements.map((el) =>
                el.id === id ? { ...el, ...updates } : el
            )
        }));
        eventBus.emit('block:updated', { id, updates });
    },

    // Update multiple elements
    updateMultipleElements: (ids, updatesFn) => {
        // Check if any element will actually change
        let hasChanges = false;
        const elements = get().elements;
        for (const element of elements) {
            if (ids.includes(element.id)) {
                const updates = updatesFn(element);
                for (const key in updates) {
                    if (element[key] !== updates[key]) {
                        hasChanges = true;
                        break;
                    }
                }
                if (hasChanges) break;
            }
        }

        // Only update if there are actual changes
        if (!hasChanges) {
            return;
        }

        set((state) => ({
            elements: state.elements.map((el) =>
                ids.includes(el.id) ? { ...el, ...updatesFn(el) } : el
            )
        }));
    },

    // Delete single element
    // Note: Images are not deleted immediately to support undo/redo
    // Use cleanupUnusedImages() to garbage collect orphaned images
    deleteElement: (id) => {
        set((state) => ({
            elements: state.elements.filter((el) => el.id !== id)
        }));
        eventBus.emit('block:deleted', { ids: [id] });
    },

    // Delete multiple elements
    // Note: Images are not deleted immediately to support undo/redo
    // Use cleanupUnusedImages() to garbage collect orphaned images
    deleteElements: (ids) => {
        set((state) => ({
            elements: state.elements.filter((el) => !ids.includes(el.id))
        }));
        eventBus.emit('block:deleted', { ids });
    },

    // Move elements by delta
    moveElements: (ids, deltaX, deltaY) => {
        set((state) => ({
            elements: state.elements.map((el) =>
                ids.includes(el.id)
                    ? {
                          ...el,
                          x: el.x + deltaX,
                          y: el.y + deltaY
                      }
                    : el
            )
        }));
    },

    // Find intersecting elements within bounds
    findIntersectingElements: (worldMinX, worldMaxX, worldMinY, worldMaxY) => {
        const { elements } = get();
        const { ELEMENT } = require('../constants');

        return elements.filter((element) => {
            const defaultWidth =
                element.type === 'image'
                    ? ELEMENT.IMAGE.MIN_WIDTH
                    : ELEMENT.TEXT_BLOCK.MIN_WIDTH;
            const defaultHeight =
                element.type === 'image'
                    ? ELEMENT.IMAGE.MIN_HEIGHT
                    : ELEMENT.TEXT_BLOCK.MIN_HEIGHT;
            const elementRight = element.x + (element.width || defaultWidth);
            const elementBottom = element.y + (element.height || defaultHeight);

            return (
                element.x < worldMaxX &&
                elementRight > worldMinX &&
                element.y < worldMaxY &&
                elementBottom > worldMinY
            );
        });
    },

    // Cleanup unused images from IndexedDB
    // This removes images that are not referenced by any element
    cleanupUnusedImages: async () => {
        try {
            const elements = get().elements;
            const usedImageIds = new Set();

            // 1. Collect image IDs from current elements
            elements.forEach((element) => {
                if (element.type === 'image' && element.imageId) {
                    usedImageIds.add(element.imageId);
                }
            });

            // 2. Collect image IDs from command history (for undo/redo support)
            const historyImageIds = useHistoryStore.getState().getImageReferences();
            historyImageIds.forEach(imageId => usedImageIds.add(imageId));

            // Get all stored images
            const allImageIds = await imageStorageService.getAllImageIds();

            // Delete only truly unused images (not in elements and not in history)
            const unusedImageIds = allImageIds.filter(id => !usedImageIds.has(id));

            for (const imageId of unusedImageIds) {
                await imageStorageService.deleteImage(imageId);
            }

            if (unusedImageIds.length > 0) {
                logger.log(`Cleaned up ${unusedImageIds.length} unused images`);
            }

            return { success: true, deletedCount: unusedImageIds.length };
        } catch (error) {
            logger.error('Failed to cleanup unused images:', error);
            return { success: false, error: error.message };
        }
    }
}));

export default useElementsStore;
