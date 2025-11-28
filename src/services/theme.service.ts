import { Injectable, signal } from '@angular/core';

type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme = signal<ThemeMode>('light');

  constructor() {
    const stored = this.readStoredTheme();
    if (stored) {
      this.setTheme(stored);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.setTheme('dark');
    } else {
      this.applyTheme('light');
    }
  }

  toggleTheme(): void {
    const next = this.theme() === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
    this.applyTheme(mode);
    this.storeTheme(mode);
  }

  private applyTheme(mode: ThemeMode): void {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
      document.body.classList.add('dark');
      document.body.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
      document.body.style.colorScheme = 'light';
    }
  }

  private storeTheme(mode: ThemeMode): void {
    try {
      localStorage.setItem('biblicart_theme', mode);
    } catch {
      // ignore
    }
  }

  private readStoredTheme(): ThemeMode | null {
    try {
      const value = localStorage.getItem('biblicart_theme');
      if (value === 'light' || value === 'dark') return value;
      return null;
    } catch {
      return null;
    }
  }
}
