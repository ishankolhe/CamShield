# CamShield 🛡️

A privacy-focused Manifest V3 browser extension that automatically mutes or shields your webcam stream during calls when you turn away, cough, sneeze, or eat. All computer vision and AI processing runs 100% locally on your machine using MediaPipe.

---

## ✨ Features

- **Local & Private**: Powered by client-side MediaPipe (FaceLandmarker & HandLandmarker) — zero video feeds ever leave your machine.
- **Smart Mute Triggers**:
  - Head turn / looking away
  - Cough / sneeze detection (hand covering face gestures)
  - Eating / drinking detection
- **Customizable Fallback Card**: Seamlessly replaces your camera stream with a polished "Camera Temporarily Muted" card or frozen frame.
- **Configurable Sensitivities**: Fine-tune detection thresholds and hysteresis timings in the options page.
- **Meeting Platform Support**: Patches `navigator.mediaDevices.getUserMedia` seamlessly across Google Meet, Zoom Web, Teams, and others.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- `npm`

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/ishankolhe/CamShield.git
cd CamShield

# 2. Install dependencies
npm install

# 3. Build the extension
npm run build
```

### Load in Google Chrome / Brave / Edge

1. Navigate to `chrome://extensions` in your browser.
2. Toggle on **Developer mode** in the top right corner.
3. Click **Load unpacked** in the top left corner.
4. Select the `dist/` directory inside this project folder.

---

## 🛠️ Development

```bash
npm run dev          # Start Vite dev server with HMR
npm run build        # Typecheck and produce production build to dist/
npm test             # Run test suite with Vitest
npm run test:watch    # Run tests in watch mode
```

---

## 🏗️ Architecture

```
CamShield/
├── src/
│   ├── background/       # Background service worker (settings, badge, hotkeys)
│   ├── content/
│   │   ├── isolated.ts   # Relays settings & messages between extension APIs & page
│   │   └── main-world.ts # Hooks getUserMedia, runs frame loop & canvas compositor
│   ├── lib/
│   │   ├── detector.ts   # MediaPipe Face & Hand Landmarker integration
│   │   ├── state-machine.ts # Hysteresis-backed mute state transitions
│   │   └── types.ts      # Shared definitions and default configurations
│   ├── popup/            # Extension toolbar popup (quick toggle, status)
│   └── options/          # Full settings dashboard with camera preview
├── public/
│   ├── mediapipe/        # Local WebAssembly runtime binaries
│   └── models/           # Offline MediaPipe .task models
└── manifest.json         # Chrome MV3 manifest
```

---

## 📄 License

MIT
