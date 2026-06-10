"use client";
import { useTheme } from '@/lib/theme-context';
import DraggableWindow from './DraggableWindow';
import { FiX } from 'react-icons/fi';

const WALLPAPERS = [
  { id: 'none', name: 'Brak tła', css: '' },

  // === GRADIENTY KOLOROWE (wyraziste) ===
  { id: 'sunset', name: 'Zachód słońca', css: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 30%, #f093fb 60%, #4facfe 100%)' },
  { id: 'ocean', name: 'Oceaniczny', css: 'linear-gradient(135deg, #0c3483 0%, #a2b6df 50%, #6b8cce 75%, #a2b6df 100%)' },
  { id: 'neon', name: 'Neonowy', css: 'linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 70%, #00d2ff 100%)' },
  { id: 'aurora', name: 'Aurora', css: 'linear-gradient(135deg, #0f2027 0%, #203a43 40%, #2c5364 70%, #00b4db 100%)' },
  { id: 'candy', name: 'Cukierkowy', css: 'linear-gradient(135deg, #f12711 0%, #f5af19 40%, #f12711 70%, #f5af19 100%)' },
  { id: 'galaxy', name: 'Galaktyka', css: 'linear-gradient(135deg, #0d0d2b 0%, #1a1a4e 30%, #2d1b69 60%, #6b3fa0 100%)' },
  { id: 'lava', name: 'Lawa', css: 'linear-gradient(135deg, #0f0c29 0%, #302b63 30%, #8b0000 60%, #ff4500 100%)' },
  { id: 'forest-new', name: 'Las', css: 'linear-gradient(135deg, #0b1d0b 0%, #1a3a1a 30%, #2d5a2d 60%, #4caf50 100%)' },
  { id: 'twilight', name: 'Zmierzch', css: 'linear-gradient(135deg, #1a0033 0%, #330066 30%, #660099 60%, #cc66ff 100%)' },
  { id: 'cyberpunk', name: 'Cyberpunk', css: 'linear-gradient(135deg, #0d0221 0%, #150534 20%, #ff0066 50%, #00ffff 80%, #0d0221 100%)' },

  // === WZORY (repeating gradients) ===
  { id: 'dots', name: 'Kropki', css: 'radial-gradient(circle, #3b82f6 1px, transparent 1px) 0 0 / 20px 20px repeat, linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%)' },
  { id: 'stripes', name: 'Paski', css: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(59,130,246,0.1) 10px, rgba(59,130,246,0.1) 20px), linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%)' },
  { id: 'checker', name: 'Szachownica', css: 'repeating-conic-gradient(rgba(59,130,246,0.08) 0% 25%, transparent 0% 50%) 0 0 / 30px 30px, linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%)' },
  { id: 'waves', name: 'Fale', css: 'repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(139,92,246,0.06) 20px, rgba(139,92,246,0.06) 21px), repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(139,92,246,0.06) 20px, rgba(139,92,246,0.06) 21px), linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%)' },
  { id: 'hex', name: 'Plastry miodu', css: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.03) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.03) 0%, transparent 50%), linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%)' },
  { id: 'matrix', name: 'Matrix', css: 'linear-gradient(90deg, rgba(0,255,0,0.03) 1px, transparent 1px), linear-gradient(0deg, rgba(0,255,0,0.03) 1px, transparent 1px), linear-gradient(135deg, #000a00 0%, #001a00 100%)' },
  { id: 'circuit', name: 'Obwody', css: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 60%), repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(59,130,246,0.04) 40px, rgba(59,130,246,0.04) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(59,130,246,0.04) 40px, rgba(59,130,246,0.04) 41px), linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%)' },
  { id: 'zigzag', name: 'Zygzak', css: 'repeating-linear-gradient(-45deg, transparent, transparent 15px, rgba(236,72,153,0.06) 15px, rgba(236,72,153,0.06) 16px), repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(236,72,153,0.06) 15px, rgba(236,72,153,0.06) 16px), linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%)' },
  { id: 'bubbles', name: 'Bąbelki', css: 'radial-gradient(circle at 10% 20%, rgba(255,255,255,0.04) 0%, transparent 15px), radial-gradient(circle at 80% 40%, rgba(255,255,255,0.04) 0%, transparent 20px), radial-gradient(circle at 30% 80%, rgba(255,255,255,0.04) 0%, transparent 12px), radial-gradient(circle at 70% 90%, rgba(255,255,255,0.04) 0%, transparent 18px), linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%)' },
  { id: 'grid', name: 'Siatka', css: 'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%)' },
  { id: 'stardust', name: 'Gwiezdny pył', css: 'radial-gradient(circle at 15% 25%, rgba(255,255,255,0.05) 0%, transparent 2px), radial-gradient(circle at 45% 65%, rgba(255,255,255,0.05) 0%, transparent 3px), radial-gradient(circle at 85% 15%, rgba(255,255,255,0.05) 0%, transparent 2px), radial-gradient(circle at 60% 85%, rgba(255,255,255,0.05) 0%, transparent 2px), radial-gradient(circle at 25% 50%, rgba(255,255,255,0.05) 0%, transparent 3px), linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%)' },
];

export default function WallpaperModal({ isOpen, onClose }) {
  const { theme, updateTheme } = useTheme();
  const currentWallpaper = theme?.bgWallpaper || '';

  const selectWallpaper = (wp) => {
    updateTheme({ bgWallpaper: wp.css });
    onClose();
  };

  return (
    <DraggableWindow isOpen={isOpen} onClose={onClose} title="Wybierz tapetę" width="640px" id="wallpaper">
      <div className="wp-grid">
        {WALLPAPERS.map(wp => (
          <button
            key={wp.id}
            className={`wp-item ${currentWallpaper === wp.css ? 'active' : ''}`}
            onClick={() => selectWallpaper(wp)}
          >
            <div
              className="wp-preview"
              style={{
                background: wp.css || 'var(--bg-color)',
                border: wp.id === 'none' ? '2px dashed var(--border-color)' : 'none',
              }}
            >
              {wp.id === 'none' && <FiX className="wp-none-icon" />}
            </div>
            <span className="wp-name">{wp.name}</span>
          </button>
        ))}
      </div>

      <style jsx>{`
        .wp-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        .wp-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: 2px solid transparent;
          border-radius: var(--border-radius);
          padding: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .wp-item:hover {
          border-color: var(--text-muted);
        }
        .wp-item.active {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px var(--accent-color);
        }
        .wp-preview {
          width: 100%;
          aspect-ratio: 16/9;
          border-radius: calc(var(--border-radius) - 4px);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wp-none-icon {
          font-size: 1.5rem;
          color: var(--text-muted);
        }
        .wp-name {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-align: center;
        }
      `}</style>
    </DraggableWindow>
  );
}
