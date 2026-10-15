import { describe, it, expect, beforeEach } from "vitest";
import { StateMachine } from "../src/lib/state-machine";
import type { DetectionResult } from "../src/lib/types";

function makeDetection(overrides: Partial<DetectionResult> = {}): DetectionResult {
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
    ...overrides,
  };
}

const ALL_TRIGGERS = {
  head_turn: true,
  face_lost: true,
  hand_over_face: true,
  cough: false,
  yawn: false,
  eating: false,
};

describe("StateMachine", () => {
  let sm: StateMachine;

  beforeEach(() => {
    sm = new StateMachine(3, 500);
  });

  it("starts in live state", () => {
    expect(sm.getState()).toBe("live");
  });

  it("stays live on good detections", () => {
    for (let i = 0; i < 10; i++) {
      sm.processDetection(makeDetection(), ALL_TRIGGERS);
    }
    expect(sm.getState()).toBe("live");
  });

  it("mutes after hysteresis threshold of bad frames", () => {
    for (let i = 0; i < 3; i++) {
      sm.processDetection(makeDetection({ yaw: 50 }), ALL_TRIGGERS);
    }
    expect(sm.getState()).toBe("muted_auto");
  });

  it("does not mute before reaching hysteresis threshold", () => {
    sm.processDetection(makeDetection({ yaw: 50 }), ALL_TRIGGERS);
    sm.processDetection(makeDetection({ yaw: 50 }), ALL_TRIGGERS);
    expect(sm.getState()).toBe("live");
  });

  it("mutes on face lost", () => {
    for (let i = 0; i < 3; i++) {
      sm.processDetection(makeDetection({ hasFace: false }), ALL_TRIGGERS);
    }
    expect(sm.getState()).toBe("muted_auto");
  });

  it("mutes on hand over face", () => {
    for (let i = 0; i < 3; i++) {
      sm.processDetection(makeDetection({ handOverFace: true }), ALL_TRIGGERS);
    }
    expect(sm.getState()).toBe("muted_auto");
  });

  it("manual mute overrides auto", () => {
    sm.manualMute();
    expect(sm.getState()).toBe("muted_manual");
  });

  it("toggle mute works", () => {
    sm.toggleManualMute();
    expect(sm.getState()).toBe("muted_manual");
    sm.toggleManualMute();
    expect(sm.getState()).toBe("live");
  });

  it("pause and resume work", () => {
    sm.pause();
    expect(sm.getState()).toBe("paused");
    sm.resume();
    expect(sm.getState()).toBe("live");
  });

  it("ignores detections while paused", () => {
    sm.pause();
    for (let i = 0; i < 5; i++) {
      sm.processDetection(makeDetection({ yaw: 50 }), ALL_TRIGGERS);
    }
    expect(sm.getState()).toBe("paused");
  });

  it("error state works", () => {
    sm.setError();
    expect(sm.getState()).toBe("error");
  });

  it("fires state change callbacks", () => {
    const transitions: string[] = [];
    sm.onStateChange((t) => transitions.push(`${t.from}->${t.to}`));
    sm.manualMute();
    sm.manualUnmute();
    expect(transitions).toEqual(["live->muted_manual", "muted_manual->live"]);
  });

  it("disabled triggers are ignored", () => {
    const triggers = { ...ALL_TRIGGERS, head_turn: false };
    for (let i = 0; i < 5; i++) {
      sm.processDetection(makeDetection({ yaw: 50 }), triggers);
    }
    expect(sm.getState()).toBe("live");
  });
});
