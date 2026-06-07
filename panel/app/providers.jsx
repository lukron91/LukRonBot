"use client";
import { ThemeProvider } from '@/lib/theme-context';

export function Providers({ children }) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}
