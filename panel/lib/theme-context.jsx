"use client";
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState({
    accentColor: '#3b82f6',
    backgroundColor: '#0a0a0f',
    surfaceColor: '#14141c',
    borderColor: '#25252d',
    textColor: '#ffffff',
    textMuted: '#6b6b76'
  });

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) {
      try {
        setTheme(JSON.parse(saved));
      } catch (e) {
        console.error('Błąd ładowania motywu:', e);
      }
    }
  }, []);

  const updateTheme = (newTheme) => {
    const updated = { ...theme, ...newTheme };
    setTheme(updated);
    localStorage.setItem('theme', JSON.stringify(updated));
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