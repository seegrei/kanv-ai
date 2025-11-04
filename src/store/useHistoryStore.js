import { create } from 'zustand';
import { createLogger } from '../utils/logger';
import { eventBus } from '../core/EventBus';
import CommandHistory from '../commands/CommandHistory';

const logger = createLogger('useHistoryStore');

const commandHistory = new CommandHistory(50);

/**
 * History Store
 * Manages undo/redo command history
 */
export const useHistoryStore = create((set, get) => ({
    commandHistory: commandHistory,
    canUndo: false,
    canRedo: false,

    // Execute command and add to history
    executeCommand: (command) => {
        commandHistory.execute(command);
        set({
            canUndo: commandHistory.canUndo(),
            canRedo: commandHistory.canRedo()
        });
    },

    // Add command to history without executing (for already performed actions)
    addCommandToHistory: (command) => {
        commandHistory.addWithoutExecute(command);
        set({
            canUndo: commandHistory.canUndo(),
            canRedo: commandHistory.canRedo()
        });
    },

    // Undo last command
    undo: () => {
        commandHistory.undo();
        set({
            canUndo: commandHistory.canUndo(),
            canRedo: commandHistory.canRedo()
        });
        eventBus.emit('history:undo', {
            canUndo: commandHistory.canUndo(),
            canRedo: commandHistory.canRedo()
        });
    },

    // Redo last undone command
    redo: () => {
        commandHistory.redo();
        set({
            canUndo: commandHistory.canUndo(),
            canRedo: commandHistory.canRedo()
        });
        eventBus.emit('history:redo', {
            canUndo: commandHistory.canUndo(),
            canRedo: commandHistory.canRedo()
        });
    },

    // Get all image references from commands in history (for garbage collection)
    getImageReferences: () => {
        const imageIds = new Set();
        const allCommands = commandHistory.getAllCommands();

        allCommands.forEach(command => {
            // DeleteBlockCommand - blocks can be restored
            if (command.blocks) {
                command.blocks.forEach(block => {
                    if (block.imageId) imageIds.add(block.imageId);
                });
            }

            // DuplicateBlockCommand -> CompositeCommand -> CreateBlockCommand
            if (command.commands) {
                command.commands.forEach(subCmd => {
                    if (subCmd.block?.imageId) {
                        imageIds.add(subCmd.block.imageId);
                    }
                });
            }

            // CreateBlockCommand - direct block reference
            if (command.block?.imageId) {
                imageIds.add(command.block.imageId);
            }
        });

        return imageIds;
    }
}));

export default useHistoryStore;
