const DEFAULTS = Object.freeze({
  targetUrl: "https://example.com/",
  displayMode: "sidebarAction.setPanel",
  enabled: true,
  showStatus: true
});

const frame = document.getElementById("remote-frame");
const status = document.getElementById("status");
const statusText = document.getElementById("status-text");
const disabledPanel = document.getElementById("disabled");
const directModePanel = document.getElementById("direct-mode");
const errorPanel = document.getElementById("error");
const errorText = document.getElementById("error-text");
const openOptionsButton = document.getElementById("open-options");
const disabledOptionsButton = document.getElementById("disabled-options");
const errorOptionsButton = document.getElementById("error-options");

let loadTimeout = null;

function isAllowedUrl(value) {
  try {
    const url = new URL(value);

    if (url.protocol === "https:") {
      return true;
    }

    return (
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

function setStatus(message, state = "loading") {
  status.dataset.state = state;
  statusText.textContent = message;
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
  browser.runtime.openOptionsPage().catch((error) => {
    console.error("Nastavení se nepodařilo otevřít:", error);
  });
}

function showDisabled() {
  hidePanels();
  disabledPanel.hidden = false;
  setStatus("Doplněk je vypnutý.", "error");
}

function showDirectMode() {
  hidePanels();
  directModePanel.hidden = false;
  setStatus(
    "Používá se režim sidebarAction.setPanel().",
    "ready"
  );
}

function showError(message) {
  hidePanels();
  errorPanel.hidden = false;
  errorText.textContent = message;
  setStatus("Obsah se nepodařilo načíst.", "error");
}

function showFrame(targetUrl) {
  hidePanels();
  frame.hidden = false;

  setStatus("Načítám obsah…", "loading");

  clearLoadTimeout();
  loadTimeout = window.setTimeout(() => {
    setStatus(
      "Načítání trvá déle než obvykle. Cílová stránka může blokovat vložení.",
      "error"
    );
  }, 12000);

  frame.onload = () => {
    clearLoadTimeout();
    setStatus("Obsah načten.", "ready");
  };

  frame.onerror = () => {
    clearLoadTimeout();
    showError(
      "Cílová stránka odmítla vložení nebo není dostupná."
    );
  };

  frame.src = targetUrl;
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

    if (!isAllowedUrl(settings.targetUrl)) {
      showError(
        "URL musí používat HTTPS. Pro lokální vývoj je povolen pouze localhost, 127.0.0.1 nebo ::1."
      );
      return;
    }

    showFrame(new URL(settings.targetUrl).href);
  } catch (error) {
    console.error("Nepodařilo se inicializovat panel:", error);
    showError("Nastavení panelu se nepodařilo načíst.");
  }
}

openOptionsButton.addEventListener("click", openOptions);
disabledOptionsButton.addEventListener("click", openOptions);
errorOptionsButton.addEventListener("click", openOptions);

init();
