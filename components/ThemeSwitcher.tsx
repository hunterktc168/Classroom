'use client';

import React, { useEffect, useSyncExternalStore } from 'react';
import { Moon, Sun, Zap } from 'lucide-react';

export type ThemeMode = 'light' | 'dark' | 'cyberpunk';

const STORAGE_KEY = 'classroom-roster-theme';
const THEME_EVENT = 'classroom-theme-change';

function isValidTheme(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'cyberpunk';
}

function subscribeTheme(callback: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener('storage', handleStorage);
  window.addEventListener(THEME_EVENT, callback);
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(THEME_EVENT, callback);
  };
}

function getThemeSnapshot(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isValidTheme(stored) ? stored : 'light';
  } catch {
    return 'light';
  }
}

function getServerThemeSnapshot(): ThemeMode {
  return 'light';
}

function applyThemeToDocument(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('dark', 'cyberpunk');
  if (mode === 'dark') {
    root.classList.add('dark');
  } else if (mode === 'cyberpunk') {
    root.classList.add('cyberpunk');
  }
}

export function ThemeSwitcher() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const handleSelectTheme = (mode: ThemeMode) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore storage failures in restricted contexts
    }
    applyThemeToDocument(mode);
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  const options: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
    {
      id: 'light',
      label: 'Light',
      icon: <Sun className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'dark',
      label: 'Dark',
      icon: <Moon className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      id: 'cyberpunk',
      label: 'Cyberpunk',
      icon: <Zap className="w-3.5 h-3.5 shrink-0" />,
    },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Color theme mode"
      className="inline-flex items-center p-0.5 bg-surface-subtle border border-border-subtle rounded-lg shrink-0"
    >
      {options.map((option) => {
        const isActive = theme === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => handleSelectTheme(option.id)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
              isActive
                ? 'bg-surface text-ink-primary shadow-2xs cyberpunk:border cyberpunk:border-cyan-400/50 cyberpunk:text-cyan-300 cyberpunk:shadow-[0_0_12px_-3px_rgba(0,229,255,0.45)]'
                : 'text-ink-muted hover:text-ink-primary'
            }`}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
