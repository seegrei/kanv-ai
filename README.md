# kanv.ai

> AI-powered infinite canvas for visual thinking and content creation

[![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)](https://github.com/sergeichemodanov/kanv-ai)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**kanv.ai** is an infinite canvas application that combines the freedom of unlimited workspace with powerful AI generation capabilities. Create, organize, and generate content in a seamless, keyboard-first interface.

## ✨ Key Features

- **∞ Infinite Canvas** - Unlimited workspace with smooth pan & zoom
- **🤖 AI Generation** - Text & image generation
- **💬 Conversational AI** - Chat-based interface with persistent conversation history per block
- **📝 Rich Text Editing** - Notion-like slash commands for formatting (headings, lists, code blocks, etc.)
- **🎨 Image Support** - Paste from clipboard, stored offline in IndexedDB
- **⚡ High Performance** - Viewport culling enables smooth handling of 1000+ blocks
- **↩️ Full Undo/Redo** - Command pattern implementation for all operations
- **💾 Offline-First** - Local storage with IndexedDB, works without internet
- **⌨️ Keyboard Shortcuts** - Designed for power users with comprehensive shortcuts
- **🔧 Extensible** - Plugin architecture with block and action registries

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### First Steps

1. **Create blocks**: Press `T` for text block or `I` for image block
2. **Use AI**: Click the sparkle icon on any block to open AI chat
3. **Navigate**: Press `Space` or `H` to pan, `V` to select
4. **Format text**: Type `/` in text blocks for slash commands
5. **Multi-select**: Drag to create selection area or `Cmd/Ctrl+A` to select all

## 🤖 AI Capabilities

### Text Generation
- OpenAI, Claude, Gemini, DeepSeek, etc.
- Streaming responses for real-time feedback
- Context-aware generation using current block content
- Persistent conversation history per block

### Image Generation
- Gemini 2.5 Flash Image, GPT-5 Image variants
- Generate images from text prompts
- Edit existing images with new prompts
- Chat history includes previous images for context

### Bring Your Own API Key
To access premium models:
1. Get an API key from [OpenRouter](https://openrouter.ai/)
2. Open Settings in kanv.ai
3. Add your API key
4. Unlock access to all models

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `T` | Create text block |
| `I` | Create image block |
| `V` | Select mode |
| `H` or `Space` | Pan mode |
| `Cmd/Ctrl+A` | Select all |
| `Cmd/Ctrl+C` | Copy |
| `Cmd/Ctrl+V` | Paste |
| `Cmd/Ctrl+D` | Duplicate |
| `Backspace` | Delete selected |
| `Cmd/Ctrl+Z` | Undo |
| `Cmd/Ctrl+Shift+Z` | Redo |
| `/` | Slash commands (in text blocks) |

### Slash Commands
Type `/` in any text block to access:
- Headings: `/h1`, `/h2`, `/h3`
- Lists: `/bullet`, `/number`, `/todo`
- Blocks: `/quote`, `/code`, `/separator`

## 🛠 Tech Stack

### Core Technologies
- **React 18.3.1** - UI framework
- **Vite 6.0.5** - Build tool with HMR
- **Zustand 5.0.8** - State management
- **TipTap 3.9.1** - Rich text editor
- **IndexedDB** - Local storage for images and data

### AI Integration
- **OpenRouter API** - Access to AI models
- Request caching with LRU cache
- Token usage tracking and cost estimation
- Retry logic with exponential backoff

### Architecture
- **Plugin System** - Registry-based architecture for blocks and actions
- **Event-Driven** - EventBus for cross-component communication
- **Command Pattern** - Full undo/redo support for all operations
- **Custom Hooks** - Modular hooks for canvas interactions and block operations

## 🤝 Contributing

Contributions are welcome!

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

Built with ❤️
