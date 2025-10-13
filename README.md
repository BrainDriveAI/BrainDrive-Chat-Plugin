# BrainDriveChat Plugin

The **BrainDrive Chat Plugin** is the default, modular chat experience for BrainDrive. It combines **chat**, **model selection**, **personas** and **conversation history** into a single, extensible UI you can customize, fork, and ship on your own terms. 

Think **WordPress for AI**—install the core, add this plugin, and you’re chatting with local or API models in minutes. **Your AI. Your Rules.**

## Features

- **Unified Chat Interface**: Complete AI chat experience with streaming support
- **Model Selection**: Dynamic model selection from configured providers
- **Conversation History**: Browse and manage previous conversations
- **Theme Support**: Automatic light/dark theme switching
- **Responsive Design**: Adapts to different screen sizes
- **Modular Architecture**: Easy to debug and enhance

## Components Integrated

This plugin combines the functionality of three separate components:

1. **AI Prompt Chat V2** - Main chat interface with streaming support
2. **Model Selection V2** - Dynamic model selection from providers
3. **AI Chat History** - Conversation history management

## Installation

1. Build the plugin:
   ```bash
   chmod +x build.sh
   ./build.sh
   ```

2. The plugin will be built to `dist/remoteEntry.js`

3. Install using the BrainDrive plugin system

## Configuration

The plugin supports the following configuration options:

- `initial_greeting`: Initial greeting message from AI
- `enable_streaming`: Enable streaming responses by default
- `max_conversation_history`: Maximum number of conversations to show
- `auto_save_conversations`: Automatically save conversations
- `show_model_selection`: Show model selection dropdown
- `show_conversation_history`: Show conversation history panel

## Development

### Prerequisites

- Node.js 16+
- npm or yarn

### Setup

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Architecture

The plugin follows a modular design pattern:

- **BrainDriveChat.tsx**: Main component combining all functionality
- **types.ts**: TypeScript type definitions
- **utils.ts**: Utility functions and helpers
- **BrainDriveChat.css**: Tailwind-like CSS utilities and component styles

## Styling

The plugin uses a custom CSS framework that mimics Tailwind CSS utilities while being compatible with the BrainDrive environment. It includes:

- Responsive design utilities
- Light/dark theme support
- Flexbox and grid utilities
- Spacing and typography utilities

## API Integration

The plugin integrates with the BrainDrive API for:

- User authentication
- Model management
- Conversation storage
- AI provider communication

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License

MIT License - see LICENSE file for details

## Version

1.0.0

## Author

BrainDrive Team
