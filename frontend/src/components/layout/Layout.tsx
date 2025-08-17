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
		<div className="min-h-screen bg-kaia-background relative">
			{/* Background gradient effect */}
			<div className="absolute inset-0 bg-kaia-radial opacity-5 pointer-events-none"></div>
			
			{/* Mobile menu */}
			<AnimatePresence>
				{mobileMenuOpen && (
					<motion.div
						initial={{ opacity: 0, x: -300 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -300 }}
						className="fixed inset-0 z-50 lg:hidden"
					>
						<div className="fixed inset-0 bg-black/60 backdrop-blur-kaia" onClick={() => setMobileMenuOpen(false)} />
						<div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-kaia-surface/95 backdrop-blur-kaia border-r border-kaia-border">
							<div className="flex h-16 items-center justify-between px-6 border-b border-kaia-border">
								<h2 className="text-xl font-bold text-gradient">Hemat</h2>
								<button
									onClick={() => setMobileMenuOpen(false)}
									className="text-kaia-text-muted hover:text-kaia-text-primary transition-colors p-2 rounded-kaia-md hover:bg-kaia-glass-light"
								>
									<XMarkIcon className="h-6 w-6" />
								</button>
							</div>
							<nav className="flex-1 space-y-2 px-4 py-6">
								{navigation.map((item) => {
									const isActive = location.pathname === item.href;
									return (
										<Link
											key={item.name}
											to={item.href}
											onClick={() => setMobileMenuOpen(false)}
											className={isActive ? 'nav-link-active' : 'nav-link'}
										>
											<item.icon className="mr-4 h-5 w-5" />
											{item.name}
										</Link>
									);
								})}
							</nav>
							<div className="border-t border-kaia-border p-6">
								<ConnectButton />
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Desktop sidebar */}
			<div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
				<div className="flex flex-col flex-grow bg-kaia-surface/95 backdrop-blur-kaia border-r border-kaia-border">
					<div className="flex items-center h-20 px-6 border-b border-kaia-border">
						<h1 className="text-2xl font-bold text-gradient">Hemat</h1>
					</div>
					<nav className="flex-1 space-y-2 px-4 py-8">
						{navigation.map((item) => {
							const isActive = location.pathname === item.href;
							return (
								<Link
									key={item.name}
									to={item.href}
									className={isActive ? 'nav-link-active' : 'nav-link'}
								>
									<item.icon className="mr-4 h-5 w-5" />
									{item.name}
								</Link>
							);
						})}
					</nav>
					<div className="border-t border-kaia-border p-6">
						<ConnectButton />
					</div>
				</div>
			</div>

			{/* Main content */}
			<div className="lg:pl-64">
				{/* Top navigation */}
				<div className="sticky top-0 z-40 bg-kaia-surface/95 backdrop-blur-kaia border-b border-kaia-border">
					<div className="flex h-20 items-center justify-between px-6 sm:px-8 lg:px-10">
						<div className="flex items-center">
							<button
								type="button"
								className="lg:hidden -m-2.5 p-2.5 text-kaia-text-muted hover:text-kaia-text-primary transition-colors rounded-kaia-md hover:bg-kaia-glass-light"
								onClick={() => setMobileMenuOpen(true)}
							>
								<span className="sr-only">Open sidebar</span>
								<Bars3Icon className="h-6 w-6" />
							</button>
							<div className="ml-4 lg:ml-0">
								<h2 className="text-xl font-semibold text-kaia-text-primary">
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
							<button className="p-3 text-kaia-text-muted hover:text-kaia-text-primary transition-colors rounded-kaia-md hover:bg-kaia-glass-light backdrop-blur-kaia">
								<Cog6ToothIcon className="h-5 w-5" />
							</button>
						</div>
					</div>
				</div>

				{/* Page content */}
				<main className="flex-1">
					<div className="py-8">
						<div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
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