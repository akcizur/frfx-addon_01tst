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

async function getSettings() {
  const stored = await browser.storage.sync.get(DEFAULTS);

  return {
    ...DEFAULTS,
    ...stored
  };
}

async function applyPanel() {
  const settings = await getSettings();

  const targetUrl = isAllowedUrl(settings.targetUrl)
    ? new URL(settings.targetUrl).href
    : DEFAULTS.targetUrl;

  try {
    if (!settings.enabled) {
      await browser.sidebarAction.setPanel({
        panel: LOCAL_PANEL
      });
      return;
    }

    if (settings.displayMode === "sidebarAction.setPanel") {
      await browser.sidebarAction.setPanel({
        panel: targetUrl
      });
      return;
    }

    await browser.sidebarAction.setPanel({
      panel: LOCAL_PANEL
    });
  } catch (error) {
    console.error("Nepodařilo se nastavit obsah sidebaru:", error);

    try {
      await browser.sidebarAction.setPanel({
        panel: LOCAL_PANEL
      });
    } catch (fallbackError) {
      console.error("Nepodařilo se obnovit lokální panel:", fallbackError);
    }
  }
}

function toggleSidebar() {
  // Tento API call musí proběhnout přímo v rámci uživatelské akce.
  browser.sidebarAction.toggle().catch((error) => {
    console.error("Nepodařilo se přepnout sidebar:", error);
  });
}

browser.action.onClicked.addListener(toggleSidebar);

browser.commands.onCommand.addListener((command) => {
  if (command === "toggle-sidebar") {
    toggleSidebar();
  }
});

browser.runtime.onInstalled.addListener(async ({ reason }) => {
  try {
    if (reason === "install") {
      await browser.storage.sync.set(DEFAULTS);
    }

    await applyPanel();
  } catch (error) {
    console.error("Nepodařilo se inicializovat rozšíření:", error);
  }
});

browser.runtime.onStartup.addListener(() => {
  applyPanel().catch((error) => {
    console.error("Nepodařilo se obnovit sidebar po startu Firefoxu:", error);
  });
});

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }

  applyPanel().catch((error) => {
    console.error(
      "Nepodařilo se aktualizovat sidebar po změně nastavení:",
      error
    );
  });
});

browser.runtime.onMessage.addListener((message) => {
  if (message?.type === "apply-settings") {
    return applyPanel();
  }

  return undefined;
});
