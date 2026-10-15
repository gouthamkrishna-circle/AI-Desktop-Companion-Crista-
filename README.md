# 🌟 CRISTA — Personal AI Desktop Companion for Windows 11

**CRISTA** is an intelligent, autonomous, floating desktop companion built for Windows 11. Built with human-like conversational fluency, real-time screen awareness, unrestricted system control, and an autonomous self-evolution engine.

---

## ✨ Key Features & Capabilities

### 1. 🎙️ Conversational Human Voice Engine
- **Agora Real-Time Live Phone Call**: Full-duplex conversational voice with instant barge-in (<160ms interruption). Speak naturally, interrupt anytime.
- **High-Definition Neural Voice**: Warm, natural cadence with multi-language support (English, Telugu, Hindi).
- **Hands-Free "Hey Crista" Wake Word**: Ambient background speech detection.

### 2. 👁️ Continuous Ambient Screen Perception
- **Live Visual Awareness**: Silently inspects your active workspace (VS Code, ChatGPT, browser tabs, documents).
- **Contextual Assistance & Auto-Typing**: Analyzes on-screen content and can directly type solutions or replies into your active window.

### 3. 💻 Unrestricted Desktop & System Control
- **Universal Windows App Launcher**: Instant launch and control for Google Chrome, VS Code, Task Manager, Spotify, Terminal, Notepad, Calculator, Settings, and any installed application.
- **Direct Web & YouTube Search**: Compound commands like *"Open Chrome and search my song on YouTube"* open the browser and execute searches instantly.
- **PowerShell & Windows Shell Integration**: Run administrative commands and system tasks directly upon voice/text request.

### 4. 🧠 Real-Time Web Brain & Knowledge Synthesis
- **Wikipedia Live Knowledge**: Instant conceptual retrieval across science, history, biographies, and world facts.
- **DuckDuckGo Live Search**: Real-time web intelligence and topic summaries.

### 5. ⚡ Autonomous Self-Evolution Engine
- **Meta-Programming**: Crista can autonomously inspect, modify, and optimize her own codebase (styles, UI layout, logic, heuristics).
- **Continuous Learning & Adaptation**: Background engine optimizes heuristics (e.g. night owl mode, screen vision frequency) based on daily usage.

### 6. 🪟 Roaming Desktop Companion UI
- **Chibi Roaming & Draggable Companion**: Floating avatar that moves smoothly across your desktop.
- **Dual Display Modes**: Sleek compact orb mode and full expanded assistant panel.
- **Global Hotkeys**: `Ctrl+Shift+C` and `Ctrl+Shift+M` to summon, hide, or toggle modes anytime.

---

## 🛠️ Architecture

```
AI-Desktop-Companion-Crista/
├── package.json                   # Project scripts and dependencies
├── README.md                      # Documentation
├── start-crista.bat               # One-click Windows launcher
├── src/
│   ├── main/
│   │   ├── index.js               # Electron main process & IPC handlers
│   │   ├── automation.js          # Windows app launcher & shell automation
│   │   ├── shortcuts.js           # Global hotkey registration
│   │   └── tray.js                # Windows system tray menu
│   ├── renderer/
│   │   ├── index.html             # Chibi roaming companion & assistant UI
│   │   ├── assets/                # Crista avatar, icons, graphics
│   │   ├── scripts/
│   │   │   ├── voice.js           # Agora Live Call & WebRTC voice engine
│   │   │   ├── chat.js            # Chat manager & system action bridge
│   │   │   ├── cristaRoam.js      # Roaming physics & smooth animations
│   │   │   └── app.js             # UI state & navigation controller
│   │   └── styles/                # Modern frosted glass design system
│   └── services/
│       ├── ai/
│       │   ├── aiManager.js       # AI orchestration & tool execution pipeline
│       │   ├── localEngine.js     # Fast offline intent classification
│       │   └── geminiProvider.js  # Google Gemini multi-model integration
│       ├── voice/
│       │   ├── agoraVoiceAgent.js # Agora Conversational AI cloud engine
│       │   └── neuralVoice.js     # HD neural voice synthesis
│       ├── knowledge/
│       │   └── webBrainService.js # Wikipedia & DuckDuckGo live brain
│       └── evolution/
│           ├── selfEvolutionService.js # Code modification engine
│           └── autonomousLoop.js       # Background self-optimization
└── tests/                         # Full automated test suites
```

---

## 🚀 Getting Started

### Prerequisites
- Windows 10/11
- Node.js 20+ (Node 24 recommended)
- Git

### Installation
```bash
# Clone the repository
git clone https://github.com/gouthamkrishna-circle/AI-Desktop-Companion-Crista-.git
cd AI-Desktop-Companion-Crista-

# Install dependencies
npm install
```

### Running Crista
```bash
# Launch the desktop companion
npm start
```
Or double-click `start-crista.bat` to launch with high-priority audio flags.

### Running Tests
```bash
npm test
```

---

## 📄 License
MIT License
