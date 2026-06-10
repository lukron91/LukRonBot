"use client";
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const DEFAULT_THEME = {
  mode: 'dark',
  accentColor: '#3b82f6',
  borderRadius: '12px',
  surfaceOpacity: '0.9',
  panelOpacity: '0.9',
  tabOpacity: '0.8',
  windowOpacity: '0.85',
  bgIntensity: '100%',
  bgStyle: 'gradient',
  bgWallpaper: '',
  bgBrightness: '100%',
  buttonStyle: 'filled',
  blurIntensity: '4px',
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

    root.style.setProperty('--bg-color', currentPalette.backgroundColor);
    root.style.setProperty('--surface-rgb', currentPalette.surfaceRGB);
    root.style.setProperty('--border-color', currentPalette.borderColor);
    root.style.setProperty('--text-color', currentPalette.textColor);
    root.style.setProperty('--text-muted', currentPalette.textMuted);
    root.style.setProperty('--accent-color', theme?.accentColor || DEFAULT_THEME.accentColor);
    root.style.setProperty('--border-radius', theme?.borderRadius || DEFAULT_THEME.borderRadius);
    root.style.setProperty('--surface-opacity', theme?.surfaceOpacity || DEFAULT_THEME.surfaceOpacity);
    root.style.setProperty('--panel-opacity', theme?.panelOpacity || DEFAULT_THEME.panelOpacity);
    root.style.setProperty('--tab-opacity', theme?.tabOpacity || DEFAULT_THEME.tabOpacity);
    root.style.setProperty('--window-opacity', theme?.windowOpacity || DEFAULT_THEME.windowOpacity);
    root.style.setProperty('--bg-intensity', theme?.bgIntensity || DEFAULT_THEME.bgIntensity);
    root.style.setProperty('--bg-style', theme?.bgStyle || DEFAULT_THEME.bgStyle);
    root.style.setProperty('--bg-wallpaper', theme?.bgWallpaper ? `url("${theme.bgWallpaper}")` : 'none');
    root.style.setProperty('--bg-brightness', theme?.bgBrightness || DEFAULT_THEME.bgBrightness);
    root.style.setProperty('--blur-intensity', theme?.blurIntensity || DEFAULT_THEME.blurIntensity);

    // Button style — klasa na <html> zamiast CSS variable (działa z selektorem html.btn-outline-mode)
    if ((theme?.buttonStyle || DEFAULT_THEME.buttonStyle) === 'outline') {
      document.documentElement.classList.add('btn-outline-mode');
    } else {
      document.documentElement.classList.remove('btn-outline-mode');
    }

    localStorage.setItem('theme_settings', JSON.stringify(theme));
  }, [theme]);

  const updateTheme = (newSettings) => {
    setTheme(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, accentColor: theme?.accentColor || DEFAULT_THEME.accentColor }}>
      {children}
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
