const DEFAULTS = Object.freeze({
  targetUrl: "https://example.com/",
  displayMode: "sidebarAction.setPanel",
  enabled: true,
  showStatus: true
});

const frame = document.getElementById("remote-frame");
const status = document.getElementById("status");
const statusText = document.getElementById("status-text");
const statusTime = document.getElementById("status-time");
const reloadButton = document.getElementById("reload");
const disabledPanel = document.getElementById("disabled");
const directModePanel = document.getElementById("direct-mode");
const errorPanel = document.getElementById("error");
const errorText = document.getElementById("error-text");
const openOptionsButton = document.getElementById("open-options");
const disabledOptionsButton = document.getElementById("disabled-options");
const errorOptionsButton = document.getElementById("error-options");

let loadTimeout = null;
let loadStartedAt = 0;
let currentTargetUrl = null;

function normalizeAllowedUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    const url = new URL(value.trim());
    if (url.username || url.password) return null;
    if (url.protocol === "https:") return url.href;
    if (url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname)) return url.href;
    return null;
  } catch {
    return null;
  }
}

function setStatus(message, state = "loading", duration = null) {
  status.dataset.state = state;
  statusText.textContent = message;
  statusTime.textContent = duration === null ? "" : `${duration} ms`;
}

function clearLoadTimeout() {
  if (loadTimeout !== null) {
    window.clearTimeout(loadTimeout);
    loadTimeout = null;
  }
}

function hidePanels() {
  disabledPanel.hidden = true;
  directModePanel.hidden = true;
  errorPanel.hidden = true;
  frame.hidden = true;
}

function openOptions() {
  browser.runtime.openOptionsPage().catch((error) => console.error("Nastavení se nepodařilo otevřít:", error));
}

function showDisabled() {
  hidePanels();
  reloadButton.hidden = true;
  disabledPanel.hidden = false;
  setStatus("Doplněk je vypnutý.", "error");
}

function showDirectMode() {
  hidePanels();
  reloadButton.hidden = true;
  directModePanel.hidden = false;
  setStatus("Používá se režim sidebarAction.setPanel().", "ready");
}

function showError(message) {
  hidePanels();
  reloadButton.hidden = !currentTargetUrl;
  errorPanel.hidden = false;
  errorText.textContent = message;
  setStatus("Obsah se nepodařilo načíst.", "error");
}

function armLoadTimeout(message) {
  clearLoadTimeout();
  loadTimeout = window.setTimeout(() => {
    reloadButton.disabled = false;
    reloadButton.removeAttribute("aria-busy");
    setStatus(message, "error");
  }, 12000);
}

function startFrameLoad(targetUrl, reload = false) {
  currentTargetUrl = targetUrl;
  hidePanels();
  frame.hidden = false;
  reloadButton.hidden = false;
  reloadButton.disabled = true;
  reloadButton.setAttribute("aria-busy", "true");
  setStatus(reload ? "Obnovuji obsah…" : "Načítám obsah…", "loading");
  loadStartedAt = performance.now();
  armLoadTimeout("Načítání trvá déle než obvykle. Cílová stránka může blokovat vložení.");
  frame.src = targetUrl;
}

function reloadFrame() {
  if (!currentTargetUrl || reloadButton.disabled) return;
  startFrameLoad(currentTargetUrl, true);
}

function handleFrameLoad() {
  clearLoadTimeout();
  reloadButton.disabled = false;
  reloadButton.removeAttribute("aria-busy");
  const duration = Math.max(0, Math.round(performance.now() - loadStartedAt));
  setStatus("Obsah načten.", "ready", duration);
}

function handleFrameError() {
  clearLoadTimeout();
  reloadButton.disabled = false;
  reloadButton.removeAttribute("aria-busy");
  showError("Cílová stránka odmítla vložení nebo není dostupná.");
}

async function init() {
  try {
    const settings = await browser.storage.sync.get(DEFAULTS);
    status.hidden = settings.showStatus === false;

    if (!settings.enabled) {
      showDisabled();
      return;
    }

    if (settings.displayMode !== "iframe") {
      showDirectMode();
      return;
    }

    const targetUrl = normalizeAllowedUrl(settings.targetUrl);
    if (!targetUrl) {
      showError("URL musí používat HTTPS. Pro lokální vývoj je povolen pouze localhost, 127.0.0.1 nebo ::1.");
      return;
    }

    startFrameLoad(targetUrl);
  } catch (error) {
    console.error("Nepodařilo se inicializovat panel:", error);
    showError("Nastavení panelu se nepodařilo načíst.");
  }
}

openOptionsButton.addEventListener("click", openOptions);
disabledOptionsButton.addEventListener("click", openOptions);
errorOptionsButton.addEventListener("click", openOptions);
reloadButton.addEventListener("click", reloadFrame);
frame.addEventListener("load", handleFrameLoad);
frame.addEventListener("error", handleFrameError);

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r" && currentTargetUrl) {
    event.preventDefault();
    reloadFrame();
  }
});

init();
