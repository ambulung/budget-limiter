import React from 'react';

const Header = () => {
  return (
    // This header will be dark, sticky, and stay on top of other content
    <header className="bg-gray-800 dark:bg-gray-900 shadow-lg sticky top-0 z-40">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-start h-16">
          {/* This div keeps the text aligned to the right */}
          <div className="flex items-center">
            <h1 className="text-white font-sans text-xl font">
              BUDGET LIMIT
            </h1>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;