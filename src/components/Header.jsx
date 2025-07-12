// Header.jsx
import React from 'react';
import ThemeToggle from './ThemeToggle';
import { SettingsIcon } from './Dashboard'; // Import SettingsIcon from Dashboard or a shared Icons file

const Header = ({ user, onLogout, appTitle, appIcon, isGuest, onSettingsClick }) => {
  return (
    <header className="bg-gray-800 dark:bg-gray-900 shadow-lg sticky top-0 z-40">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={appIcon}
              alt="App Icon"
              className="w-10 h-10 object-cover flex-shrink-0 rounded-full"
            />
            <h1 className="text-white font-sans text-xl sm:text-2xl font-extrabold truncate">
              {isGuest ? "Guest's Budget" : appTitle}
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={onSettingsClick}
              className="p-2 rounded-full text-gray-300 hover:text-white hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors"
              title="Settings"
            >
              <SettingsIcon />
            </button>
            <ThemeToggle />
            <button
              onClick={onLogout}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-white font-semibold rounded-lg shadow-md transition-all ${
                isGuest ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {isGuest ? 'Login / Sign Up' : 'Logout'}
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;