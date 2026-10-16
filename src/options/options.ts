import type { CamShieldSettings, TriggerType, CalibrationProfile } from "../lib/types";
import { DEFAULT_SETTINGS } from "../lib/types";
import { Detector } from "../lib/detector";

const TRIGGER_LABELS: Record<TriggerType, string> = {
  head_turn: "Head Turn",
  face_lost: "Face Lost",
  hand_over_face: "Hand Over Face",
  cough: "Cough",
  yawn: "Yawn",
  eating: "Eating",
};

let detector: Detector | null = null;
let calibrationStream: MediaStream | null = null;

async function loadSettings(): Promise<CamShieldSettings> {
  const { settings } = await chrome.storage.local.get("settings");
  return settings ?? DEFAULT_SETTINGS;
}

async function init(): Promise<void> {
  const settings = await loadSettings();

  const grid = document.getElementById("trigger-grid")!;
  for (const [key, label] of Object.entries(TRIGGER_LABELS)) {
    const triggerKey = key as TriggerType;
    const wrapper = document.createElement("label");
    wrapper.className = "toggle";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.trigger = triggerKey;
    input.checked = settings.enabledTriggers[triggerKey] ?? false;
    wrapper.appendChild(input);
    wrapper.appendChild(document.createTextNode(label));
    grid.appendChild(wrapper);
  }

  const fpsSlider = document.getElementById("detection-fps") as HTMLInputElement;
  const fpsValue = document.getElementById("fps-value")!;
  fpsSlider.value = String(settings.detectionFps);
  fpsValue.textContent = String(settings.detectionFps);
  fpsSlider.addEventListener("input", () => {
    fpsValue.textContent = fpsSlider.value;
  });

  const hystSlider = document.getElementById("hysteresis") as HTMLInputElement;
  const hystValue = document.getElementById("hysteresis-value")!;
  hystSlider.value = String(settings.hysteresisFrames);
  hystValue.textContent = String(settings.hysteresisFrames);
  hystSlider.addEventListener("input", () => {
    hystValue.textContent = hystSlider.value;
  });

  const coolSlider = document.getElementById("cooldown") as HTMLInputElement;
  const coolValue = document.getElementById("cooldown-value")!;
  coolSlider.value = String(settings.unmuteCooldownMs);
  coolValue.textContent = String(settings.unmuteCooldownMs);
  coolSlider.addEventListener("input", () => {
    coolValue.textContent = coolSlider.value;
  });

  const cardText = document.getElementById("card-text") as HTMLInputElement;
  cardText.value = settings.mutedCardText;

  document.getElementById("btn-save")!.addEventListener("click", async () => {
    const s = await loadSettings();
    const checkboxes = grid.querySelectorAll<HTMLInputElement>("input[data-trigger]");
    for (const cb of checkboxes) {
      const t = cb.dataset.trigger as TriggerType;
      s.enabledTriggers[t] = cb.checked;
    }
    s.detectionFps = Number(fpsSlider.value);
    s.hysteresisFrames = Number(hystSlider.value);
    s.unmuteCooldownMs = Number(coolSlider.value);
    s.mutedCardText = cardText.value;
    await chrome.storage.local.set({ settings: s });
    alert("Settings saved.");
  });

  document.getElementById("btn-calibrate")!.addEventListener("click", performCalibration);

  startCameraPreview();
}

async function startCameraPreview(): Promise<void> {
  const video = document.getElementById("calibration-video") as HTMLVideoElement;
  const status = document.getElementById("calibration-status")!;

  try {
    calibrationStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    video.srcObject = calibrationStream;
    await video.play();
    status.textContent = "Camera active. Position your head normally and click calibrate.";
  } catch (err) {
    status.textContent = "Could not access camera. Please grant permission.";
  }
}

async function performCalibration(): Promise<void> {
  const video = document.getElementById("calibration-video") as HTMLVideoElement;
  const status = document.getElementById("calibration-status")!;

  if (!calibrationStream || video.paused || video.ended || video.readyState < 2) {
    status.textContent = "Please wait for camera feed to initialize.";
    return;
  }

  status.textContent = "Initializing detector...";

  try {
    if (!detector) {
      detector = new Detector();
      await detector.init("", "");
    }

    status.textContent = "Calibrating... please hold still.";

    // Give detector time to process initial frames
    for (let i = 0; i < 5; i++) {
      detector.detect(video, performance.now());
      await new Promise((r) => setTimeout(r, 100));
    }

    let sumYaw = 0, sumPitch = 0, sumRoll = 0;
    let samples = 0;

    for (let i = 0; i < 20; i++) {
      const res = detector.detect(video, performance.now());
      if (res.hasFace) {
        sumYaw += res.yaw;
        sumPitch += res.pitch;
        sumRoll += res.roll;
        samples++;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    if (samples === 0) {
      status.textContent = "Calibration failed: No face detected. Please ensure your face is well-lit and visible.";
      return;
    }

    const neutralYaw = sumYaw / samples;
    const neutralPitch = sumPitch / samples;
    const neutralRoll = sumRoll / samples;

    const profile: CalibrationProfile = {
      name: "default",
      neutralYaw,
      neutralPitch,
      neutralRoll,
      yawThreshold: 35,
      pitchThreshold: 30,
      createdAt: Date.now(),
    };

    await chrome.storage.local.set({ calibration_profile: profile });

    // Broadcast to main world content scripts
    window.postMessage({ type: "CAMSHIELD_CALIBRATION_UPDATE", profile }, "*");

    status.textContent = `Calibrated successfully! Neutral Yaw: ${neutralYaw.toFixed(1)}°, Pitch: ${neutralPitch.toFixed(1)}°, Roll: ${neutralRoll.toFixed(1)}°`;
  } catch (err) {
    console.error("[CamShield] Calibration error:", err);
    status.textContent = "Calibration failed due to an error.";
  }
}

window.addEventListener("beforeunload", () => {
  if (calibrationStream) {
    for (const track of calibrationStream.getTracks()) {
      track.stop();
    }
  }
  detector?.close();
});

init();