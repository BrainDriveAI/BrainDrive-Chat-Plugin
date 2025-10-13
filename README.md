# BrainDriveChat Plugin

The **BrainDrive Chat Plugin** is the default, modular chat experience for BrainDrive. It combines **chat**, **model selection**, **personas** and **conversation history** into a single, extensible UI you can customize, fork, and ship on your own terms. 

![BrainDrive chat interface](https://raw.githubusercontent.com/BrainDriveAI/BrainDrive-Core/94401c8adfed9df554b955adaee709adcd943a55/images/chat-interface.png)

Think **WordPress for AI**—install the core, add this plugin, and you’re chatting with local or API models in minutes. **Your AI. Your Rules.**

## Features

- **Unified chat experience:** send prompts, stream responses, and browse conversation history in one place.  
- **Model selection:** pick from local or API models exposed by installed provider plugins (e.g., Ollama, OpenRouter). 
- **Drop-in modularity:** add the chat module to any page via the **Page Builder** UI. No code required to compose experiences.  
- **Decoupled services:** interacts with BrainDrive through **Service Bridges** (API, Events, Theme, Settings, Page Context, Plugin State) for forward-compatibility.
- **1-minute dev cycle:** edit → build → refresh, powered by **Module Federation** and BrainDrive’s plugin system.

## Quick Start (2 paths)

### A) One-click install via Plugin Manager

1. Open **BrainDrive → Plugin Manager → Install Plugin**.

   ![BrainDrive plugin manager](https://raw.githubusercontent.com/BrainDriveAI/BrainDrive-Core/94401c8adfed9df554b955adaee709adcd943a55/images/plugin-manager.png)

2. Paste this repository URL and click **Install**.

   ![Installing BrainDrive plugin](https://raw.githubusercontent.com/BrainDriveAI/BrainDrive-Core/94401c8adfed9df554b955adaee709adcd943a55/images/installing-plugin.png)

3. Open **Page Builder**, drag the **BrainDriveChat** component onto a page, **Publish**, and start chatting.

   ![Building a BrainDrive page](https://raw.githubusercontent.com/BrainDriveAI/BrainDrive-Core/94401c8adfed9df554b955adaee709adcd943a55/images/building-a-page.png)

> The Plugin Manager fetches and registers plugins dynamically; no app rebuild required.

### B) Local development & hot-reload

> Use this path if you want to modify or contribute. It gives you a rapid edit→build→refresh cycle.

1. **Clone & install**
   ```bash
   git clone https://github.com/YourOrg/BrainDrive-Chat-Plugin.git
   cd BrainDrive-Chat-Plugin
   npm install
   ```
2. **Point build output to BrainDrive (optional but fastest)**  
   In `webpack.config.js`, set `output.path` to your local BrainDrive plugins dir, e.g.:
   ```
   /path/to/BrainDrive-Core/backend/plugins/shared/BrainDriveChat/<version>/dist
   ```
   This lets BrainDrive load your freshly built `remoteEntry.js` without re-installing.

3. **Disable browser cache** in DevTools so the host app fetches the latest bundle on each refresh.

4. **Build (watch)**
   ```bash
   npm run dev   # or: npm run build, then refresh the BrainDrive page
   ```
   Edit code → build completes → refresh the BrainDrive page → changes appear.


## Usage

1. Add **BrainDriveChat** to any page via **Page Builder**.  
2. Choose a model (local or API) from the model selector (models come from installed provider plugins).  
3. Chat normally; your conversation history persists with BrainDrive storage.  

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
