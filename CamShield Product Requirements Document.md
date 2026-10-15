# Camera Away Shutter: Product Requirements Document

**Version:** 0.1 (Draft) | **Date:** 12 Oct 2026 | **Status:** For review **Platforms:** Chrome and Edge (Chromium, Manifest V3) on macOS and Windows **Product type:** Browser extension plus a standalone calibration web page

## 1. Summary

Camera Away Shutter is a browser extension that protects people from awkward or private moments on video calls. It watches the user's webcam locally, and when the user turns away, leans out of frame, covers their face, coughs, sneezes, yawns or eats, it instantly replaces the outgoing video with a clean 'Camera Temporarily Muted' card, and optionally silences the microphone. A predictive model mutes a fraction of a second before the event is visible, and optional on-device live captions can appear on the muted card.

Everything runs on the user's device. No video, audio or text is uploaded.

## 2. Problem Statement

During long classes, webinars and meetings, people need to sneeze, cough, take a bite, adjust themselves or glance away. Turning the camera off manually is slow, so awkward frames reach everyone on the call. Existing options (manual camera toggles, background blur) do not react to these moments, and desktop virtual-camera tools need extra installs (such as OBS) and differ by operating system.

**Evidence to gather before launch:** a short survey of 30-50 students and remote workers on how often this happens and how they handle it.

## 3. Goals and Non-Goals

### Goals

1. **Prevent leaks:** keep the share of bad frames that reach other participants (leak rate) as low as possible, with a target below 2% of event frames in benchmark tests.
2. **Stay invisible when not needed:** false mutes below 1 per hour of normal meeting time.
3. **Work out of the box in the browser** on macOS and Windows with no extra software.
4. **Be provably private:** all processing local, auditable and open source.
5. **Be fair:** consistent performance across lighting, glasses, masks, headscarves and skin tones.
6. **Provide a reproducible evaluation** (replay and benchmark mode) so every claim has a measurement behind it.

### Non-Goals (v1)

- Native Zoom, Teams or Discord desktop apps (needs a virtual camera driver; documented as a future route).
- Safari and Firefox support.
- Mobile browsers.
- Faking presence (looping or synthetic video of the user). Explicitly excluded for ethical reasons.
- Cloud features, accounts, analytics or telemetry.

## 4. Target Users

| Persona | Context | Key need |
| --- | --- | --- |
| **Student (primary)** | Long online classes, camera-on policy | Handle sneezes, snacks and glances without disrupting class |
| **Remote worker** | Daily team calls, often at home | Avoid embarrassing moments, handle family or pet interruptions |
| **Job candidate** | Video interviews | Look composed, keep triggers minimal and predictable |
| **User with accessibility needs** | Tics, tremor, limited neck mobility | Not be muted unfairly by natural movement |

## 5. User Stories

1. As a student, I want my video to mute automatically when I turn to sneeze, so classmates do not see it.
2. As a remote worker, I want my mic and video to mute together when I cough, so the call is not disturbed.
3. As a user, I want to see exactly what others see, so I always know my current state.
4. As a user, I want to calibrate thresholds to my desk setup, so glancing at a second monitor does not trigger a mute.
5. As a user, I want a hotkey to mute everything instantly, so I stay in control.
6. As a user with a movement condition, I want relaxed thresholds, so I am not muted for natural movement.
7. As a privacy-conscious user, I want proof that nothing leaves my device.
8. As a presenter, I want captions on the muted card, so attendees keep context while my camera is hidden.

## 6. Scope and Release Plan

| Release | Contents |
| --- | --- |
| **MVP (v0.1)** | Standalone calibration page; head-turn, face-lost and hand-over-face triggers; muted card; look-ahead buffer; hysteresis; manual hotkey; works on Google Meet in Chrome |
| **v0.5** | Extension injection with `getUserMedia` patch; audio gating; watchdog; per-site settings; Edge and Windows validation; Teams web and Zoom web |
| **v1.0** | Blendshape triggers (cough, yawn, eating); sensitivity sliders and profiles; status indicator; replay and benchmark mode; fairness report; Chrome Web Store release |
| **v1.5** | Predictive muting; live captions (private overlay, then on-card); selective lower-face blur |
| **Future** | Second-person detection; OBS bridge for native apps; Safari and Firefox; plugin triggers |

