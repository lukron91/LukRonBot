"use client";
import { useEffect, useState } from "react";
import { FiSun, FiCheck } from 'react-icons/fi';

export default function ThemeSettings() {
  const [accentColor, setAccentColor] = useState("#3b82f6");

  useEffect(() => {
    const saved = localStorage.getItem("theme-accent");
    if (saved) setAccentColor(saved);
  }, []);

  const applyTheme = (color) => {
    localStorage.setItem("theme-accent", color);
    document.documentElement.style.setProperty('--accent-color', color);
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { color } }));
  };

  const handleColorChange = (color) => {
    setAccentColor(color);
    applyTheme(color);
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
        <h1><FiSun /> Ustawienia motywu</h1>
        <p>Dostosuj wygląd panelu do swoich preferencji</p>
      </div>

      <div className="theme-section">
        <h2 style={{ color: accentColor }}>Kolor akcentu</h2>
        <p className="section-description">Wybierz jeden z presetów lub ustaw własny kolor. Zmiany są zapisywane automatycznie.</p>
        
        <div className="preset-colors">
          {presetColors.map(preset => (
            <button
              key={preset.color}
              className={`preset-btn ${accentColor === preset.color ? 'active' : ''}`}
              onClick={() => handleColorChange(preset.color)}
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
              onChange={(e) => handleColorChange(e.target.value)}
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
          <p className="preview-text">To jest przykładowy tekst w nowym motywie. Zmiana powinna być widoczna natychmiast.</p>
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
        }
        .page-header h1 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .page-header p {
          color: #6b6b76;
          margin-bottom: 2rem;
        }
        .theme-section {
          background: #14141c;
          border: 1px solid #1e1e26;
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .theme-section h2 {
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }
        .section-description {
          color: #6b6b76;
          margin-bottom: 1.5rem;
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
          color: #6b6b76;
        }
        .color-picker {
          width: 60px;
          height: 40px;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
        }
        .preview-card {
          background: #14141c;
          border: 2px solid;
          border-radius: 0.75rem;
          padding: 1.5rem;
        }
        .preview-header {
          font-weight: 600;
          margin-bottom: 1rem;
        }
        .preview-text {
          color: #9c9ca7;
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