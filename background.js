const DEFAULTS = Object.freeze({
  targetUrl: "https://example.com/",
  displayMode: "sidebarAction.setPanel",
  enabled: true,
  showStatus: true
});

const LOCAL_PANEL = browser.runtime.getURL("panel.html");

function normalizeAllowedUrl(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  try {
    const url = new URL(value.trim());

    // Never persist or load embedded HTTP credentials from extension settings.
    if (url.username || url.password) {
      return null;
    }

    if (url.protocol === "https:") {
      return url.href;
    }

    if (
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    ) {
      return url.href;
    }

    return null;
  } catch {
    return null;
  }
}

async function getSettings() {
  const stored = await browser.storage.sync.get(DEFAULTS);

  return {
    ...DEFAULTS,
    ...stored
  };
}

let applyRevision = 0;

async function applyPanel() {
  const revision = ++applyRevision;
  const settings = await getSettings();

  if (revision !== applyRevision) {
    return { applied: false, reason: "superseded" };
  }

  const targetUrl =
    normalizeAllowedUrl(settings.targetUrl) ??
    DEFAULTS.targetUrl;

  try {
    if (!settings.enabled) {
      await browser.sidebarAction.setPanel({
        panel: LOCAL_PANEL
      });
      return { applied: true, mode: "disabled" };
    }

    if (settings.displayMode === "sidebarAction.setPanel") {
      await browser.sidebarAction.setPanel({
        panel: targetUrl
      });
      return { applied: true, mode: "direct", targetUrl };
    }

    await browser.sidebarAction.setPanel({
      panel: LOCAL_PANEL
    });
    return { applied: true, mode: "iframe", targetUrl };
  } catch (error) {
    console.error("Nepodařilo se nastavit obsah sidebaru:", error);

    try {
      await browser.sidebarAction.setPanel({
        panel: LOCAL_PANEL
      });
    } catch (fallbackError) {
      console.error("Nepodařilo se obnovit lokální panel:", fallbackError);
    }

    return { applied: false, mode: "fallback", error: error.message };
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
