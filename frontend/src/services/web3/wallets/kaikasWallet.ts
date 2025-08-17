import type { Wallet } from '@rainbow-me/rainbowkit'
import { InjectedConnector } from 'wagmi/connectors/injected'

export const kaikasWallet = ({ chains, shimDisconnect = true }: { chains: any[], shimDisconnect?: boolean }): Wallet => {
  return {
    id: 'kaikas',
    name: 'Kaikas',
    iconUrl: 'https://raw.githubusercontent.com/Emmyhack/assets/main/kaikas-icon.png',
    iconBackground: '#1c1f24',
    installed: typeof window !== 'undefined' && typeof (window as any).klaytn !== 'undefined',
    downloadUrls: {
      browserExtension: 'https://chromewebstore.google.com/detail/kaikas/jblndlipeogpafnldhgmapagcccfchpi',
    },
    createConnector: () => {
      const getProvider = () => (typeof window !== 'undefined' ? (window as any).klaytn : undefined)
      const connector = new InjectedConnector({
        chains,
        options: {
          name: 'Kaikas',
          getProvider,
          shimDisconnect,
        },
      })
      return { connector }
    },
  }
}