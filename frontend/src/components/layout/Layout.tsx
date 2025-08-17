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
	Cog6ToothIcon,
} from '@heroicons/react/24/outline';

import { useAppDispatch, useAppSelector } from '@hooks/redux';
import { connectWallet, disconnectWallet } from '@store/slices/walletSlice';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const location = useLocation();
	const dispatch = useAppDispatch();
	const { isConnected } = useAppSelector((state) => state.wallet);

	const navigation = [
		{ name: 'Home', href: '/', icon: HomeIcon },
		{ name: 'Groups', href: '/groups', icon: UsersIcon },
		{ name: 'Create Group', href: '/create-group', icon: PlusIcon },
		{ name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon },
		{ name: 'Insurance', href: '/insurance', icon: ShieldCheckIcon },
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

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
			{/* Mobile menu */}
			<AnimatePresence>
				{mobileMenuOpen && (
					<motion.div
						initial={{ opacity: 0, x: -300 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -300 }}
						className="fixed inset-0 z-50 lg:hidden"
					>
						<div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
						<div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-gray-900/95 backdrop-blur-md border-r border-gray-800">
							<div className="flex h-16 items-center justify-between px-4 border-b border-gray-800">
								<h2 className="text-lg font-semibold text-white gradient-text">Hemat</h2>
								<button
									onClick={() => setMobileMenuOpen(false)}
									className="text-gray-400 hover:text-white transition-colors"
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
											className={isActive ? 'nav-link-active' : 'nav-link'}
										>
											<item.icon className="mr-3 h-5 w-5" />
											{item.name}
										</Link>
									);
								})}
							</nav>
							<div className="border-t border-gray-800 p-4">
								<ConnectButton />
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Desktop sidebar */}
			<div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
				<div className="flex flex-col flex-grow bg-gray-900/95 backdrop-blur-md border-r border-gray-800">
					<div className="flex items-center h-16 px-4 border-b border-gray-800">
						<h1 className="text-xl font-bold text-white gradient-text">Hemat</h1>
					</div>
					<nav className="flex-1 space-y-1 px-2 py-4">
						{navigation.map((item) => {
							const isActive = location.pathname === item.href;
							return (
								<Link
									key={item.name}
									to={item.href}
									className={isActive ? 'nav-link-active' : 'nav-link'}
								>
									<item.icon className="mr-3 h-5 w-5" />
									{item.name}
								</Link>
							);
						})}
					</nav>
					<div className="border-t border-gray-800 p-4">
						<ConnectButton />
					</div>
				</div>
			</div>

			{/* Main content */}
			<div className="lg:pl-64">
				{/* Top navigation */}
				<div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
					<div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
						<div className="flex items-center">
							<button
								type="button"
								className="lg:hidden -m-2.5 p-2.5 text-gray-400 hover:text-white"
								onClick={() => setMobileMenuOpen(true)}
							>
								<span className="sr-only">Open sidebar</span>
								<Bars3Icon className="h-6 w-6" />
							</button>
							<div className="ml-4 lg:ml-0">
								<h2 className="text-lg font-semibold text-white">
									{navigation.find(item => item.href === location.pathname)?.name || 'Hemat'}
								</h2>
							</div>
						</div>
						
						<div className="flex items-center space-x-4">
							{/* Connect button for desktop */}
							<div className="hidden sm:block">
								<ConnectButton />
							</div>
							
							{/* Settings button */}
							<button className="p-2 text-gray-400 hover:text-white transition-colors">
								<Cog6ToothIcon className="h-5 w-5" />
							</button>
						</div>
					</div>
				</div>

				{/* Page content */}
				<main className="flex-1">
					<div className="py-6">
						<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
							<AnimatePresence mode="wait">
								<motion.div
									key={location.pathname}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -20 }}
									transition={{ duration: 0.3 }}
								>
									{children}
								</motion.div>
							</AnimatePresence>
						</div>
					</div>
				</main>
			</div>
		</div>
	);
};

export default Layout;