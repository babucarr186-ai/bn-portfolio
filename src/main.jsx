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
}<div class="profile-header">
  <img src="your-photo.jpg" alt="Bubacar Nget" class="profile-pic">
  <h1>Bubacar Nget</h1>
  <div class="tags">
    <span>Digital Marketing</span>
    <span>Web Development</span>
    <span>Automation</span>
  </div>
</div>
