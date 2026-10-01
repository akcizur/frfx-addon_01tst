const frame = document.getElementById("remote-frame");
const status = document.getElementById("status");
const statusText = document.getElementById("status-text");
const disabled = document.getElementById("disabled");
const openOptions = document.getElementById("open-options");
const disabledOptions = document.getElementById("disabled-options");

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

function setStatus(text, state = "loading") {
  status.dataset.state = state;
  statusText.textContent = text;
}

async function openOptions() {
  await browser.runtime.openOptionsPage();
}

async function init() {
  try {
    const settings = await browser.storage.sync.get({
      targetUrl: "https://example.com/",
      displayMode: "sidebarAction.setPanel",
      enabled: true,
      showStatus: true
    });

    if (settings.showStatus === false) {
      status.hidden = true;
    }

    if (!settings.enabled) {
      frame.hidden = true;
      disabled.hidden = false;
      setStatus("Doplněk je vypnutý.", "error");
      return;
    }

    if (settings.displayMode !== "iframe") {
      frame.hidden = true;
      setStatus("Panel používá přímý režim sidebarAction.setPanel.", "loading");
      return;
    }

    if (!isAllowedUrl(settings.targetUrl)) {
      frame.hidden = true;
      disabled.hidden = false;
      setStatus("Neplatná nebo nepovolená URL.", "error");
      return;
    }

    const target = new URL(settings.targetUrl);
    frame.hidden = false;
    disabled.hidden = true;
    setStatus("Načítám obsah…", "loading");
    frame.src = target.href;

    let loadTimeout = window.setTimeout(() => {
      setStatus("Obsah se načítá pomalu nebo blokuje vložení.", "error");
    }, 12000);

    frame.addEventListener(
      "load",
      () => {
        window.clearTimeout(loadTimeout);
        setStatus("Obsah načten.", "ready");
        status.dataset.state = "ready";
      },
      { once: true }
    );
  } catch (error) {
    console.error(error);
    frame.hidden = true;
    disabled.hidden = false;
    setStatus("Nastavení se nepodařilo načíst.", "error");
  }
}

openOptions.addEventListener("click", openOptions);
disabledOptions.addEventListener("click", openOptions);

init();
