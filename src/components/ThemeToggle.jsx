// src/components/ThemeToggle.jsx

import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <label htmlFor="theme-switch" className="flex items-center cursor-pointer">
      <div className="relative">
        <input 
          type="checkbox" 
          id="theme-switch" 
          className="sr-only" // Hide the default checkbox
          checked={isDark}
          onChange={toggleTheme}
        />
        {/* The track of the switch */}
        <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
        {/* The thumb of the switch */}
        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ease-in-out ${isDark ? 'transform translate-x-6' : ''}`}></div>
      </div>
    </label>
  );
};

export default ThemeToggle;