## 7. Functional Requirements

Priority: **P0** must have, **P1** should have, **P2** nice to have.

### 7.1 Detection and triggers

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Estimate head yaw, pitch and roll from face landmarks at 10-15 fps minimum | P0 |
| FR-2 | Mute when yaw or pitch exceeds the user threshold for longer than a configurable duration (default 0.3 s) | P0 |
| FR-3 | Mute when no face is detected for 2-3 consecutive frames (fail-closed) | P0 |
| FR-4 | Mute when a hand covers the face or mouth region | P0 |
| FR-5 | Detect cough, yawn and eating cues from blendshapes (`jawOpen`, `eyeBlink`, mouth funnel) combined with hand-near-mouth | P1 |
| FR-6 | Allow each trigger to be enabled or disabled independently | P0 |
| FR-7 | Provide a calibration flow that records the user's neutral pose and sets thresholds | P0 |
| FR-8 | Support multiple calibration profiles (desk, laptop on lap, second monitor) | P2 |

### 7.2 Output pipeline

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-9 | Intercept `getUserMedia` in the page main world and return a processed `MediaStream` | P0 |
| FR-10 | Composite output on a canvas, using `MediaStreamTrackProcessor` and `Generator` in a worker where available, with canvas `captureStream` as fallback | P0 |
| FR-11 | Keep a look-ahead buffer of 3-5 frames and retroactively replace buffered frames when a mute triggers | P0 |
| FR-12 | Use hysteresis: mute after 2-3 bad frames, unmute after about 0.5 s of good frames, with a short fade | P0 |
| FR-13 | Show a muted card (default, custom text or image, blurred last frame, or name card) | P0 |
| FR-14 | Watchdog: if no processed frame arrives within 300 ms, output the muted card | P0 |
| FR-15 | Survive `replaceTrack`, `applyConstraints`, device changes and repeated `getUserMedia` calls | P0 |

### 7.3 Audio

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-16 | Optionally gate the microphone track on the same trigger, with a 50-100 ms fade to avoid clicks | P1 |
| FR-17 | Offer an audio-only smart mute mode (mic mutes on cough or sneeze, video stays on) | P1 |

### 7.4 Controls and UI

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-18 | Global hotkey for mute now and unmute (via `chrome.commands`; user must set it to Global to work outside browser focus) | P0 |
| FR-19 | Toolbar icon showing live, muted or paused status | P0 |
| FR-20 | Floating 'what others see' preview | P1 |
| FR-21 | Per-site enable list | P1 |
| FR-22 | Sensitivity sliders, unmute delay and buffer size settings | P1 |
| FR-23 | Lite mode (lower detection fps, no hands, no captions) for low-end hardware | P1 |
| FR-24 | Meeting presets: Class, Team call, Interview | P2 |
| FR-25 | Local-only event log with optional export | P2 |

### 7.5 Evaluation tooling

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-26 | Replay mode: load a recorded video with labeled events and compute leak rate, false-mute rate and mute latency | P1 |
| FR-27 | Self-test button that simulates a stall and a lost face and confirms the card appears | P1 |
| FR-28 | Downloadable benchmark report (JSON and HTML) | P2 |

## 8. Predictive Muting Specification (v1.5)

**Objective:** raise lead time so the mute occurs 200-300 ms before the event is visible, allowing a smaller delay buffer and less lip-sync drift.

**Hypothesis to validate:** a learned model gives more lead time than rule-based triggers at an equal false-mute rate.

