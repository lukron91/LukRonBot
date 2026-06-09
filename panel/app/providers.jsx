"use client";
import { ThemeProvider } from '@/lib/theme-context';
import { ToastProvider } from '@/components/Toast';

export function Providers({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ThemeProvider>
  );
}
