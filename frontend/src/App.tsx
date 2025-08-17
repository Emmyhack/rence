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
              accentColor: '#BFF009',
              accentColorForeground: '#040404',
              borderRadius: 'large',
              fontStack: 'system',
            })}
            showRecentTransactions={true}
          >
            <QueryClientProvider client={queryClient}>
              <ErrorBoundary>
                <Router>
                  <div className="min-h-screen bg-kaia-background relative overflow-hidden">
                    {/* Background gradient effect */}
                    <div className="absolute inset-0 bg-kaia-radial opacity-5 pointer-events-none"></div>
                    
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
                          background: '#1A1A1A',
                          color: '#FFFFFF',
                          border: '1px solid #3D3D3D',
                          borderRadius: '32px',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                          backdropFilter: 'blur(32px)',
                        },
                        success: {
                          duration: 3000,
                          iconTheme: {
                            primary: '#BFF009',
                            secondary: '#040404',
                          },
                          style: {
                            background: 'rgba(191, 240, 9, 0.1)',
                            border: '1px solid #BFF009',
                            color: '#BFF009',
                          },
                        },
                        error: {
                          duration: 5000,
                          iconTheme: {
                            primary: '#EF4444',
                            secondary: '#FFFFFF',
                          },
                          style: {
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid #EF4444',
                            color: '#EF4444',
                          },
                        },
                        loading: {
                          style: {
                            background: '#0A0A0A',
                            border: '1px solid #3D3D3D',
                            color: '#BFF009',
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