| Aspect | Specification |
| --- | --- |
| Inputs | Sliding window of about 1 s at 15 fps: head pose and velocity, selected blendshapes, hand-to-face distance and velocity, face box size and position change; normalized per user from calibration |
| Model | Small 1D-CNN or GRU, under 50k parameters; output is P(event begins within 300 ms) |
| Runtime | Exported to ONNX, run via `onnxruntime-web` in the detection worker |
| Safety rule | Rule-based triggers always run in parallel; mute if either fires, so the model can only add protection |
| Data | In-extension recorder page: hold a key during cough, yawn, drink or turn-away to label onset; positive windows are 300-500 ms before onset; negatives include talking, nodding, laughing and adjusting glasses |
| Data ethics | Only consenting participants, local storage, deletion on request; target at least 8-10 participants with varied lighting, glasses and masks |
| Validation | Leave-one-person-out cross validation |
| Personalization | On-device fine-tuning of the final layer, stored in IndexedDB |

**Acceptance criteria:**

- Median lead time of at least 150 ms on held-out participants.
- False-mute rate no worse than rule-only baseline at the same operating point.
- No regression in leak rate versus rule-only.
- Inference under 5 ms per window on a mid-range laptop CPU.

**Known limitation:** sneezes and coughs have short, inconsistent precursors and real sneezes are hard to collect. Results will be reported per event type, and prediction is a safety margin on top of the buffer, not a replacement.

## 9. Live Captions Specification (v1.5)

**Modes:** (a) private overlay visible only to the user, (b) captions drawn on the muted card for other participants. Mode (b) is off by default and opt-in.

| Aspect | Specification |
| --- | --- |
| Engine | On-device only (Moonshine, Vosk WASM, or Whisper tiny/base via transformers.js). The cloud-based Web Speech API is excluded because it breaks the local-only guarantee |
| Pipeline | Mic track, AudioWorklet (16 kHz mono), voice activity detection (Silero), ASR worker, text, compositor |
| Display | Last 2 lines on the card, wrapped, with partial results finalized as they stabilize and old lines fading out |
| Latency | 0.5-1.5 s from speech to text |
| Languages | English at launch; evaluate Hindi and Hinglish as a stretch goal |

**Privacy gating (mandatory):**

- Never caption while the mic is gated or muted by the extension or the platform. Watch the track's `mute`, `ended` and `enabled` changes, and treat uncertainty as 'do not show'.
- Show a clear indicator whenever captions are public.
- Captions are never stored or transmitted.

**Acceptance criteria:**

- Zero captions displayed while the mic was muted across the test suite.
- Word error rate reported per condition (accent, noise level).
- Total CPU with captions enabled stays within the budget in section 10 on both platforms.

## 10. Non-Functional Requirements

| Category | Requirement |
| --- | --- |
| **Latency** | Added video delay of 100-170 ms by default; mute decision within 100 ms of 2-3 bad frames |
| **Performance** | Detection at 10-15 fps on a downscaled frame, compositing at 30 fps; total added CPU under 25% on a mid-range Windows laptop, with the meeting running; lite mode available |
| **Reliability** | Fail-closed on every error: model failure, worker crash, throttled tab, lost camera. The output must never freeze on a live frame |
| **Memory** | All `VideoFrame` and `ImageBitmap` objects closed after use; no growth over a 2-hour session |
| **Privacy** | No network requests from the extension at runtime; no remote code (Manifest V3); models bundled locally |
| **Accessibility** | Visible and non-visual feedback when muting; keyboard-operable settings; relaxed-threshold profiles |
| **Compatibility** | Chrome and Edge, current and previous major versions; macOS (Apple Silicon and Intel) and Windows 10/11 |
| **Fairness** | Report false-mute and leak rates across lighting, glasses, masks, headscarves and skin tones; no condition more than 2x worse than the overall average without a documented mitigation |

## 11. System Architecture

```
Webcam
  -> patched getUserMedia (main-world content script)
  -> hidden video element / track processor
  -> Worker: FaceLandmarker + HandLandmarker (+ predictor in v1.5)
  -> State machine (thresholds, hysteresis, watchdog)
  -> Compositor (delay buffer, muted card, captions)
  -> canvas captureStream / track generator
  -> returned to the meeting site
(same trigger gates the mic track; audio also feeds the caption worker)
```

**Components**

