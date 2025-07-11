// src/main.jsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from './context/ThemeContext'
// --- 1. Import the reCAPTCHA provider ---
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

// --- 2. Get the site key from your environment variables ---
const recaptchaV3SiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* --- 3. Wrap your existing providers with the reCAPTCHA provider --- */}
    <GoogleReCaptchaProvider reCaptchaKey={recaptchaV3SiteKey}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </GoogleReCaptchaProvider>
  </React.StrictMode>,
)