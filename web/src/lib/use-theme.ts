import { useCallback, useState } from 'react';

export type Theme = 'light' | 'dark';

/**
 * Theme state khớp với class `.dark` trên <html> (đặt bởi script inline trong
 * index.html trước paint). Toggle ghi localStorage 'fw-theme'.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', next === 'dark');
      try {
        localStorage.setItem('fw-theme', next);
      } catch {
        /* no-op */
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
