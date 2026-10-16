import type { CamShieldSettings, CalibrationProfile } from "../lib/types";
import { DEFAULT_SETTINGS } from "../lib/types";
import { StateMachine } from "../lib/state-machine";
import { Detector } from "../lib/detector";

let settings: CamShieldSettings = DEFAULT_SETTINGS;
let extensionOrigin = "";
let stateMachine: StateMachine;
const detector = new Detector();

function onStateChange(transition: { from: string; to: string; trigger?: any; timestamp: number }): void {
  console.log("[CamShield] State change:", transition);
  window.postMessage(
    { type: "CAMSHIELD_STATE_UPDATE", state: transition.to },
    "*",
  );
}

window.addEventListener("message", async (event) => {
  if (event.source !== window) return;

  if (event.data?.type === "CAMSHIELD_SETTINGS") {
    settings = event.data.settings;
    if (event.data.extensionOrigin) {
      extensionOrigin = event.data.extensionOrigin;
    }
    console.log("[CamShield] Settings received in main world:", settings, "Origin:", extensionOrigin);
  }

  if (event.data?.type === "CAMSHIELD_TOGGLE_MUTE") {
    stateMachine.toggleManualMute();
  }

  if (event.data?.type === "CAMSHIELD_CALIBRATION_UPDATE") {
    const profile: CalibrationProfile = event.data.profile;
    stateMachine.updateCalibration(profile);
    console.log("[CamShield] Calibration updated:", profile);
  }
});

async function initStateMachine(): Promise<void> {
  stateMachine = await StateMachine.createFromStorage();
  stateMachine.onStateChange(onStateChange);
}

const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(
  navigator.mediaDevices,
);

navigator.mediaDevices.getUserMedia = async function (
  constraints?: MediaStreamConstraints,
): Promise<MediaStream> {
  console.log("[CamShield] getUserMedia intercepted with constraints:", constraints);
  const stream = await originalGetUserMedia(constraints);

  if (!settings.enabled) {
    console.log("[CamShield] Extension is disabled in settings.");
    return stream;
  }
  if (!constraints?.video) {
    console.log("[CamShield] No video requested in getUserMedia.");
    return stream;
  }

  try {
    return await processVideoStream(stream);
  } catch (e) {
    console.error("[CamShield] processVideoStream error:", e);
    return stream;
  }
};

async function processVideoStream(originalStream: MediaStream): Promise<MediaStream> {
  console.log("[CamShield] Processing video stream...");
  const videoTrack = originalStream.getVideoTracks()[0];
  if (!videoTrack) return originalStream;

  const { width = 640, height = 480 } = videoTrack.getSettings();

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const video = document.createElement("video");
  video.srcObject = new MediaStream([videoTrack]);
  video.muted = true;
  video.playsInline = true;
  // Position offscreen but keep rendered so FaceDetector can process frames
  video.style.position = "fixed";
  video.style.top = "-9999px";
  video.style.left = "-9999px";
  video.style.width = "1px";
  video.style.height = "1px";
  (document.body || document.documentElement).appendChild(video);
  await video.play();

  if (!detector.isReady()) {
    try {
      console.log("[CamShield] Initializing native detector...");
      await detector.init("", "");
      console.log("[CamShield] Native detector ready");
    } catch (e) {
      console.error("[CamShield] Detector init failed:", e);
      stateMachine.setError();
    }
  }

  const processedStream = canvas.captureStream(30);

  let detectionTimer: ReturnType<typeof setTimeout> | null = null;
  let frameCount = 0;

  function runDetection(): void {
    if (videoTrack.readyState === "ended") return;
    if (!detector.isReady()) {
      detectionTimer = setTimeout(runDetection, 1000);
      return;
    }

    const result = detector.detect(video, performance.now());
    frameCount++;
    if (frameCount % 15 === 0) {
      console.log("[CamShield] Detection:", { hasFace: result.hasFace, yaw: result.yaw.toFixed(1), state: stateMachine.getState() });
    }
    stateMachine.processDetection(result, settings.enabledTriggers);

    const interval = Math.round(1000 / settings.detectionFps);
    detectionTimer = setTimeout(runDetection, interval);
  }

  runDetection();

  function renderFrame(): void {
    if (videoTrack.readyState === "ended") {
      if (detectionTimer !== null) clearTimeout(detectionTimer);
      detector.close();
      video.remove();
      return;
    }

    const state = stateMachine.getState();

    if (state === "live" || state === "paused") {
      ctx.drawImage(video, 0, 0, width, height);
    } else {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#e0e0e0";
      ctx.font = "bold 24px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        settings.mutedCardText || "Camera Temporarily Muted",
        width / 2,
        height / 2,
      );
    }

    requestAnimationFrame(renderFrame);
  }

  renderFrame();

  const audioTracks = originalStream.getAudioTracks();
  for (const track of audioTracks) {
    processedStream.addTrack(track);
  }

  return processedStream;
}

initStateMachine();