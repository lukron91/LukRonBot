# Log 004 — arena-agent (2026-06-08)

**Model:** Arena.ai Agent  
**Gałąź:** `dev`

---

## Commit 1: `730c3e5` — Fix: guildId w bot-settings, zduplikowane onClick w users, window.confirm -> Modal

### Co zmieniono
- `panel/app/dashboard/bot-settings/page.jsx`:
  - Dodano `import { useSearchParams } from "next/navigation"`
  - Dodano `const searchParams = useSearchParams()` i `const guildId = searchParams.get("guild")` — `guildId` było używane w `refreshAllCommands()` i `manageCommands()` ale nigdzie niezadeklarowane (błąd: `guildId is not defined`)
  - Dodano `const [cmdRegType, setCmdRegType] = useState("guild")` — używane w JSX przy przyciskach rejestracji ale niezadeklarowane
  - Dodano `const [cmdMessage, setCmdMessage] = useState("")` — używane w JSX ale niezadeklarowane
  - `manageCommands()`: zmieniono `type: cmdSubTab === 'global' ? 'global' : 'guild'` na `type: cmdRegType` — `cmdSubTab` miał wartość `'registration'` co dawało błędny typ
  - `manageCommands()`: dodano `setCmdMessage(...)` przy sukcesie i błędzie

- `panel/app/dashboard/moderation/users/page.jsx`:
  - Przepisany w całości — błąd parsowania JSX linia 328: każdy `<button>` zakładki miał zduplikowany `onClick` jako tekst wewnątrz elementu
  - Zamieniono `window.confirm()` na `<Modal>` we wszystkich 3 miejscach: `deleteWarn()`, `unmuteUser()`, `unbanUser()`
  - Dodano stan `confirmModal` do obsługi potwierdzeń
  - Naprawiono hardkodowane kolory → CSS variables
  - Naprawiono `style="..."` jako string (invalid JSX) → `style={{ ... }}` jako obiekt

---

## Commit 2: `68e818d` — Feat: system tokenów przycisków + styl filled/outline w ustawieniach motywu

### Co zmieniono
- `panel/app/globals.css`:
  - Dodano tokeny CSS w `:root`: `--btn-height: 2.4rem`, `--btn-padding`, `--btn-gap`, `--btn-font-size`, `--btn-font-weight`, `--btn-border-width`, `--btn-color-*`
  - `.btn-base`: zmieniono z `padding` wertykalnego na `height: var(--btn-height)` — stała wysokość niezależna od zawartości
  - Dodano `white-space: nowrap` i `flex-shrink: 0`
  - Dodano wariant outline przez selektor `html.btn-outline-mode .btn-*` — hover wypełnia, bez hovera tylko ramka
  - Usunięto `width: fit-content; margin: 0 auto` — przyciski nie powinny być wyśrodkowane globalnie

- `panel/lib/theme-context.jsx`:
  - Dodano `buttonStyle: 'filled'` do `DEFAULT_THEME`
  - W `useEffect` przy każdej zmianie motywu: dodaje/usuwa klasę `btn-outline-mode` z `document.documentElement`

- `panel/app/dashboard/theme/page.jsx`:
  - Dodano `const buttonStyle = theme?.buttonStyle || 'filled'`
  - Nowa sekcja "Styl przycisków" z wizualnym podglądem obu opcji (filled/outline)
  - Sekcja "Podgląd" pokazuje teraz 4 typy przycisków w aktualnym stylu zamiast jednego

---

## Commit 3: `5093f4e` — Fix: odstępy między przyciskami w modułach, globalne klasy btn-row/btn-col/btn-row-end

### Co zmieniono
- `panel/app/globals.css`:
  - Dodano globalne klasy kontenerów: `.btn-row`, `.btn-row-lg`, `.btn-col`, `.btn-row-end`
  - Każda z gap `0.75rem` lub `1rem`, flexbox, wrap — zamiast inline `style={{ display: 'flex', gap: ... }}`

- `panel/app/dashboard/bot-settings/page.jsx`:
  - `.module-actions` → `<div className="btn-row">` — naprawiony brak odstępu między przyciskami "Test modułu" i "Przeładuj"
  - `command-setup` i `command-bulk-actions` z inline style → `<div className="btn-row">`
  - Przyciski toastu (kopiuj/zamknij): dodano `height: 'auto'` żeby nie były rozciągane przez `--btn-height`

---

## Commit 4: `5c68a9d` — Fix: baner — poprawne object-fit, overlay fade do tła, content przy dolnej krawędzi

### Co zmieniono
- `panel/app/dashboard/layout.jsx`:
  - `.top-bar-bg`: usunięto `min-width: 100%; min-height: 100%` → samo `width: 100%; height: 100%; object-fit: cover` + `display: block`
  - `.top-bar-overlay`: `top/left/right/bottom: 0` → `inset: 0`; gradient zmieniony na fade do `var(--bg-color)` (działa z dark i light mode)
  - `.top-bar-content`: zmieniono z `position: relative; height: 100%; padding-top: 50px` na `position: absolute; inset: 0; align-items: flex-end` — zawartość przy dolnej krawędzi banera
  - Overlay gradient przeniesiony do inline `style` żeby używał `var(--bg-color)` runtime

---

## Commit 5: `bd2e156` — Fix: baner — usunięty padding z .main-content w globals.css

### Co zmieniono
- `panel/app/globals.css`:
  - `.main-content`: `padding: 2rem` → `padding: 0` — globalna reguła nadpisywała lokalny `margin: 0; padding: 0` w layout.jsx i wciskała baner o 2rem z lewej i prawej
  - Dodano `.page-content { padding: 2rem }` jako opcjonalna klasa dla stron które jej potrzebują (żadna aktualnie nie korzysta — każda ma własny padding w root div)

---

## Commit 6: `862d188` — Feat: globalne klasy modal-* w globals.css, users/page przepięty na system motywu

### Co zmieniono
- `panel/app/globals.css`:
  - Nowa sekcja MODAL STANDARDS — gotowe klasy do użycia w każdym przyszłym oknie:
    - `.modal-tabs` / `.modal-tab` / `.modal-tab.active` — zakładki używające `var(--accent-color)`
    - `.modal-tab-content` — padding treści zakładki
    - `.modal-section` / `.modal-section-title` — sekcja z tytułem w accent-color
    - `.modal-input` / `.modal-select` / `.modal-textarea` — inputy z focus border accent
    - `.modal-info-row` + `.danger` / `.warning` / `.success` — wiersz z info (aktywna kara)
    - `.modal-message.success` / `.modal-message.error` — komunikaty z rgba tłem
    - `.modal-empty` — komunikat pustej listy

- `panel/components/Modal.jsx`:
  - `modal-close-custom`: dodano `height/width: var(--btn-height)` — X respektuje token rozmiaru

- `panel/app/dashboard/moderation/users/page.jsx`:
  - Zakładki: lokalny `tabs/tab` → globalne `modal-tabs/modal-tab`
  - Inputy: lokalne `action-input/select` → globalne `modal-input/select/textarea`
  - Wiersze kar: `active-punishment-item` → `modal-info-row warning/danger`
  - Przyciski: `action-button warn/mute/ban` → `btn-base btn-warning/standard/danger`
  - Komunikat: `action-message` → `modal-message`
  - Usunięto ~60 linii lokalnego CSS zastąpionego globalnym
