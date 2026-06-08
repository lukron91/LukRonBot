"use client";
import { useTheme } from '@/lib/theme-context';
import { FiMessageSquare } from 'react-icons/fi';

export default function TicketsPage() {
  const { accentColor } = useTheme();
  return (
    <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', color: 'var(--text-muted)' }}>
      <FiMessageSquare size={48} style={{ color: accentColor, marginBottom: '1rem', opacity: 0.7 }} />
      <h2 style={{ color: 'var(--text-color)', marginBottom: '0.5rem' }}>Tickety</h2>
      <p style={{ fontSize: '0.9rem' }}>Ta funkcja jest w trakcie budowy.<br />Pojawi się w jednej z kolejnych wersji.</p>
    </div>
  );
}
