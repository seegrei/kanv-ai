import { create } from 'zustand';
import { createLogger } from '../utils/logger';
import { CANVAS } from '../constants';

const logger = createLogger('useClipboardStore');

/**
 * Clipboard Store
 * Manages copy/paste/duplicate operations
 */
export const useClipboardStore = create((set, get) => ({
    clipboard: [],

    // Copy elements to clipboard
    copy: (elements) => {
        if (!elements || elements.length === 0) {
            logger.log('Nothing to copy');
            return;
        }

        set({ clipboard: elements });
        logger.log('Copied', elements.length, 'elements to clipboard');
    }
}));

export default useClipboardStore;
