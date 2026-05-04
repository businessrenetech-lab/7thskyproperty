import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const getStoredTheme = () => {
  try {
    return localStorage.getItem('theme') || 'light';
  } catch {
    return 'light';
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Ignore storage failures; the UI should still render.
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
