"use client";
import { useEffect, useState } from "react";
import { useTheme } from '@/lib/useTheme';
import { FiSun, FiMoon, FiCheck, FiPalette } from 'react-icons/fi';

export default function ThemeSettings() {
  const { theme, updateTheme } = useTheme();
  const { accentColor, mode } = theme;

  const applyColor = (color) => {
    updateTheme({ accentColor: color });
  };

  const toggleMode = () => {
    updateTheme({ mode: mode === 'dark' ? 'light' : 'dark' });
  };

  const presetColors = [
    { name: 'Niebieski', color: '#3b82f6' },
    { name: 'Fioletowy', color: '#8b5cf6' },
    { name: 'Różowy', color: '#ec4899' },
    { name: 'Czerwony', color: '#ef4444' },
    { name: 'Pomarańczowy', color: '#f59e0b' },
    { name: 'Zielony', color: '#10b981' },
    { name: 'Turkus', color: '#06b6d4' },
    { name: 'Żółty', color: '#eab308' }
  ];

  return (
    <div className="theme-settings">
      <div className="page-header">
        <h1><FiPalette /> Ustawienia motywu</h1>
        <p>Dostosuj wygląd panelu do swoich preferencji</p>
      </div>

      <div className="theme-section">
        <h2 style={{ color: accentColor }}>Tryb kolorystyczny</h2>
        <p className="section-description">Wybierz między ciemnym a jasnym trybem pracy.</p>
        
        <div className="mode-toggle">
          <button 
            onClick={toggleMode} 
            className={`mode-btn ${mode === 'dark' ? 'active' : ''}`}
            style={{ borderColor: mode === 'dark' ? accentColor : 'transparent' }}
          >
            {mode === 'dark' ? <FiMoon /> : <FiSun />}
            <span>{mode === 'dark' ? 'Tryb Ciemny' : 'Tryb Jasny'}</span>
          </button>
        </div>
      </div>

      <div className="theme-section">
        <h2 style={{ color: accentColor }}>Kolor akcentu</h2>
        <p className="section-description">Wybierz jeden z presetów lub ustaw własny kolor.</p>
        
        <div className="preset-colors">
          {presetColors.map(preset => (
            <button
              key={preset.color}
              className={`preset-btn ${accentColor === preset.color ? 'active' : ''}`}
              onClick={() => applyColor(preset.color)}
              style={{ backgroundColor: preset.color }}
              title={preset.name}
            >
              {accentColor === preset.color && <FiCheck />}
            </button>
          ))}
        </div>

        <div className="custom-color">
          <label>
            Własny kolor:
            <input
              type="color"
              value={accentColor}
              onChange={(e) => applyColor(e.target.value)}
              className="color-picker"
            />
          </label>
        </div>
      </div>

      <div className="theme-section">
        <h2 style={{ color: accentColor }}>Podgląd</h2>
        <div className="preview-card" style={{ borderColor: accentColor }}>
          <div className="preview-header" style={{ color: accentColor }}>
            Przykładowy nagłówek
          </div>
          <p className="preview-text">To jest przykładowy tekst w nowym motywie. Zmiana trybu i koloru akcentu jest widoczna natychmiastowo w całym panelu.</p>
          <button 
            className="preview-button"
            style={{ backgroundColor: accentColor }}
          >
            Przycisk akcentu
          </button>
        </div>
      </div>

      <style jsx>{`
        .theme-settings {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          color: var(--text-color);
        }
        .page-header h1 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .page-header p {
          color: var(--text-muted);
          margin-bottom: 2rem;
        }
        .theme-section {
          background: var(--surface-color);
          border: 1px solid var(--border-color);
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .theme-section h2 {
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }
        .section-description {
          color: var(--text-muted);
          margin-bottom: 1.5rem;
        }
        .mode-toggle {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .mode-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.5rem;
          background: var(--backgroundColor);
          border: 2px solid var(--border-color);
          border-radius: 0.75rem;
          color: var(--text-color);
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 600;
        }
        .mode-btn.active {
          background: var(--surface-color);
          box-shadow: 0 0 0 1px var(--accent-color);
        }
        .preset-colors {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
        }
        .preset-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 3px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }
        .preset-btn:hover {
          transform: scale(1.1);
        }
        .preset-btn.active {
          border-color: #fff;
          box-shadow: 0 0 0 2px currentColor;
        }
        .custom-color {
          margin-top: 1rem;
        }
        .custom-color label {
          display: flex;
          align-items: center;
          gap: 1rem;
          color: var(--text-muted);
        }
        .color-picker {
          width: 60px;
          height: 40px;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
        }
        .preview-card {
          background: var(--surface-color);
          border: 2px solid;
          border-radius: 0.75rem;
          padding: 1.5rem;
        }
        .preview-header {
          font-weight: 600;
          margin-bottom: 1rem;
        }
        .preview-text {
          color: var(--text-muted);
          margin-bottom: 1rem;
        }
        .preview-button {
          color: #fff;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .preview-button:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}
