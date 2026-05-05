// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0D0D0D',
            color: '#F5F0E8',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            borderRadius: '8px',
            border: '1px solid #2a2a2a',
          },
          success: {
            iconTheme: { primary: '#E8572A', secondary: '#F5F0E8' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#F5F0E8' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
