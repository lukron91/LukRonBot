"use client";
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const DEFAULT_THEME = {
  mode: 'dark',
  accentColor: '#3b82f6',
  borderRadius: '12px',
  surfaceOpacity: '0.9',
  bgIntensity: '100%',
  bgStyle: 'gradient' // 'solid' | 'gradient' | 'aurora'
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
    root.style.setProperty('--bg-intensity', theme?.bgIntensity || DEFAULT_THEME.bgIntensity);
    root.style.setProperty('--bg-style', theme?.bgStyle || DEFAULT_THEME.bgStyle);

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
