// src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';

// --- REMOVED: GoogleReCaptchaProvider import ---
// You no longer need to import GoogleReCaptchaProvider
// because Firebase App Check handles reCAPTCHA v3 integration directly.
// import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

// --- REMOVED: recaptchaV3SiteKey constant ---
// This constant is no longer needed here as the provider is removed.
// const recaptchaV3SiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* --- REMOVED: GoogleReCaptchaProvider wrapper --- */}
    {/* The App Check SDK (initialized in firebase.js) will manage reCAPTCHA v3. */}
    {/* Ensure the reCAPTCHA v3 script tag is in your public/index.html */}
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);