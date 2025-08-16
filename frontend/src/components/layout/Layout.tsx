import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  UsersIcon,
  PlusIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  UserIcon,
  WalletIcon,
} from '@heroicons/react/24/outline';

import { useAppDispatch, useAppSelector } from '@hooks/redux';
import { connectWallet, disconnectWallet } from '@store/slices/walletSlice';
import { hematService } from '@services/web3/hematService';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { isConnected, address, usdtBalance } = useAppSelector((state) => state.wallet);

  const navigation = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'Groups', href: '/groups', icon: UsersIcon },
    { name: 'Create Group', href: '/create-group', icon: PlusIcon },
    { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon },
    { name: 'Insurance', href: '/insurance', icon: ShieldCheckIcon },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
    { name: 'Profile', href: '/profile', icon: UserIcon },
  ];

  useEffect(() => {
    // Check if wallet is already connected
    const checkWalletConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0 && !isConnected) {
          dispatch(connectWallet());
        }
      }
    };

    checkWalletConnection();

    // Listen for wallet connection changes
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          dispatch(disconnectWallet());
        } else if (!isConnected) {
          dispatch(connectWallet());
        }
      });
    }
  }, [dispatch, isConnected]);

  const handleConnectWallet = async () => {
    await dispatch(connectWallet());
  };

  const handleDisconnectWallet = async () => {
    await dispatch(disconnectWallet());
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-white">
              <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Hemat</h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <nav className="flex-1 space-y-1 px-2 py-4">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        isActive
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon
                        className={`mr-3 h-5 w-5 ${
                          isActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-gray-200">
            <Link to="/" className="flex items-center">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">H</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Hemat</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      isActive ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Wallet Info */}
          <div className="p-4 border-t border-gray-200">
            {isConnected ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Connected</span>
                  <span className="text-green-600 font-medium">●</span>
                </div>
                <div className="text-xs text-gray-500 break-all">
                  {formatAddress(address!)}
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {parseFloat(usdtBalance).toFixed(2)} USDT
                </div>
                <button
                  onClick={handleDisconnectWallet}
                  className="w-full px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                className="w-full px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 flex items-center justify-center"
              >
                <WalletIcon className="h-4 w-4 mr-2" />
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* Mobile wallet info */}
          <div className="flex flex-1 items-center gap-x-4 self-stretch lg:hidden">
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {isConnected ? (
                <div className="flex items-center gap-x-2">
                  <span className="text-sm text-gray-500">●</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatAddress(address!)}
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  className="px-3 py-1 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Connect
                </button>
              )}
            </div>
          </div>

          {/* Page title */}
          <div className="flex flex-1 items-center gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1">
              <h1 className="text-lg font-semibold text-gray-900">
                {navigation.find(item => item.href === location.pathname)?.name || 'Hemat'}
              </h1>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;