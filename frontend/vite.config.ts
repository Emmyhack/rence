import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	base: './',
	
	// Path resolution
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@components': path.resolve(__dirname, './src/components'),
			'@pages': path.resolve(__dirname, './src/pages'),
			'@hooks': path.resolve(__dirname, './src/hooks'),
			'@utils': path.resolve(__dirname, './src/utils'),
			'@services': path.resolve(__dirname, './src/services'),
			'@store': path.resolve(__dirname, './src/store'),
			'@types': path.resolve(__dirname, './src/types'),
			'@assets': path.resolve(__dirname, './src/assets'),
			// Map Safe Apps modules (some libs import these even if unused)
			'@safe-global/safe-apps-provider': path.resolve(__dirname, './src/shims/safe-apps.ts'),
			'@safe-global/safe-apps-sdk': path.resolve(__dirname, './src/shims/safe-apps.ts'),
			// Also handle a mistakenly rewritten specifier with "globalThis" in the id
			'@safe-globalThis/safe-apps-provider': path.resolve(__dirname, './src/shims/safe-apps.ts'),
			'@safe-globalThis/safe-apps-sdk': path.resolve(__dirname, './src/shims/safe-apps.ts'),
		},
	},

	// Development server configuration
	server: {
		port: 3000,
		host: true,
		open: true,
		proxy: {
			'/api': {
				target: 'http://localhost:5000',
				changeOrigin: true,
				secure: false,
			},
		},
	},

	// Build configuration
	build: {
		outDir: 'dist',
		sourcemap: true,
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ['react', 'react-dom', 'react-router-dom'],
					web3: ['ethers', 'wagmi', '@rainbow-me/rainbowkit'],
					ui: ['@headlessui/react', '@heroicons/react'],
					charts: ['recharts'],
				},
			},
		},
	},

	// Optimizations
	optimizeDeps: {
		include: ['react', 'react-dom', 'ethers'],
	},
})