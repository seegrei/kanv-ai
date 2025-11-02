import { create } from 'zustand';
import { createLogger } from '../utils/logger';

const logger = createLogger('useToolStore');

/**
 * Tool Store
 * Manages canvas tool mode, pan offset, and zoom level
 */
export const useToolStore = create((set) => ({
    toolMode: 'select',
    panOffset: { x: 0, y: 0 },
    zoomLevel: 1,

    // Set tool mode (select/pan)
    setToolMode: (toolMode) => {
        set({ toolMode });
        logger.log('Tool mode changed to:', toolMode);
    }
}));

export default useToolStore;
