"use client";
import { useTheme } from '@/lib/theme-context';
import DraggableWindow from './DraggableWindow';
import { FiX } from 'react-icons/fi';

const WALLPAPERS = [
  { id: 'none', name: 'Brak tła', css: '' },
  { id: 'dark-purple', name: 'Ciemny fiolet', css: 'radial-gradient(circle at 20% 50%, #1a1a2e 0%, #0a0a0f 100%)' },
  { id: 'navy-mist', name: 'Granatowa mgła', css: 'radial-gradient(circle at 80% 20%, #0f172a 0%, #0a0a0f 100%)' },
  { id: 'emerald', name: 'Szmaragdowa głąb', css: 'radial-gradient(circle at 50% 80%, #064e3b 0%, #0a0a0f 100%)' },
  { id: 'ruby', name: 'Rubinowy glow', css: 'radial-gradient(circle at 30% 30%, #2d0a0a 0%, #0a0a0f 100%)' },
  { id: 'cobalt', name: 'Kobaltowy blask', css: 'radial-gradient(circle at 70% 60%, #172554 0%, #0a0a0f 100%)' },
  { id: 'amber', name: 'Bursztynowa poświata', css: 'radial-gradient(circle at 50% 20%, #451a03 0%, #0a0a0f 100%)' },
  { id: 'lavender', name: 'Lawendowy sen', css: 'radial-gradient(circle at 80% 80%, #2e1065 0%, #0a0a0f 100%)' },
  { id: 'forest', name: 'Leśny cień', css: 'radial-gradient(circle at 20% 80%, #052e16 0%, #0a0a0f 100%)' },
  { id: 'steel', name: 'Stalowy chłód', css: 'radial-gradient(circle at 60% 40%, #1e293b 0%, #0a0a0f 100%)' },
  { id: 'cherry', name: 'Ciemna wiśnia', css: 'radial-gradient(circle at 40% 70%, #2d0a0a 0%, #1a0a0a 50%, #0a0a0f 100%)' },
  { id: 'night-sky', name: 'Nocne niebo', css: 'radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 50%, #0a0a0f 100%)' },
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
