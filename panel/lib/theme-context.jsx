"use client";
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const DEFAULT_THEME = {
  mode: 'dark',
  accentColor: '#3b82f6',
};

const PALETTES = {
  dark: {
    backgroundColor: '#0a0a0f',
    surfaceColor: '#14141c',
    borderColor: '#1e1e26',
    textColor: '#ffffff',
    textMuted: '#6b6b76'
  },
  light: {
    backgroundColor: '#f3f4f6',
    surfaceColor: '#ffffff',
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
        if (parsed && typeof parsed === 'object' && parsed.accentColor) {
          setTheme(parsed);
        } else {
          setTheme(DEFAULT_THEME);
        }
      } catch (e) {
        console.error('Błąd ładowania motywu, reset do domyślnych:', e);
        setTheme(DEFAULT_THEME);
      }
    }
  }, []);

  useEffect(() => {
    const currentMode = theme?.mode || 'dark';
    const currentPalette = PALETTES[currentMode] || PALETTES.dark;
    const root = document.documentElement;

    root.style.setProperty('--bg-color', currentPalette.backgroundColor);
    root.style.setProperty('--surface-color', currentPalette.surfaceColor);
    root.style.setProperty('--border-color', currentPalette.borderColor);
    root.style.setProperty('--text-color', currentPalette.textColor);
    root.style.setProperty('--text-muted', currentPalette.textMuted);
    root.style.setProperty('--accent-color', theme?.accentColor || DEFAULT_THEME.accentColor);

    localStorage.setItem('theme_settings', JSON.stringify(theme));
  }, [theme]);

  const updateTheme = (newSettings) => {
    setTheme(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme }}>
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
