const DEFAULTS = Object.freeze({
  targetUrl: "https://example.com/",
  displayMode: "sidebarAction.setPanel",
  enabled: true,
  showStatus: true
});

const LOCAL_PANEL = browser.runtime.getURL("panel.html");

function isAllowedUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;

    return (
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

async function getSettings() {
  const stored = await browser.storage.sync.get(DEFAULTS);
  return { ...DEFAULTS, ...stored };
}

async function applyPanel(settings = await getSettings()) {
  const targetUrl = isAllowedUrl(settings.targetUrl)
    ? settings.targetUrl
    : DEFAULTS.targetUrl;

  if (!settings.enabled) {
    await browser.sidebarAction.setPanel({ panel: LOCAL_PANEL });
    return;
  }

  if (settings.displayMode === "sidebarAction.setPanel") {
    await browser.sidebarAction.setPanel({ panel: targetUrl });
    return;
  }

  await browser.sidebarAction.setPanel({ panel: LOCAL_PANEL });
}

browser.action.onClicked.addListener(() => {
  browser.sidebarAction.toggle().catch((error) => {
    console.error("Nepodařilo se přepnout sidebar:", error);
  });
});

browser.commands.onCommand.addListener((command) => {
  if (command === "toggle-sidebar") {
    browser.sidebarAction.toggle().catch((error) => {
      console.error("Nepodařilo se přepnout sidebar:", error);
    });
  }
});

browser.runtime.onInstalled.addListener(({ reason }) => {
  const task = reason === "install"
    ? browser.storage.sync.set(DEFAULTS).then(() => applyPanel())
    : applyPanel();

  task.catch((error) => {
    console.error("Nepodařilo se inicializovat sidebar:", error);
  });
});

browser.runtime.onStartup.addListener(() => {
  applyPanel().catch((error) => {
    console.error("Nepodařilo se inicializovat sidebar:", error);
  });
});

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;

  applyPanel().catch((error) => {
    console.error("Nepodařilo se aktualizovat sidebar po změně nastavení:", error);
  });
});

browser.runtime.onMessage.addListener((message) => {
  if (message?.type === "apply-settings") {
    return applyPanel();
  }

  return undefined;
});
