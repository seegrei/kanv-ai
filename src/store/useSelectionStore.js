import { create } from 'zustand';
import { createLogger } from '../utils/logger';
import { eventBus } from '../core/EventBus';

const logger = createLogger('useSelectionStore');

/**
 * Selection Store
 * Manages selected elements
 */
export const useSelectionStore = create((set, get) => ({
    selectedIds: [],
    editModeBlockId: null,

    // Set selected IDs (replace)
    setSelectedIds: (selectedIds) => {
        set({ selectedIds });
        eventBus.emit('block:selected', { ids: selectedIds });
    },

    // Clear selection
    clearSelection: () => {
        set({ selectedIds: [] });
        eventBus.emit('block:selected', { ids: [] });
    },

    // Select all elements
    selectAll: (elementIds) => {
        set({ selectedIds: elementIds });
        eventBus.emit('block:selected', { ids: elementIds });
    },

    // Check if element is selected
    isSelected: (id) => get().selectedIds.includes(id),

    // Check if has any selection
    hasSelection: () => get().selectedIds.length > 0,

    // Set edit mode for a block (for TextBlock editing)
    setEditMode: (blockId) => {
        set({ editModeBlockId: blockId });
        logger.info(`Edit mode enabled for block: ${blockId}`);
    },

    // Clear edit mode
    clearEditMode: () => {
        const prevBlockId = get().editModeBlockId;
        if (prevBlockId) {
            logger.info(`Edit mode disabled for block: ${prevBlockId}`);
        }
        set({ editModeBlockId: null });
    },

    // Check if block is in edit mode
    isEditMode: (blockId) => get().editModeBlockId === blockId,

    // Check if any block is in edit mode
    hasEditMode: () => get().editModeBlockId !== null
}));

export default useSelectionStore;
