// src/components/Header.jsx

import React from 'react';
import ThemeToggle from './ThemeToggle';

const SettingsIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> );

// --- MODIFIED: Component now accepts appTitle and appIcon ---
const Header = ({ appTitle, appIcon, onOpenSettings, onLogout }) => {
  return (
    <header className="bg-[#1C2135] dark:bg-gray-900 shadow-md sticky top-0 z-40">
      <nav className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img 
              src={appIcon} 
              alt="App Icon" 
              className="w-10 h-10 object-cover bg-gray-700 rounded-md" 
            />
            {/* --- MODIFIED: Use the appTitle from props --- */}
            <h1 className="text-white text-xl font-bold">
              {appTitle}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onOpenSettings} 
              className="p-2 rounded-full text-gray-400 hover:text-white transition-colors" 
              title="Settings"
            >
              <SettingsIcon />
            </button>
            <ThemeToggle />
            <button 
              onClick={onLogout} 
              className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;