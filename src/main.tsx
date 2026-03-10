import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/editor-core/model/load-protoflux-registry';
import { App } from './app/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
