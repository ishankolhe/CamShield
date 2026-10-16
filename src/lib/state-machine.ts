import type {
  MuteState,
  TriggerEvent,
  DetectionResult,
  CamShieldSettings,
  CalibrationProfile,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";

export type StateTransition = {
  from: MuteState;
  to: MuteState;
  trigger?: TriggerEvent;
  timestamp: number;
};

export type StateChangeCallback = (transition: StateTransition) => void;

export class StateMachine {
  private state: MuteState = "live";
  private badFrameCount = 0;
  private goodFrameCount = 0;
  private lastMuteTime = 0;
  private listeners: StateChangeCallback[] = [];

  private hysteresisFrames: number;
  private unmuteCooldownMs: number;
  private yawThreshold: number;
  private pitchThreshold: number;
  private neutralYaw: number;
  private neutralPitch: number;

  constructor(
    hysteresisFrames = 3,
    unmuteCooldownMs = 500,
    yawThreshold = 35,
    pitchThreshold = 30,
    neutralYaw = 0,
    neutralPitch = 0,
  ) {
    this.hysteresisFrames = hysteresisFrames;
    this.unmuteCooldownMs = unmuteCooldownMs;
    this.yawThreshold = yawThreshold;
    this.pitchThreshold = pitchThreshold;
    this.neutralYaw = neutralYaw;
    this.neutralPitch = neutralPitch;
  }

  static async createFromStorage(): Promise<StateMachine> {
    const { calibration_profile } = await chrome.storage.local.get("calibration_profile");
    let yawThreshold = 35;
    let pitchThreshold = 30;
    let neutralYaw = 0;
    let neutralPitch = 0;

    if (calibration_profile) {
      yawThreshold = calibration_profile.yawThreshold ?? 35;
      pitchThreshold = calibration_profile.pitchThreshold ?? 30;
      neutralYaw = calibration_profile.neutralYaw ?? 0;
      neutralPitch = calibration_profile.neutralPitch ?? 0;
    }

    return new StateMachine(
      DEFAULT_SETTINGS.hysteresisFrames,
      DEFAULT_SETTINGS.unmuteCooldownMs,
      yawThreshold,
      pitchThreshold,
      neutralYaw,
      neutralPitch,
    );
  }

  updateCalibration(profile: CalibrationProfile): void {
    this.yawThreshold = profile.yawThreshold ?? 35;
    this.pitchThreshold = profile.pitchThreshold ?? 30;
    this.neutralYaw = profile.neutralYaw ?? 0;
    this.neutralPitch = profile.neutralPitch ?? 0;
  }

  getState(): MuteState {
    return this.state;
  }

  onStateChange(cb: StateChangeCallback): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private transition(to: MuteState, trigger?: TriggerEvent): void {
    if (to === this.state) return;
    const t: StateTransition = {
      from: this.state,
      to,
      trigger,
      timestamp: Date.now(),
    };
    this.state = to;
    if (to === "muted_auto" || to === "muted_manual") {
      this.lastMuteTime = t.timestamp;
    }
    for (const cb of this.listeners) cb(t);
  }

  processDetection(result: DetectionResult, enabledTriggers: Record<string, boolean>): TriggerEvent | null {
    if (this.state === "paused" || this.state === "muted_manual") return null;

    const trigger = this.evaluateTriggers(result, enabledTriggers);

    if (trigger) {
      this.goodFrameCount = 0;
      this.badFrameCount++;
      if (this.badFrameCount >= this.hysteresisFrames && this.state === "live") {
        this.transition("muted_auto", trigger);
      }
      return trigger;
    }

    this.badFrameCount = 0;
    this.goodFrameCount++;
    const elapsed = Date.now() - this.lastMuteTime;
    if (
      this.state === "muted_auto" &&
      this.goodFrameCount >= this.hysteresisFrames &&
      elapsed >= this.unmuteCooldownMs
    ) {
      this.transition("live");
    }

    return null;
  }

  private evaluateTriggers(
    result: DetectionResult,
    enabled: Record<string, boolean>,
  ): TriggerEvent | null {
    const now = result.timestamp;

    if (enabled.face_lost && !result.hasFace) {
      return { type: "face_lost", confidence: 1, timestamp: now };
    }

    if (enabled.head_turn) {
      const yawAbs = Math.abs(result.yaw - this.neutralYaw);
      const pitchAbs = Math.abs(result.pitch - this.neutralPitch);
      if (yawAbs > this.yawThreshold || pitchAbs > this.pitchThreshold) {
        return {
          type: "head_turn",
          confidence: Math.min(1, Math.max(yawAbs / this.yawThreshold, pitchAbs / this.pitchThreshold)),
          timestamp: now,
        };
      }
    }

    if (enabled.hand_over_face && result.handOverFace) {
      return { type: "hand_over_face", confidence: 0.9, timestamp: now };
    }

    return null;
  }

  manualMute(): void {
    if (this.state !== "muted_manual") {
      this.transition("muted_manual");
    }
  }

  manualUnmute(): void {
    if (this.state === "muted_manual" || this.state === "muted_auto") {
      this.badFrameCount = 0;
      this.transition("live");
    }
  }

  toggleManualMute(): void {
    if (this.state === "muted_manual") {
      this.manualUnmute();
    } else {
      this.manualMute();
    }
  }

  pause(): void {
    this.transition("paused");
  }

  resume(): void {
    if (this.state === "paused") {
      this.badFrameCount = 0;
      this.goodFrameCount = 0;
      this.transition("live");
    }
  }

  setError(): void {
    this.transition("error");
  }

  reset(): void {
    this.badFrameCount = 0;
    this.goodFrameCount = 0;
    this.transition("live");
  }
}