import type { CamShieldSettings } from "../lib/types";

let currentSettings: CamShieldSettings | null = null;

chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (settings) => {
  currentSettings = settings;
  window.postMessage({ type: "CAMSHIELD_SETTINGS", settings }, "*");
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TOGGLE_MUTE") {
    window.postMessage({ type: "CAMSHIELD_TOGGLE_MUTE" }, "*");
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.settings) {
    currentSettings = changes.settings.newValue;
    window.postMessage(
      { type: "CAMSHIELD_SETTINGS", settings: currentSettings },
      "*",
    );
  }
});

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type === "CAMSHIELD_STATE_UPDATE") {
    chrome.runtime.sendMessage({
      type: "UPDATE_STATE",
      state: event.data.state,
    });
  }
});