- **Main-world injector:** wraps `getUserMedia`, returns the processed stream.
- **Isolated content script:** relays settings via `window.postMessage` (main-world scripts cannot call `chrome.*`).
- **Service worker:** settings storage, hotkey commands, per-site rules.
- **Detection worker:** MediaPipe Tasks Vision (bundled WASM and models listed in `web_accessible_resources`).
- **Options and calibration page:** standalone page that also serves as the demo.
- **Benchmark module:** replays recorded video through the same pipeline.

### 11.1 Tech Stack

The stack is entirely client-side. There is no backend or server-side database, which keeps the local-only privacy guarantee intact.

| Layer | Technology | Used for |
| --- | --- | --- |
| Extension shell | Manifest V3, TypeScript, Vite | Packaging, service worker, hotkeys via `chrome.commands`, per-site rules |
| Stream interception | Main-world content script wrapping `getUserMedia`; isolated content script using `postMessage` | Returning the processed stream to Meet, Teams and Zoom web |
| Face and hand detection | MediaPipe Tasks Vision (FaceLandmarker with blendshapes and transformation matrix, HandLandmarker), WASM with WebGPU delegate where available | Head pose, cough and yawn cues, hand-over-face |
| Video pipeline | Web Workers, `MediaStreamTrackProcessor` and `Generator` (canvas `captureStream` fallback), `requestVideoFrameCallback` | Delay buffer, muted card compositing, watchdog |
| Audio | Web Audio API, `AudioWorklet`, `GainNode` | Mic gating with fades; feeding the caption engine |
| Predictive model | PyTorch (training), ONNX export, `onnxruntime-web` (inference) | Muting 200-300 ms before the event |
| Live captions | Moonshine or Vosk (WASM), or Whisper tiny via transformers.js; Silero VAD | On-device speech to text |
| Storage | `chrome.storage.local` (settings, calibration profiles); IndexedDB via `idb` or Dexie (model weights, opt-in training clips, local event log, benchmark results) | All data stays on-device, with a delete-all control |
| UI | Vanilla TypeScript or Preact | Popup, options, calibration and benchmark pages |
| Testing | Playwright with Chromium fake-video-capture flags, Vitest | Replaying recorded clips, state machine unit tests |
| Training tools | Python, PyTorch, NumPy, scikit-learn on macOS (venv) | Predictor training and evaluation plots |

## 12. UX and Key States

| State | Visual cue for the user | What others see |
| --- | --- | --- |
| Live | Green toolbar badge | Normal video |
| Muted (auto) | Amber badge and short chime | Muted card |
| Muted (manual) | Red badge | Muted card |
| Paused | Grey badge | Normal video, no processing |
| Error or stall | Red badge with warning | Muted card (fail-closed) |

**Key screens**

1. First-run onboarding: camera permission, 20-second calibration, privacy summary.
2. Calibration page: live video with yaw, pitch, mouth and hand signals, and threshold sliders.
3. Popup: status, quick toggles, hotkey reminder.
4. Options: triggers, muted card style, per-site list, profiles, audio and captions.
5. Benchmark: load video, view metrics, export report.

## 13. Privacy, Security and Compliance

- **Local-only processing:** no frames, audio, text or metrics leave the device. A built-in network check and open-source code let users verify this.
- **Permissions:** request only camera, microphone, `storage` and the host permissions for supported meeting sites; explain each in onboarding.
- **Data retention:** settings and calibration stored locally; recorded training clips only if the user opts in, with one-click deletion.
- **Regulations:** design for India's DPDP Act and GDPR principles (consent, purpose limitation, data minimization), even though no data is collected.
- **Store policy:** Chrome Web Store requires a clear privacy policy and a single, narrow purpose; camera access will receive extra review.
- **Threat model:** protects against accidental exposure of the user on calls. Does not protect against malicious meeting platforms or screen recording on the receiving side.

## 14. Success Metrics and Evaluation Plan

