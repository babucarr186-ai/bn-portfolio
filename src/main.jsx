// Fail-safe mount that will never silently blank the page
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Simple boot log so we can see JS executed in the browser console
console.log('Boot: main.jsx loaded');

const rootEl = document.getElementById('root');
if (!rootEl) {
  // Hard error message in the DOM if #root is missing
  document.body.innerHTML = '<pre style="padding:16px">Error: #root element not found in index.html</pre>';
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}