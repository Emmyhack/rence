import { configureChains, createConfig } from 'wagmi'
import { publicProvider } from 'wagmi/providers/public'
import { injectedWallet, metaMaskWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { kaikasWallet } from './wallets/kaikasWallet'

// Kaia network configurations
export const kaiaTestnet = {
  id: 1001,
  name: 'Kaia Testnet Kairos',
  network: 'kaia-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'KAIA',
    symbol: 'KAIA',
  },
  rpcUrls: {
    default: {
      http: ['https://public-en-kairos.kaia.io'],
    },
    public: {
      http: ['https://public-en-kairos.kaia.io'],
    },
  },
  blockExplorers: {
    default: { name: 'KaiaScope', url: 'https://baobab.scope.klaytn.com' },
  },
  testnet: true,
}

export const kaiaMainnet = {
  id: 8217,
  name: 'Kaia Mainnet',
  network: 'kaia-mainnet', 
  nativeCurrency: {
    decimals: 18,
    name: 'KAIA',
    symbol: 'KAIA',
  },
  rpcUrls: {
    default: {
      http: ['https://public-en-cypress.kaia.io'],
    },
    public: {
      http: ['https://public-en-cypress.kaia.io'],
    },
  },
  blockExplorers: {
    default: { name: 'KaiaScope', url: 'https://scope.klaytn.com' },
  },
}

// Configure chains
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [kaiaTestnet, kaiaMainnet],
  [publicProvider()]
)

// Configure wallets (excluding Safe wallet to avoid dependency issues)
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || undefined;
const connectors = connectorsForWallets([
  {
    groupName: 'Recommended',
    wallets: walletConnectProjectId
      ? [
          injectedWallet({ chains }),
          kaikasWallet({ chains }),
          metaMaskWallet({ projectId: walletConnectProjectId, chains }),
          walletConnectWallet({ projectId: walletConnectProjectId, chains }),
        ]
      : [
          injectedWallet({ chains }),
          kaikasWallet({ chains }),
        ],
  },
])

// Create wagmi config
export const wagmiConfig = createConfig({
  autoConnect: false,
  connectors,
  publicClient,
  webSocketPublicClient,
})

export { chains }