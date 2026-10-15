export type MuteState = "live" | "muted_auto" | "muted_manual" | "paused" | "error";

export type TriggerType =
  | "head_turn"
  | "face_lost"
  | "hand_over_face"
  | "cough"
  | "yawn"
  | "eating";

export interface TriggerEvent {
  type: TriggerType;
  confidence: number;
  timestamp: number;
}

export interface CalibrationProfile {
  name: string;
  neutralYaw: number;
  neutralPitch: number;
  neutralRoll: number;
  yawThreshold: number;
  pitchThreshold: number;
  createdAt: number;
}

export interface CamShieldSettings {
  enabled: boolean;
  enabledTriggers: Record<TriggerType, boolean>;
  muteAudio: boolean;
  audioFadeMs: number;
  hysteresisFrames: number;
  unmuteCooldownMs: number;
  bufferSize: number;
  detectionFps: number;
  activeProfile: string;
  enabledSites: string[];
  mutedCardStyle: "default" | "blur" | "custom";
  mutedCardText: string;
}

export const DEFAULT_SETTINGS: CamShieldSettings = {
  enabled: true,
  enabledTriggers: {
    head_turn: true,
    face_lost: true,
    hand_over_face: true,
    cough: false,
    yawn: false,
    eating: false,
  },
  muteAudio: false,
  audioFadeMs: 75,
  hysteresisFrames: 3,
  unmuteCooldownMs: 500,
  bufferSize: 4,
  detectionFps: 15,
  activeProfile: "default",
  enabledSites: ["meet.google.com", "teams.microsoft.com", "zoom.us"],
  mutedCardStyle: "default",
  mutedCardText: "Camera Temporarily Muted",
};

export interface DetectionResult {
  hasFace: boolean;
  yaw: number;
  pitch: number;
  roll: number;
  handOverFace: boolean;
  jawOpen: number;
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  timestamp: number;
}
