const DEFAULTS = Object.freeze({
  targetUrl: "https://example.com/",
  displayMode: "sidebarAction.setPanel",
  enabled: true,
  openOnInstall: false,
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

async function toggleSidebar() {
  const settings = await getSettings();
  await applyPanel(settings);

  const open = await browser.sidebarAction.isOpen();
  if (open) {
    await browser.sidebarAction.close();
  } else {
    await browser.sidebarAction.open();
  }
}

browser.action.onClicked.addListener(() => {
  toggleSidebar().catch((error) => {
    console.error("Nepodařilo se přepnout sidebar:", error);
  });
});

browser.commands.onCommand.addListener((command) => {
  if (command === "toggle-sidebar") {
    toggleSidebar().catch((error) => {
      console.error("Nepodařilo se přepnout sidebar:", error);
    });
  }
});

browser.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== "install") {
    await applyPanel();
    return;
  }

  await browser.storage.sync.set(DEFAULTS);
  await applyPanel();

  if (DEFAULTS.openOnInstall) {
    await browser.sidebarAction.open();
  }
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
