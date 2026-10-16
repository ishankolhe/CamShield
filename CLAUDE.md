# CamShield

Browser extension that auto-mutes webcam video during calls when you turn away, sneeze, cough or eat. All processing runs locally.

## Commands

```bash
npm run dev      # Start Vite dev server with HMR
npm run build    # TypeScript check + production build → dist/
npm test         # Run all tests (Vitest)
npm run test:watch  # Run tests in watch mode
```

## Load in Chrome

1. `npm run build`
2. Open `chrome://extensions` → enable Developer Mode
3. Click "Load unpacked" → select the `dist/` folder

## Architecture

- `src/background/` — Service worker (settings, hotkey, badge)
- `src/content/isolated.ts` — Relays settings between extension APIs and main world
- `src/content/main-world.ts` — Patches `getUserMedia`, runs detection loop, composites processed stream
- `src/lib/detector.ts` — MediaPipe FaceLandmarker + HandLandmarker wrapper (main thread, needs DOM/WebGL)
- `src/lib/state-machine.ts` — Mute state machine with hysteresis
- `src/lib/types.ts` — Shared types and defaults
- `src/popup/` — Toolbar popup (status + quick toggles)
- `src/options/` — Settings page with calibration
