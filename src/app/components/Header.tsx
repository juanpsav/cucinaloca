'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useState, useEffect } from 'react';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="sticky top-0 z-50 w-full bg-cream/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-sage-green/20 dark:border-gray-700 transition-colors">
      <div className="max-w-5xl mx-auto px-5 xl:px-0 py-3">
        <div className="flex items-center justify-between">
          <h1 className="flex items-baseline">
            <span className="font-playfair text-2xl font-bold text-sage-green dark:text-sage-green-light">Cucina</span>
            <span className="font-playfair text-2xl font-bold italic text-blood-orange">Loca</span>
          </h1>

          {mounted && (
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-sage-green/10 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5 text-sage-green dark:text-sage-green-light" />
              ) : (
                <Sun className="h-5 w-5 text-sage-green-light" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
