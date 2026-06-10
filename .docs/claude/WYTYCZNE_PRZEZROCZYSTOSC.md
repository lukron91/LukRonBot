# Wytyczne: System przezroczystości paneli — LukRonBot

## Zasada fundamentalna

**NIGDY nie używaj `opacity` na całym elemencie.**

`opacity: 0.5` na elemencie sprawia że przezroczysty staje się CAŁY element — tekst, ikony, obramowania, dzieci. To powoduje efekt "zmniejszonej jasności" a nie przezroczystości tła.

**Prawidłowa przezroczystość tła to wyłącznie `rgba()` na właściwości `background`.**

---

## Jak działa prawidłowa przezroczystość

### Zły sposób (ZAKAZ):
```css
.panel {
  background: #1a1a2e;
  opacity: 0.8; /* ← ZŁE: robi przezroczystym WSZYSTKO łącznie z tekstem */
}
```

### Dobry sposób:
```css
.panel {
  background: rgba(var(--surface-rgb), var(--panel-opacity));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

Tylko `background` jest przezroczyste — tekst, ikony i dzieci pozostają w pełni widoczne.

---

## CSS Variables — definicje

W `:root` lub na `html` muszą być zdefiniowane:

```css
:root {
  /* Kolor powierzchni jako osobne kanały RGB — WYMAGANE dla rgba() */
  --surface-rgb: 26, 26, 46;        /* dark mode: np. #1a1a2e */
  
  /* Poziomy przezroczystości — wartości od 0.0 do 1.0 */
  --panel-opacity: 0.85;            /* główny wrapper strony */
  --tab-opacity: 0.75;              /* karty sekcji, section-card, stat-card */
  --window-opacity: 0.92;           /* modale, okna dialogowe */
  --surface-opacity: 0.95;          /* sidebar (prawie nieprzezroczysty) */
}
```

### Kluczowe: --surface-rgb to wartości RGB bez rgb()
```css
/* DOBRZE: */
--surface-rgb: 26, 26, 46;

/* ŹLE: */
--surface-rgb: rgb(26, 26, 46);   /* nie zadziała w rgba() */
--surface-rgb: #1a1a2e;           /* nie zadziała w rgba() */
```

### Użycie w komponentach:
```css
background: rgba(var(--surface-rgb), var(--tab-opacity));
/* rozwinięcie: rgba(26, 26, 46, 0.75) */
```

---

## Hierarchia przezroczystości

| Element | CSS Variable | Domyślna wartość | Opis |
|---------|-------------|-----------------|------|
| Sidebar | `--surface-opacity` | `0.95` | Prawie nieprzezroczysty — sidebar musi być czytelny |
| Page wrapper | `--panel-opacity` | `0.85` | Główny kontener strony |
| Karty sekcji | `--tab-opacity` | `0.75` | section-card, stat-card, settings-card, health-card |
| Modale/okna | `--window-opacity` | `0.92` | Modal.jsx — wysoka nieprzezroczystość dla czytelności |

---

## Klasy które używają --tab-opacity (PEŁNA LISTA)

Każda z tych klas musi używać `rgba(var(--surface-rgb), var(--tab-opacity))`:

```css
.section-card,
.stat-card,
.settings-card,
.health-card,
.bot-missing-card,
.user-card,
.rp-section,
.trend-section,
.card-list,
.section {
  background: rgba(var(--surface-rgb), var(--tab-opacity));
}
```

**ZAKAZ mieszania `--surface-opacity` z `--tab-opacity` w tych klasach.**
`--surface-opacity` jest WYŁĄCZNIE dla sidebara.

---

## Modal.jsx — wymagania

```jsx
/* Overlay — pełnoekranowe tło */
style={{
  position: 'fixed',       /* FIXED — nie relative, nie absolute */
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 9999,            /* MUSI być wyższy niż jakikolwiek inny element */
  background: 'rgba(0, 0, 0, 0.55)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
}}

/* Content — okno modalu */
style={{
  position: 'relative',    /* relative wewnątrz fixed overlay */
  zIndex: 10000,           /* wyższy niż overlay */
  background: `rgba(var(--surface-rgb), var(--window-opacity, 0.92))`,
}}
```

### Dlaczego Modal renderuje się wewnątrz kontenera?
Jeśli jakikolwiek rodzic Modala ma `position: relative/absolute/fixed` + `z-index`, tworzy nowy **stacking context** i Modal jest w nim zamknięty mimo wysokiego z-index. Rozwiązanie: Modal musi być renderowany przez **React Portal** poza głównym drzewem DOM:

```jsx
import { createPortal } from 'react-dom';

// W komponencie Modal:
return createPortal(
  <div style={{ position: 'fixed', zIndex: 9999, ... }}>
    {/* zawartość modalu */}
  </div>,
  document.body  // renderuje bezpośrednio w <body>, poza wszelkimi kontenerami
);
```

---

## theme-context.jsx — zasady

### DEFAULT_THEME — wartości domyślne:
```js
const DEFAULT_THEME = {
  mode: 'dark',
  accentColor: '#e63946',
  borderRadius: '8',
  panelOpacity: '0.85',    /* string, nie number */
  tabOpacity: '0.75',
  windowOpacity: '0.92',
  btnStyle: 'filled',
};
```

### Zapisywanie do CSS variables — BEZ inwersji:
```js
// DOBRZE — bezpośrednia wartość:
document.documentElement.style.setProperty('--panel-opacity', theme.panelOpacity);
document.documentElement.style.setProperty('--tab-opacity', theme.tabOpacity);
document.documentElement.style.setProperty('--window-opacity', theme.windowOpacity);

// ŹLE — inwersja (stary bug):
document.documentElement.style.setProperty('--panel-opacity', 1 - theme.panelOpacity);
```

### --surface-rgb musi być aktualizowane przy zmianie trybu:
```js
// dark mode:
document.documentElement.style.setProperty('--surface-rgb', '26, 26, 46');

// light mode:
document.documentElement.style.setProperty('--surface-rgb', '255, 255, 255');
```

---

## backdrop-filter — wymagania

Każdy panel z przezroczystym tłem powinien mieć:
```css
backdrop-filter: blur(8px);
-webkit-backdrop-filter: blur(8px); /* Safari */
```

Bez `backdrop-filter` przezroczystość działa ale nie ma efektu frosted glass — widać pikselowe tło.

**Uwaga:** `backdrop-filter` działa tylko gdy element NIE ma `overflow: hidden` na rodzicu który blokuje rendering. Jeśli blur nie działa — sprawdź `overflow` na rodzicach.

---

## Checklist przed każdą zmianą w systemie motywów

Przed modyfikacją czegokolwiek związanego z motywem sprawdź:

- [ ] Czy używam `rgba(var(--surface-rgb), var(--X-opacity))` a nie `opacity` na elemencie?
- [ ] Czy `--surface-rgb` ma wartości jako `R, G, B` (bez `rgb()`)?
- [ ] Czy Modal używa `createPortal` do `document.body`?
- [ ] Czy Modal ma `position: fixed` i `zIndex: 9999`?
- [ ] Czy sidebar używa `--surface-opacity` a karty sekcji `--tab-opacity`?
- [ ] Czy nie ma `1 - value` przy zapisie CSS variables?
- [ ] Czy `backdrop-filter` jest dodany z prefixem `-webkit-`?
