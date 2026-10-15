import type { CamShieldSettings, DetectionResult } from "../lib/types";
import { DEFAULT_SETTINGS } from "../lib/types";
import { StateMachine } from "../lib/state-machine";

let settings: CamShieldSettings = DEFAULT_SETTINGS;
const stateMachine = new StateMachine();

stateMachine.onStateChange((transition) => {
  window.postMessage(
    { type: "CAMSHIELD_STATE_UPDATE", state: transition.to },
    "*",
  );
});

window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data?.type === "CAMSHIELD_SETTINGS") {
    settings = event.data.settings;
  }

  if (event.data?.type === "CAMSHIELD_TOGGLE_MUTE") {
    stateMachine.toggleManualMute();
  }
});

const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(
  navigator.mediaDevices,
);

navigator.mediaDevices.getUserMedia = async function (
  constraints?: MediaStreamConstraints,
): Promise<MediaStream> {
  const stream = await originalGetUserMedia(constraints);

  if (!settings.enabled) return stream;
  if (!constraints?.video) return stream;

  try {
    return processVideoStream(stream);
  } catch {
    return stream;
  }
};

function processVideoStream(originalStream: MediaStream): MediaStream {
  const videoTrack = originalStream.getVideoTracks()[0];
  if (!videoTrack) return originalStream;

  const { width = 640, height = 480 } =
    videoTrack.getSettings();

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const video = document.createElement("video");
  video.srcObject = new MediaStream([videoTrack]);
  video.muted = true;
  video.play();

  const processedStream = canvas.captureStream(30);

  function renderFrame(): void {
    if (videoTrack.readyState === "ended") return;

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
