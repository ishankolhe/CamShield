import type {
  MuteState,
  TriggerEvent,
  DetectionResult,
  CamShieldSettings,
  DEFAULT_SETTINGS,
} from "./types";

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

  constructor(
    hysteresisFrames = 3,
    unmuteCooldownMs = 500,
  ) {
    this.hysteresisFrames = hysteresisFrames;
    this.unmuteCooldownMs = unmuteCooldownMs;
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
      const yawAbs = Math.abs(result.yaw);
      const pitchAbs = Math.abs(result.pitch);
      if (yawAbs > 35 || pitchAbs > 30) {
        return {
          type: "head_turn",
          confidence: Math.min(1, Math.max(yawAbs, pitchAbs) / 45),
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
