import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';
import { bootstrapRendererApp } from './bootstrap';
import { initElectronShim } from './services/electronShim';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

try {
  const renderApp = () => {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <Provider store={store}>
          <App />
        </Provider>
      </React.StrictMode>
    );
  };

  void bootstrapRendererApp({
    hasElectron: Boolean(window.electron),
    initElectronShim,
    onInitError: (error) => {
      console.error('[Renderer Entry] Failed to initialize electron shim:', error);
    },
    renderApp,
  });
} catch (error) {
  console.error('Failed to render the app:', error);
}
