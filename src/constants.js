export const CANVAS = {
    BACKGROUND: {
        DOT_SIZE: 1,
        DOT_COLOR: 'rgba(0, 0, 0, 0.1)',
        GRID_SPACING: 20
    },
    ZOOM: {
        MIN: 0.2,
        MAX: 3,
        STEP: 0.1,
        DEFAULT: 0.7,
        SENSITIVITY: 0.005
    },
    DUPLICATE_OFFSET: 20,
    MAX_IMAGE_SIZE: 600,
    AUTO_SAVE_DEBOUNCE: 1000,
    IMAGE_CLEANUP_INTERVAL: 60000,
    SELECTION_BOX: {
        BORDER_WIDTH: 2,
        BORDER_COLOR: '#007bff',
        BACKGROUND_COLOR: 'rgba(0, 123, 255, 0.1)'
    }
}

export const ELEMENT = {
    TEXT_BLOCK: {
        MIN_WIDTH: 300,
        MIN_HEIGHT: 54,
        DEFAULT_WIDTH: 500,
        DEFAULT_HEIGHT: 54,
        PADDING: 16,
        BORDER_WIDTH: 2,
        BLOCK_SPACING: 20
    },
    IMAGE: {
        MIN_WIDTH: 100,
        MIN_HEIGHT: 100,
        DEFAULT_WIDTH: 300,
        DEFAULT_HEIGHT: 300,
        PADDING: 0
    },
    CHAT_BLOCK: {
        MIN_WIDTH: 450,
        MIN_HEIGHT: 400,
        DEFAULT_WIDTH: 450,
        DEFAULT_HEIGHT: 300,
        PADDING: 0
    }
}

export const FLOATING_TOOLBAR = {
    BUTTON_SIZE: 32,
    GAP: 4,
    PADDING: 6,
    OFFSET_FROM_BLOCK: 12,
    TRANSITION_DURATION: 200
}

const FREE_MODELS = [
    'openai/gpt-oss-20b:free',
    'deepseek/deepseek-chat-v3.1:free',
    'z-ai/glm-4.5-air:free',
    'minimax/minimax-m2:free',
    'qwen/qwen3-235b-a22b:free',
    'google/gemini-2.0-flash-exp:free',
]

export const AI = {
    FALLBACK_API_KEY: import.meta.env.VITE_OPENROUTER_FALLBACK_API_KEY || '',
    FREE_MODELS,
    MODELS: [
        // free
        ...FREE_MODELS,

        // paid
        'openai/gpt-5',
        'openai/gpt-5-mini',
        'openai/gpt-5-pro',
        'openai/gpt-4.1',
        'openai/gpt-4.1-mini',
        'openai/gpt-4o',
        'openai/gpt-4o-mini',

        'anthropic/claude-sonnet-4.5',
        'anthropic/claude-haiku-4.5',
        'anthropic/claude-opus-4.1',

        'google/gemini-2.5-flash',
        'google/gemini-2.5-flash-lite',
        'google/gemini-2.5-pro',

        'x-ai/grok-4-fast',
        'x-ai/grok-code-fast-1',

        'deepseek/deepseek-chat-v3.1',

        'z-ai/glm-4.6',
    ],
    IMAGE_MODELS: [
        'google/gemini-2.5-flash-image',
        'openai/gpt-5-image',
        'openai/gpt-5-image-mini',
    ]
}

export const STORAGE = {
    INDEXED_DB: {
        MAIN_DB_NAME: 'kanv_ai_main',
        BOARD_DB_PREFIX: 'kanv_ai_board_',
        DB_VERSION: 1,
        MAIN_STORES: {
            BOARDS: 'boards',
            SETTINGS: 'settings',
            STATISTICS: 'statistics',
            STATE: 'state'
        },
        BOARD_STORES: {
            BLOCKS: 'blocks',
            BLOCKS_CHAT_HISTORY: 'blocks_chat_history',
            CANVAS_STATE: 'canvas_state',
            IMAGES: 'images'
        }
    }
}

export const STATISTICS = {
    HISTORY_DAYS: 30,
    UPDATE_DEBOUNCE: 500
}

export const SIDEBAR = {
    WIDTH: 240,
    COLLAPSED_WIDTH: 0,
    TRANSITION_DURATION: 300
}

export const VIEWS = {
    BOARD: 'board',
    SETTINGS: 'settings',
    STATISTICS: 'statistics'
}

export const BOARD = {
    MIN_NAME_LENGTH: 1,
    MAX_NAME_LENGTH: 50,
    DEFAULT_NAME: 'New Board'
}