| Metric | Definition | Target |
| --- | --- | --- |
| **Leak rate** | Bad frames that reached output divided by all bad frames | under 2% |
| **False-mute rate** | Wrongly muted seconds per hour of normal meeting | under 1 per hour |
| **Mute latency** | Time from first bad frame to card shown | under 150 ms (with buffer, effectively negative) |
| **Lead time (predictive)** | Prediction time before first visible bad frame | median at least 150 ms |
| **CPU overhead** | Added CPU while in a meeting | under 25% (mid-range Windows laptop) |
| **Caption WER** | Word error rate on test set | report per condition; target under 15% on clean English |
| **Fairness gap** | Worst-condition false-mute rate divided by overall | under 2x |

**Test protocol**

- Scripted session per participant: sneeze or cough (simulated and real where possible), eating, drinking, turning away, leaning out, covering the face, glancing at a second monitor, talking normally.
- Conditions: bright and dim light, glasses, mask, headscarf, different backgrounds.
- Platforms: Chrome on macOS, Edge and Chrome on Windows.
- Sites: Google Meet first, then Teams web, Zoom web, Discord web.
- Compare: rule-only, rule plus predictor.

## 15. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Meeting sites change how they call `getUserMedia` | Extension stops working | Compatibility test matrix, wrapper handles `replaceTrack` and `applyConstraints`, quick-release process |
| Background tab throttling freezes the pipeline | Live frame frozen on screen | Worker-driven processing, `requestVideoFrameCallback`, 300 ms watchdog |
| High CPU on budget laptops | Call quality drops | Lite mode, lower detection fps, GPU delegate, measure total CPU |
| False mutes annoy users | Uninstalls | Duration conditions, hysteresis, calibration, per-trigger toggles |
| Detector bias across skin tones, glasses, masks | Unfair experience | Fairness dashboard, diverse test set, per-user calibration, accessibility profiles |
| Not enough sneeze and cough training data | Weak predictor | Multi-person collection, weak labels from manual mutes, rule triggers as backstop, honest reporting |
| Captions leak private speech | Privacy harm | On-device engine, strict mic-state gating, opt-in public captions, visible indicator |
| Web Store rejection | No distribution | Narrow purpose, clear privacy policy, minimal permissions, sideload instructions |
| Platform policy concerns (video must be genuine) | Misuse or user confusion | Always indicate muted state to others via the card; no fake-presence features |

## 16. Milestones (assumes about 12 weeks, part-time)

| Weeks | Milestone | Deliverable |
| --- | --- | --- |
| 1-2 | Calibration page | Live head pose, hand and mouth signals, threshold UI |
| 3-4 | Pipeline MVP | State machine, muted card, look-ahead buffer, tested on `canvas.captureStream` |
| 5-6 | Extension v0.5 | `getUserMedia` patch, audio gating, watchdog, Meet support, hotkey |
| 7 | Cross-platform | Edge and Windows testing, Teams and Zoom web |
| 8 | v1.0 | Blendshape triggers, settings, benchmark mode, fairness report |
| 9-10 | Predictor | Recorder page, data collection, training, ONNX export, in-browser integration |
| 11 | Captions | On-device ASR, private overlay, then on-card with gating |
| 12 | Release | Evaluation report, documentation, demo video, store submission |

## 17. Open Questions

1. Should audio-only smart mute ship before video triggers, since a cough is often noisier than it is visible?
2. Which languages should captions support first, and is Hinglish in scope?
3. Should the muted card state be signaled to attendees with text (for example 'Video paused') to avoid any impression of deception?
4. How many participants can realistically be recruited for the predictor dataset?
5. Is a native-app route (OBS bridge or virtual camera) worth a separate release?

## 18. Glossary

- **Hysteresis:** using different thresholds for entering and leaving a state to prevent flicker.
- **Fail-closed:** when uncertain or broken, default to the protective state (muted).
- **Leak rate:** share of bad frames that reached the outgoing video.
- **Look-ahead buffer:** a short frame delay that allows already-queued frames to be replaced retroactively.
- **Blendshapes:** facial expression coefficients (such as `jawOpen`) output by MediaPipe FaceLandmarker.
- **WER:** word error rate, the standard speech recognition accuracy metric.
