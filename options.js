const DEFAULTS = Object.freeze({
  targetUrl: "https://example.com/",
  displayMode: "sidebarAction.setPanel",
  enabled: true,
  showStatus: true
});

const form = document.getElementById("settings-form");
const targetUrl = document.getElementById("target-url");
const displayMode = document.getElementById("display-mode");
const enabled = document.getElementById("enabled");
const showStatus = document.getElementById("show-status");
const status = document.getElementById("status");
const defaultsButton = document.getElementById("defaults");

function isAllowedUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "::1"].includes(url.hostname))
    );
  } catch {
    return false;
  }
}

function setFormValues(settings) {
  targetUrl.value = settings.targetUrl;
  displayMode.value = settings.displayMode;
  enabled.checked = settings.enabled;
  showStatus.checked = settings.showStatus;
}

function readFormValues() {
  return {
    targetUrl: targetUrl.value.trim(),
    displayMode: displayMode.value,
    enabled: enabled.checked,
    showStatus: showStatus.checked
  };
}

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

async function load() {
  const settings = await browser.storage.sync.get(DEFAULTS);
  setFormValues({ ...DEFAULTS, ...settings });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const next = readFormValues();

    if (!isAllowedUrl(next.targetUrl)) {
      setStatus("Použijte HTTPS URL; HTTP je povoleno pouze pro localhost.", true);
      return;
    }

    await browser.storage.sync.set(next);
    await browser.runtime.sendMessage({ type: "apply-settings" });
    setStatus("Nastavení uloženo.");
  } catch (error) {
    console.error(error);
    setStatus("Nastavení se nepodařilo uložit.", true);
  }
});

defaultsButton.addEventListener("click", async () => {
  setFormValues(DEFAULTS);
  await browser.storage.sync.set(DEFAULTS);
  await browser.runtime.sendMessage({ type: "apply-settings" });
  setStatus("Obnoveno na výchozí nastavení.");
});

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync") {
    load().catch((error) => {
      console.error(error);
      setStatus("Nepodařilo se načíst změny.", true);
    });
  }
});

load().catch((error) => {
  console.error(error);
  setStatus("Nepodařilo se načíst nastavení.", true);
});
