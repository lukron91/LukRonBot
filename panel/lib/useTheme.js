"use client";
import { useState, useEffect } from 'react';

export function useTheme() {
  const [accentColor, setAccentColor] = useState('#3b82f6');

  useEffect(() => {
    const saved = localStorage.getItem('theme-accent');
    const color = saved || '#3b82f6';
    setAccentColor(color);
    document.documentElement.style.setProperty('--accent-color', color);

    const handleThemeChange = (e) => {
      if (e.detail?.color) {
        setAccentColor(e.detail.color);
        document.documentElement.style.setProperty('--accent-color', e.detail.color);
      }
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  return { accentColor };
}