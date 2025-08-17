import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiConfig } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { Toaster } from 'react-hot-toast';

import { store, persistor } from '@store/index';
import { wagmiConfig, chains } from '@services/web3/config';
import Layout from '@components/layout/Layout';
import LoadingSpinner from '@components/ui/LoadingSpinner';

// Pages
import HomePage from '@pages/HomePage';
import GroupsPage from '@pages/GroupsPage';
import GroupDetailPage from '@pages/GroupDetailPage';
import CreateGroupPage from '@pages/CreateGroupPage';
import DashboardPage from '@pages/DashboardPage';
import InsurancePage from '@pages/InsurancePage';

import ProfilePage from '@pages/ProfilePage';
import NotFoundPage from '@pages/NotFoundPage';

// Styles
import '@rainbow-me/rainbowkit/styles.css';
import './index.css';
import ErrorBoundary from '@components/common/ErrorBoundary';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingSpinner />} persistor={persistor}>
        <WagmiConfig config={wagmiConfig}>
          <RainbowKitProvider
            chains={chains}
            theme={darkTheme({
              accentColor: '#0ea5e9',
              accentColorForeground: 'white',
              borderRadius: 'large',
              fontStack: 'system',
            })}
            showRecentTransactions={true}
          >
            <QueryClientProvider client={queryClient}>
              <ErrorBoundary>
                <Router>
                  <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
                    <Layout>
                      <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<HomePage />} />
                        <Route path="/groups" element={<GroupsPage />} />
                        <Route path="/groups/:id" element={<GroupDetailPage />} />
                        
                        {/* Protected Routes */}
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/create-group" element={<CreateGroupPage />} />
                        <Route path="/insurance" element={<InsurancePage />} />

                        <Route path="/profile" element={<ProfilePage />} />
                        
                        {/* 404 Route */}
                        <Route path="*" element={<NotFoundPage />} />
                      </Routes>
                    </Layout>
                    
                    {/* Global Toast Notifications */}
                    <Toaster
                      position="top-right"
                      toastOptions={{
                        duration: 5000,
                        style: {
                          background: '#1e293b',
                          color: '#f8fafc',
                          border: '1px solid #334155',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                        },
                        success: {
                          duration: 3000,
                          iconTheme: {
                            primary: '#14b8a6',
                            secondary: '#f8fafc',
                          },
                          style: {
                            background: '#042f2e',
                            border: '1px solid #0d9488',
                          },
                        },
                        error: {
                          duration: 5000,
                          iconTheme: {
                            primary: '#ef4444',
                            secondary: '#f8fafc',
                          },
                          style: {
                            background: '#450a0a',
                            border: '1px solid #dc2626',
                          },
                        },
                        loading: {
                          style: {
                            background: '#0f172a',
                            border: '1px solid #475569',
                          },
                        },
                      }}
                    />
                  </div>
                </Router>
              </ErrorBoundary>
            </QueryClientProvider>
          </RainbowKitProvider>
        </WagmiConfig>
      </PersistGate>
    </Provider>
  );
}

export default App;