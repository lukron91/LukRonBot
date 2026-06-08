"use client";
import { useEffect, useState } from "react";
import { useTheme } from '@/lib/theme-context';
import { FiSun, FiMoon, FiCheck, FiSettings, FiSliders } from 'react-icons/fi';

export default function ThemeSettings() {
  const { theme, updateTheme } = useTheme();
  
  // Safe destructuring with defaults
  const accentColor = theme?.accentColor || '#3b82f6';
  const mode = theme?.mode || 'dark';
  const borderRadius = theme?.borderRadius || '12px';
  const surfaceOpacity = theme?.surfaceOpacity || '0.9';
  const bgIntensity = theme?.bgIntensity || '100%';

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

  const radiusPresets = [
    { name: 'Kanciaste', value: '0px' },
    { name: 'Standard', value: '12px' },
    { name: 'Obłe', value: '24px' },
    { name: 'Kapsuła', value: '50px' },
  ];

  return (
    <div className="theme-settings">
      <div className="page-header">
        <h1><FiSettings /> Ustawienia motywu</h1>
        <p>Dostosuj wygląd panelu do swoich preferencji</p>
      </div>

      <div className="theme-section">
        <h2 style={{ color: accentColor }}>Tryb kolorystyczny</h2>
        <p className="section-description">Wybierz między ciemnym a jasnym trybem pracy.</p>
        
        <div className="mode-toggle-dual">
          <button 
            onClick={() => updateTheme({ mode: 'dark' })} 
            className={`mode-btn-dual ${mode === 'dark' ? 'active' : ''}`}
          >
            <FiMoon />
            <span>Tryb Ciemny</span>
          </button>
          <button 
            onClick={() => updateTheme({ mode: 'light' })} 
            className={`mode-btn-dual ${mode === 'light' ? 'active' : ''}`}
          >
            <FiSun />
            <span>Tryb Jasny</span>
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
        <h2 style={{ color: accentColor }}>Personalizacja Formy</h2>
        <p className="section-description">Dostosuj zaokrąglenia i przejrzystość elementów.</p>

        <div className="custom-setting">
          <label>Zaokrąglenia rogów</label>
          <div className="radius-presets">
            {radiusPresets.map(preset => (
              <button 
                key={preset.value}
                className={`radius-btn ${borderRadius === preset.value ? 'active' : ''}`}
                onClick={() => updateTheme({ borderRadius: preset.value })}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className="custom-setting">
          <label>Przezroczystość paneli: {Math.round(surfaceOpacity * 100)}%</label>
          <input 
            type="range" 
            min="0.1" max="1" step="0.05" 
            value={surfaceOpacity} 
            onChange={(e) => updateTheme({ surfaceOpacity: e.target.value })}
            className="theme-slider"
          />
        </div>

        <div className="custom-setting">
          <label>Intensywność tła: {bgIntensity}</label>
          <input 
            type="range" 
            min="50" max="150" step="1" 
            value={parseInt(bgIntensity)} 
            onChange={(e) => updateTheme({ bgIntensity: `${e.target.value}%` })}
            className="theme-slider"
          />
        </div>
      </div>

      <div className="theme-section">
        <h2 style={{ color: accentColor }}>Podgląd</h2>
        <div className="preview-card" style={{ borderColor: accentColor, borderRadius: borderRadius }}>
          <div className="preview-header" style={{ color: accentColor }}>
            Przykładowy nagłówek
          </div>
          <p className="preview-text">To jest przykładowy tekst w nowym motywie. Zmiana trybu, koloru akcentu i zaokrągleń jest widoczna natychmiastowo w całym panelu.</p>
          <button 
            className="preview-button"
            style={{ backgroundColor: accentColor, borderRadius: borderRadius }}
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
          border-radius: var(--border-radius);
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
        .mode-toggle-dual {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .mode-btn-dual {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.5rem;
          background: var(--bg-color);
          border: 2px solid var(--border-color);
          border-radius: var(--border-radius);
          color: var(--text-color);
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .mode-btn-dual:hover {
          border-color: var(--text-muted);
        }
        .mode-btn-dual.active {
          border-color: var(--accent-color);
          background: rgba(var(--surface-rgb), var(--surface-opacity));
          box-shadow: 0 0 0 2px var(--accent-color);
          color: var(--accent-color);
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
          border-radius: var(--border-radius);
          cursor: pointer;
        }
        .custom-setting {
          margin-bottom: 1.5rem;
        }
        .custom-setting label {
          display: block;
          color: var(--text-color);
          font-size: 0.9rem;
          margin-bottom: 0.75rem;
          font-weight: 600;
        }
        .radius-presets {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .radius-btn {
          padding: 0.5rem 1rem;
          background: var(--backgroundColor);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          color: var(--text-color);
          cursor: pointer;
          font-size: 0.8rem;
          transition: all 0.2s;
        }
        .radius-btn.active {
          background: var(--accent-color);
          color: white;
          border-color: var(--accent-color);
        }
        .theme-slider {
          width: 100%;
          cursor: pointer;
          accent-color: var(--accent-color);
        }
        .preview-card {
          background: var(--surface-color);
          border: 2px solid;
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
