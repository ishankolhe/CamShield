import type { CamShieldSettings } from "../lib/types";
import { DEFAULT_SETTINGS } from "../lib/types";

const statusBadge = document.getElementById("status-badge")!;
const toggleEnabled = document.getElementById(
  "toggle-enabled",
) as HTMLInputElement;
const toggleAudio = document.getElementById(
  "toggle-audio",
) as HTMLInputElement;
const openOptions = document.getElementById("open-options")!;

async function loadSettings(): Promise<CamShieldSettings> {
  const { settings } = await chrome.storage.local.get("settings");
  return settings ?? DEFAULT_SETTINGS;
}

async function init(): Promise<void> {
  const settings = await loadSettings();
  toggleEnabled.checked = settings.enabled;
  toggleAudio.checked = settings.muteAudio;

  toggleEnabled.addEventListener("change", async () => {
    const s = await loadSettings();
    s.enabled = toggleEnabled.checked;
    await chrome.storage.local.set({ settings: s });
  });

  toggleAudio.addEventListener("change", async () => {
    const s = await loadSettings();
    s.muteAudio = toggleAudio.checked;
    await chrome.storage.local.set({ settings: s });
  });

  openOptions.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "UPDATE_STATE") {
    updateStatusBadge(message.state);
  }
});

function updateStatusBadge(state: string): void {
  const labels: Record<string, string> = {
    live: "Live",
    muted_auto: "Auto Muted",
    muted_manual: "Muted",
    paused: "Paused",
    error: "Error",
  };
  statusBadge.textContent = labels[state] ?? "Unknown";
  statusBadge.className = `badge badge-${state}`;
}

init();
