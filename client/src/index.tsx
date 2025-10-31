// src/index.tsx (CRA)
import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';

const googleClientId = (process.env.REACT_APP_GOOGLE_CLIENT_ID as string) || '';

if (!googleClientId) {
  // In development, crash early so you don’t debug ghosts.
  if (process.env.NODE_ENV !== 'production') {
    throw new Error(
      'Missing REACT_APP_GOOGLE_CLIENT_ID. Add it to your .env and restart: \n' +
      'REACT_APP_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID'
    );
  } else {
    // In prod, don’t crash the whole app; log and continue (Google Sign-In will be disabled).
    // eslint-disable-next-line no-console
    console.error('Missing REACT_APP_GOOGLE_CLIENT_ID. Google Sign-In will not work.');
  }
}

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

const root = ReactDOM.createRoot(rootEl as HTMLElement);

root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
