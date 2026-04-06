import React from 'react';
import { createRoot } from 'react-dom/client';
import Landing from './Landing';
import '../web/index.css';

const root = createRoot(document.getElementById('landing-root')!);
root.render(
  <React.StrictMode>
    <Landing />
  </React.StrictMode>
);
