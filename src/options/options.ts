import type { CamShieldSettings, TriggerType } from "../lib/types";
import { DEFAULT_SETTINGS } from "../lib/types";

const TRIGGER_LABELS: Record<TriggerType, string> = {
  head_turn: "Head Turn",
  face_lost: "Face Lost",
  hand_over_face: "Hand Over Face",
  cough: "Cough",
  yawn: "Yawn",
  eating: "Eating",
};

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

  document.getElementById("btn-calibrate")!.addEventListener("click", startCalibration);
}

async function startCalibration(): Promise<void> {
  const video = document.getElementById("calibration-video") as HTMLVideoElement;
  const status = document.getElementById("calibration-status")!;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    status.textContent = "Camera active. Calibration will be implemented with MediaPipe detection.";
  } catch (err) {
    status.textContent = "Could not access camera. Please grant permission.";
  }
}

init();
