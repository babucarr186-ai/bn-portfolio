import React from 'react';
import './App.css';

/*
  IPhonePreview
  Wrap children with an iPhone-like device frame for demo/marketing previews.
*/
export default function IPhonePreview({ children }) {
  return (
    <div className="iphone-frame" aria-label="iPhone preview frame">
      <div className="iphone-notch" aria-hidden="true" />
      <div className="iphone-screen">
        {children}
      </div>
    </div>
  );
}
