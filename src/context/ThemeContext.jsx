// src/context/ThemeContext.jsx

import React, { createContext, useState, useEffect, useContext } from 'react';

// Create the context
const ThemeContext = createContext();

// Create a provider component
export const ThemeProvider = ({ children }) => {
  // Get theme from localStorage or default to 'light'
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const root = window.document.documentElement; // The <html> element

    // Remove old theme class and add the new one
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);

    // Save the user's preference to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Create a custom hook to use the theme context easily
export const useTheme = () => useContext(ThemeContext);