# Firefox Sidebar Connector

Minimalistický Firefox WebExtension (Manifest V3), který zobrazí zadanou webovou stránku v postranním panelu Firefoxu.

## Výchozí konfigurace

- Název: Firefox Sidebar Connector
- Verze: 1.2.0
- Cílová URL: https://example.com/
- Režim: sidebarAction.setPanel
- Firefox: 115.0+
- Storage: browser.storage.sync
- Oprávnění: pouze storage

### Proč není použito tabs

Tato implementace nepotřebuje číst ani měnit záložky. Tlačítko doplňku i klávesová zkratka pracují přímo přes browser.sidebarAction, takže oprávnění tabs by bylo zbytečné.

## Strom souborů

    frfx-addon_01tst/
    ├─ manifest.json
    ├─ background.js
    ├─ panel.html
    ├─ panel.css
    ├─ panel.js
    ├─ options.html
    ├─ options.css
    ├─ options.js
    ├─ icons/
    │  ├─ action-32.png
    │  └─ panel-32.png
    └─ README.md

## Architektura

### 1. sidebarAction.setPanel – výchozí režim

Background nastaví sidebar na cílovou URL pomocí browser.sidebarAction.setPanel({ panel: targetUrl }).

Firefox sidebar API podporuje jako panel i URL vzdáleného dokumentu. Tento režim je preferovaný, protože cílový web není vložen do DOM iframe v extension page.

### 2. iframe – volitelný režim

V režimu iframe zůstává panel lokální a vzdálený obsah je vložen do sandboxovaného iframe.

Sandbox používá allow-scripts, allow-same-origin, allow-forms, allow-modals, allow-popups, allow-popups-to-escape-sandbox a allow-presentation.

Extension CSP povoluje rámce pouze z HTTPS a z localhost development adres.

## Bezpečnost

- žádný eval
- žádné vzdálené skripty
- žádný web_accessible_resources
- žádné host_permissions
- žádné čtení obsahu běžných webových stránek
- cílová URL je validována a normalizována
- URL s uživatelským jménem nebo heslem je odmítnuta
- HTTPS je výchozí; HTTP pouze pro localhost
- data uživatele jsou ukládána přes browser.storage.sync

Doplňek záměrně nepřidává oprávnění tabs, protože pro samotný sidebar nejsou potřeba.

## Klávesová zkratka

Výchozí:

- Windows/Linux: Ctrl+Shift+Y
- macOS: Command+Shift+Y

Zkratka volá vlastní příkaz toggle-sidebar a podle stavu sidebar otevře nebo zavře. Handler volá sidebarAction.toggle() přímo v rámci klávesové akce, aby zůstala zachována user-gesture oprávnění Firefoxu.

Ve Firefoxu lze zkratku změnit přes správu klávesových zkratek doplňků.

## Instalace pro vývoj

1. Otevřete Firefox.
2. Do adresního řádku zadejte:

    about:debugging#/runtime/this-firefox

3. Klikněte na Načíst dočasný doplněk…
4. Vyberte manifest.json.
5. V rozhraní doplňků použijte tlačítko sidebaru nebo klávesovou zkratku.

Po úpravách kódu dočasný doplněk znovu načtěte tlačítkem Reload v about:debugging.

## Nastavení

Otevřete Doplňky → Firefox Sidebar Connector → Preferences / Nastavení.

Nastavitelné položky:

- cílová URL
- režim sidebarAction.setPanel / iframe
- zapnutí a vypnutí doplňku
- zobrazení stavového řádku
- ruční obnovení obsahu v iframe režimu tlačítkem ↻ nebo Ctrl+R / Command+R

## Testovací scénáře

### A. Přímý panel

Nastavte:

    https://example.com/
    režim: sidebarAction.setPanel

Kliknutí na toolbar action musí sidebar otevřít a načíst stránku.

### B. Iframe

Nastavte:

    https://example.com/
    režim: iframe

Lokální panel.html se zobrazí a uvnitř načte vzdálenou stránku.

### C. Obnovení iframe

V režimu `iframe` se v záhlaví zobrazí tlačítko `↻`. Kliknutí znovu načte aktuální cílovou URL. Stejnou akci lze vyvolat klávesovou zkratkou Ctrl+R na Windows/Linux nebo Command+R na macOS. Po načtení se zobrazí přibližná doba načtení.

### D. Živá synchronizace nastavení

Změna URL, režimu nebo zapnutí/vypnutí v nastavení se synchronizuje do otevřeného sidebaru přes `browser.storage.sync`. Background současně aktualizuje skutečný Firefox sidebar panel.

### E. Neplatná URL

Zkuste například:

    javascript:alert(1)
    file:///C:/test.html
    https://user:heslo@example.com/

Uložení musí být odmítnuto.

### F. Lokální vývoj

Je povoleno například:

    http://localhost:3000/
    http://127.0.0.1:5173/

## Poznámky k Firefox MV3

- Manifest používá action, nikoliv starý browser_action.
- browser_style není nastaveno.
- browser_specific_settings.gecko.strict_min_version je 115.0.
- Sidebar definuje default_title, default_panel a default_icon.

## Produkční balení

Pro distribuční ZIP vytvořte archiv obsahující:

    manifest.json
    background.js
    panel.html
    panel.css
    panel.js
    options.html
    options.css
    options.js
    icons/

Nepřibalujte lokální pracovní soubory.

## Licence

Projekt neobsahuje vlastní licenci. Přidejte licenci podle způsobu dalšího použití.
