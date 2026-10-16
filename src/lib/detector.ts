import type { DetectionResult } from "./types";

export class Detector {
  private faceDetector: any = null;
  private ready = false;
  private lastResult: DetectionResult = {
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
  private detecting = false;

  async init(_wasmBasePath: string, _modelsBasePath: string): Promise<void> {
    console.log("[CamShield] Initializing native FaceDetector...");
    if (typeof window !== "undefined" && 'FaceDetector' in window) {
      try {
        this.faceDetector = new (window as any).FaceDetector({
          fastDetect: true,
          maxDetectedFaces: 1,
        });
        console.log("[CamShield] Native FaceDetector initialized successfully!");
      } catch (e) {
        console.warn("[CamShield] Native FaceDetector creation failed:", e);
      }
    } else {
      console.warn("[CamShield] Native FaceDetector not supported in this browser version.");
    }
    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

  detect(video: HTMLVideoElement, timestamp: number): DetectionResult {
    if (video.videoWidth === 0 || video.videoHeight === 0 || video.paused || video.ended) {
      return { ...this.lastResult, timestamp };
    }

    if (this.faceDetector && !this.detecting) {
      this.detecting = true;
      this.faceDetector
        .detect(video)
        .then((faces: Array<{ boundingBox: DOMRectReadOnly }>) => {
          this.detecting = false;
          const hasFace = faces.length > 0;
          let yaw = 0, pitch = 0, roll = 0;
          let handOverFace = false;

          if (hasFace) {
            const face = faces[0];
            const box = face.boundingBox;

            const faceCenterX = box.x + box.width / 2;
            const videoCenterX = video.videoWidth / 2;
            const offsetRatio = (faceCenterX - videoCenterX) / (video.videoWidth || 640);

            yaw = offsetRatio * 150;
          }

          this.lastResult = {
            hasFace,
            yaw,
            pitch,
            roll,
            handOverFace,
            jawOpen: 0,
            eyeBlinkLeft: 0,
            eyeBlinkRight: 0,
            timestamp,
          };
        })
        .catch(() => {
          this.detecting = false;
        });
    }

    return { ...this.lastResult, timestamp };
  }

  close(): void {
    this.faceDetector = null;
    this.ready = false;
  }
}
