"use client";
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const DEFAULT_THEME = {
  mode: 'dark',
  accentColor: '#3b82f6',
  borderRadius: '12px',
  surfaceOpacity: '0.9',
  bgIntensity: '100%',
  bgStyle: 'gradient', // 'solid' | 'gradient' | 'aurora'
  buttonStyle: 'filled', // 'filled' | 'outline'
  panelOpacity: '0.85',  // krycie paneli/podstron (0-1, 1 = nieprzezroczysty)
  tabOpacity: '0.85',    // krycie zakładek/sekcji ustawień (0-1)
  windowOpacity: '0.92', // krycie okien/modali (0-1)
  bgPattern: 'none',     // 'none' | 'dots' | 'grid' | 'waves' | 'hexagons'
};

const PALETTES = {
  dark: {
    backgroundColor: '#0a0a0f',
    surfaceRGB: '20, 20, 28',
    borderColor: '#1e1e26',
    textColor: '#ffffff',
    textMuted: '#6b6b76'
  },
  light: {
    backgroundColor: '#f3f4f6',
    surfaceRGB: '255, 255, 255',
    borderColor: '#e5e7eb',
    textColor: '#111827',
    textMuted: '#6b7280'
  }
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(DEFAULT_THEME);

  useEffect(() => {
    const saved = localStorage.getItem('theme_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTheme({ ...DEFAULT_THEME, ...parsed });
      } catch (e) {
        console.error('Błąd ładowania motywu:', e);
        setTheme(DEFAULT_THEME);
      }
    }
  }, []);

  useEffect(() => {
    const currentMode = theme?.mode || 'dark';
    const currentPalette = PALETTES[currentMode] || PALETTES.dark;
    const root = document.documentElement;

    // --bg-color pozostaje niezmienione (intensywność jest tylko na body)
    root.style.setProperty('--bg-color', currentPalette.backgroundColor);
    root.style.setProperty('--surface-rgb', currentPalette.surfaceRGB);
    root.style.setProperty('--border-color', currentPalette.borderColor);
    root.style.setProperty('--text-color', currentPalette.textColor);
    root.style.setProperty('--text-muted', currentPalette.textMuted);
    root.style.setProperty('--accent-color', theme?.accentColor || DEFAULT_THEME.accentColor);
    root.style.setProperty('--border-radius', theme?.borderRadius || DEFAULT_THEME.borderRadius);
    // Wartości opacity: 0 = przezroczysty, 1 = w pełni widoczny (nieprzezroczysty)
    const panelAlpha = parseFloat(theme?.panelOpacity ?? DEFAULT_THEME.panelOpacity);
    const tabAlpha = parseFloat(theme?.tabOpacity ?? DEFAULT_THEME.tabOpacity);
    const windowAlpha = parseFloat(theme?.windowOpacity ?? DEFAULT_THEME.windowOpacity);
    root.style.setProperty('--panel-opacity', String(Math.max(0, Math.min(1, panelAlpha))));
    // --surface-opacity = sidebar (osobna, sztywniejsza warstwa)
    root.style.setProperty('--surface-opacity', '0.92');
    // --surface-color jako wygodny alias (używany w wielu komponentach)
    root.style.setProperty('--surface-color', `rgba(${currentPalette.surfaceRGB}, 0.92)`);
    // --tab-opacity = karty/sekcie wewnątrz panelu (.theme-section)
    root.style.setProperty('--tab-opacity', String(Math.max(0, Math.min(1, tabAlpha))));
    root.style.setProperty('--window-opacity', String(Math.max(0, Math.min(1, windowAlpha))));
    root.style.setProperty('--bg-intensity', theme?.bgIntensity || DEFAULT_THEME.bgIntensity);
    root.style.setProperty('--bg-style', theme?.bgStyle || DEFAULT_THEME.bgStyle);
    root.style.setProperty('--bg-pattern', theme?.bgPattern || DEFAULT_THEME.bgPattern);

    // Background pattern — atrybut na body dla selektorów CSS
    document.body.setAttribute('data-bg-pattern', theme?.bgPattern || DEFAULT_THEME.bgPattern);

    // Button style — klasa na <html> zamiast CSS variable (działa z selektorem html.btn-outline-mode)
    if ((theme?.buttonStyle || DEFAULT_THEME.buttonStyle) === 'outline') {
      document.documentElement.classList.add('btn-outline-mode');
    } else {
      document.documentElement.classList.remove('btn-outline-mode');
    }

    localStorage.setItem('theme_settings', JSON.stringify(theme));
  }, [theme]);

  // OSOBNY useEffect dla tła body — pattern + intensywność
  useEffect(() => {
    const body = document.body;
    const currentPattern = theme?.bgPattern || DEFAULT_THEME.bgPattern;
    const isDark = (theme?.mode || 'dark') === 'dark';
    const intensity = parseInt(theme?.bgIntensity || '100') / 100;

    // Bazowy kolor z intensywnością
    // Dark: 0% = czarny, 100% = #0a0a0f
    // Light: 0% = biały, 100% = #f3f4f6
    const baseR = isDark ? 10 : 243;
    const baseG = isDark ? 10 : 244;
    const baseB = isDark ? 15 : 246;
    const mixR = Math.round(baseR * intensity + (1 - intensity) * (isDark ? 0 : 255));
    const mixG = Math.round(baseG * intensity + (1 - intensity) * (isDark ? 0 : 255));
    const mixB = Math.round(baseB * intensity + (1 - intensity) * (isDark ? 0 : 255));
    const bgColor = `rgb(${mixR}, ${mixG}, ${mixB})`;

    if (currentPattern === 'none') {
      body.style.background = bgColor;
      body.style.backgroundSize = '';
      body.style.backgroundRepeat = '';
      return;
    }

    const lineColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const dotColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';

    let bgImage = '';
    let bgSize = '';

    switch (currentPattern) {
      case 'dots':
        bgImage = `radial-gradient(circle, ${dotColor} 1.5px, transparent 1.5px)`;
        bgSize = '20px 20px';
        break;
      case 'grid':
        bgImage = `
          linear-gradient(${lineColor} 1px, transparent 1px),
          linear-gradient(90deg, ${lineColor} 1px, transparent 1px)
        `;
        bgSize = '32px 32px';
        break;
      case 'waves':
        bgImage = `
          repeating-linear-gradient(-45deg, transparent, transparent 18px, ${lineColor} 18px, ${lineColor} 19px),
          repeating-linear-gradient(45deg, transparent, transparent 18px, ${lineColor} 18px, ${lineColor} 19px)
        `;
        bgSize = '36px 36px';
        break;
      case 'hexagons':
        bgImage = `
          radial-gradient(circle at 25% 25%, ${dotColor} 1.2px, transparent 1.2px),
          radial-gradient(circle at 75% 75%, ${dotColor} 1.2px, transparent 1.2px),
          radial-gradient(circle at 50% 0%, ${dotColor} 0.8px, transparent 0.8px),
          radial-gradient(circle at 0% 50%, ${dotColor} 0.8px, transparent 0.8px),
          radial-gradient(circle at 100% 50%, ${dotColor} 0.8px, transparent 0.8px),
          radial-gradient(circle at 50% 100%, ${dotColor} 0.8px, transparent 0.8px)
        `;
        bgSize = '30px 30px, 30px 30px, 30px 30px, 30px 30px, 30px 30px, 30px 30px';
        break;
    }

    body.style.background = `${bgImage} ${bgColor}`;
    if (bgSize) body.style.backgroundSize = bgSize;
    body.style.backgroundRepeat = 'repeat';
  }, [theme?.bgPattern, theme?.mode, theme?.bgIntensity]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateTheme = (newSettings) => {
    setTheme(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, accentColor: theme?.accentColor || DEFAULT_THEME.accentColor }}>
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
