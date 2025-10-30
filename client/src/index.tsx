import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google'; // 1. Import the provider
import App from './App';
// import { UserProvider } from './context/UserContext';

// 2. Get your Google Client ID from environment variables
// IMPORTANT: Create a .env file in your project's root directory and add:
// REACT_APP_GOOGLE_CLIENT_ID="YOUR_CLIENT_ID_GOES_HERE"
const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    {/* 3. Wrap your App with the provider and pass the Client ID */}
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);