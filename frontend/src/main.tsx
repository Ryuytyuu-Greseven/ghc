import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// SSO authentication check before main app mount
(function checkAuth() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('token');

  if (urlToken) {
    // Save token from redirect query param
    localStorage.setItem('ghc_auth_token', urlToken);
    // Clean URL search parameters
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, cleanUrl);
  }

  const token = localStorage.getItem('ghc_auth_token');
  if (!token) {
    // Redirect to login micro-frontend
    window.location.href = 'http://localhost:4005';
    return;
  }

  // Setup auto-logout timer based on JWT exp claim
  try {
    const payloadBase64 = token.split('.')[1];
    if (payloadBase64) {
      const payloadDecoded = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadDecoded);
      
      if (payload && payload.exp) {
        const expirationMs = payload.exp * 1000;
        const remainingMs = expirationMs - Date.now();

        if (remainingMs <= 0) {
          // Token is already expired
          localStorage.removeItem('ghc_auth_token');
          window.location.href = 'http://localhost:4005';
          return;
        }

        // Schedule automatic redirection when the token expires
        setTimeout(() => {
          localStorage.removeItem('ghc_auth_token');
          window.location.href = 'http://localhost:4005';
        }, remainingMs);
      }
    }
  } catch (e) {
    console.error('Error decoding JWT token expiration:', e);
  }

  // If authenticated, render the application
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
})();
