"use client";

import { useTheme } from '@/components/ThemeProvider';
import { Moon, Sun } from 'lucide-react';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-light-primary dark:text-dark-primary hover:bg-white/20 hover:shadow-md transition"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
};