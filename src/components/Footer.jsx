// src/components/Footer.jsx

import React from 'react';

const Footer = () => {
  return (
    <footer className="text-center py-4 px-4 mt-8">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        This site is protected by reCAPTCHA and the Google
        <a 
          href="https://policies.google.com/privacy" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="font-medium text-blue-600 dark:text-blue-400 hover:underline mx-1"
        >
          Privacy Policy
        </a> 
        and
        <a 
          href="https://policies.google.com/terms" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="font-medium text-blue-600 dark:text-blue-400 hover:underline ml-1"
        >
          Terms of Service 
        </a>
        &nbsp;apply.
      </p>
    </footer>
  );
};

export default Footer;