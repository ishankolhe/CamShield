import { DEFAULT_SETTINGS, type CamShieldSettings } from "../lib/types";

chrome.runtime.onInstalled.addListener(async () => {
  const { settings } = await chrome.storage.local.get("settings");
  if (!settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-mute") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_MUTE" });
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_SETTINGS") {
    chrome.storage.local.get("settings").then(({ settings }) => {
      sendResponse(settings ?? DEFAULT_SETTINGS);
    });
    return true;
  }

  if (message.type === "UPDATE_STATE") {
    const { state } = message;
    updateBadge(state);
  }
});

function updateBadge(state: string): void {
  const colors: Record<string, string> = {
    live: "#4CAF50",
    muted_auto: "#FF9800",
    muted_manual: "#f44336",
    paused: "#9E9E9E",
    error: "#f44336",
  };
  const texts: Record<string, string> = {
    live: "",
    muted_auto: "M",
    muted_manual: "M",
    paused: "P",
    error: "!",
  };
  chrome.action.setBadgeBackgroundColor({ color: colors[state] ?? "#9E9E9E" });
  chrome.action.setBadgeText({ text: texts[state] ?? "" });
}
