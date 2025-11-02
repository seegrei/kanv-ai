import { createLogger } from '../utils/logger'

const logger = createLogger('EventBus')

class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    emit(event, data) {
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                logger.error(`Error in event listener for "${event}":`, error);
            }
        });
    }

    clear(event) {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }

    hasListeners(event) {
        return this.listeners.has(event) && this.listeners.get(event).length > 0;
    }

    getListenerCount(event) {
        if (!this.listeners.has(event)) return 0;
        return this.listeners.get(event).length;
    }
}

export const eventBus = new EventBus();