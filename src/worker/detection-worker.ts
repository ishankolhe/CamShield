import type { DetectionResult } from "../lib/types";

let isRunning = false;

self.onmessage = async (event: MessageEvent) => {
  const { type, data } = event.data;

  if (type === "INIT") {
    await initDetector();
    self.postMessage({ type: "READY" });
  }

  if (type === "DETECT") {
    if (!isRunning) return;
    const result = detect(data.imageData);
    self.postMessage({ type: "DETECTION_RESULT", result });
  }

  if (type === "STOP") {
    isRunning = false;
  }
};

async function initDetector(): Promise<void> {
  // TODO: Initialize MediaPipe FaceLandmarker and HandLandmarker
  // - Load WASM files from web_accessible_resources
  // - Configure for blendshapes + transformation matrix
  // - Set running mode to VIDEO
  isRunning = true;
}

function detect(_imageData: ImageData): DetectionResult {
  // TODO: Run face and hand detection on the frame
  // Stub returns a neutral detection
  return {
    hasFace: true,
    yaw: 0,
    pitch: 0,
    roll: 0,
    handOverFace: false,
    jawOpen: 0,
    eyeBlinkLeft: 0,
    eyeBlinkRight: 0,
    timestamp: performance.now(),
  };
}
