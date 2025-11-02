/**
 * Logger utility for conditional logging based on environment
 * In production, only errors are logged to console
 * In development, all logs are shown
 */

const isDev = import.meta.env.DEV;

/**
 * Log levels
 */
export const LogLevel = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
};

/**
 * Logger class for structured logging
 */
class Logger {
    constructor(context = '') {
        this.context = context;
    }

    /**
     * Format log message with context
     */
    _formatMessage(message, data) {
        const prefix = this.context ? `[${this.context}]` : '';
        if (data !== undefined) {
            return [prefix, message, data];
        }
        return [prefix, message];
    }

    /**
     * Debug log - only in development
     */
    debug(message, data) {
        if (isDev) {
            console.debug(...this._formatMessage(message, data));
        }
    }

    /**
     * Info log - only in development
     */
    log(message, data) {
        if (isDev) {
            console.log(...this._formatMessage(message, data));
        }
    }

    /**
     * Info log (alias) - only in development
     */
    info(message, data) {
        if (isDev) {
            console.info(...this._formatMessage(message, data));
        }
    }

    /**
     * Warning log - only in development
     */
    warn(message, data) {
        if (isDev) {
            console.warn(...this._formatMessage(message, data));
        }
    }

    /**
     * Error log - always logged (even in production)
     * Errors should always be visible for debugging
     */
    error(message, data) {
        console.error(...this._formatMessage(message, data));
    }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create a logger with specific context
 * @param {string} context - Context name (e.g., 'Canvas', 'BlockFactory')
 * @returns {Logger} Logger instance with context
 */
export const createLogger = (context) => {
    return new Logger(context);
};

export default logger;
