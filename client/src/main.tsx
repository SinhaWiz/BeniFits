import * as Sentry from '@sentry/react';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import './index.css';
import { queryClient } from './lib/queryClient';
import { initSentry } from './lib/sentry';
import { SocketProvider } from './realtime/SocketContext';

initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div className="mx-auto max-w-md py-24 text-center text-slate-300">
          <h1 className="text-xl font-semibold text-slate-100">Something went wrong</h1>
          <p className="mt-2 text-sm">Please refresh the page and try again.</p>
        </div>
      }
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <SocketProvider>
              <App />
            </SocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
);
