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
    },
    Z_INDEX: {
        DEFAULT: 1,
        SELECTED: 2,
        DRAGGING: 1000
    },
    PERFORMANCE: {
        USE_RAF_FOR_RESIZE: true,
        USE_RAF_FOR_DRAG: true,
        USE_LOCAL_STATE_DURING_RESIZE: true,
        MIN_RESIZE_DELTA: 0.5
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
    }
}

export const FLOATING_TOOLBAR = {
    BUTTON_SIZE: 32,
    GAP: 4,
    PADDING: 6,
    OFFSET_FROM_BLOCK: 12,
    Z_INDEX: 500,
    TRANSITION_DURATION: 200
}

export const AI = {
    API_KEY: import.meta.env.VITE_OPENROUTER_API_KEY || '',
    MODELS: [
        'openai/gpt-5',
        'openai/gpt-5-mini',
        'openai/gpt-5-pro',
        'openai/gpt-5-codex',
        'openai/gpt-5-chat',
        'openai/gpt-5-nano',
        'openai/gpt-4.1',
        'openai/gpt-4.1-mini',
        'openai/gpt-4.1-nano',
        'openai/gpt-4o',
        'openai/gpt-4o-mini',
        'openai/o3',
        'openai/o3-pro',
        'openai/o3-deep-research',

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
    KEYS: {
        SETTINGS: 'kanv_ai_settings',
        CANVAS_DATA: 'kanv_ai_canvas_data'
    },
    INDEXED_DB: {
        DB_NAME: 'kanv_ai',
        IMAGES_STORE_NAME: 'images',
        DB_VERSION: 1
    }
}
