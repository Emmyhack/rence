export const KAIA_MAINNET_PARAMS = {
  chainId: '0x2019',
  chainName: 'Kaia Mainnet',
  nativeCurrency: { name: 'KAIA', symbol: 'KAIA', decimals: 18 },
  rpcUrls: ['https://public-en-cypress.kaia.io'],
  blockExplorerUrls: ['https://scope.klaytn.com'],
}

export const KAIA_TESTNET_PARAMS = {
  chainId: '0x3E9', // 1001
  chainName: 'Kaia Testnet Kairos',
  nativeCurrency: { name: 'KAIA', symbol: 'KAIA', decimals: 18 },
  rpcUrls: ['https://public-en-kairos.kaia.io'],
  blockExplorerUrls: ['https://baobab.scope.klaytn.com'],
}

export async function switchToKaia(provider: any, target: 'mainnet' | 'testnet' = 'testnet') {
  const params = target === 'mainnet' ? KAIA_MAINNET_PARAMS : KAIA_TESTNET_PARAMS
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: params.chainId }] })
  } catch (switchError: any) {
    // 4902: Unrecognized chain, try adding it
    if (switchError?.code === 4902 || /Unrecognized chain/.test(String(switchError?.message || ''))) {
      await provider.request({ method: 'wallet_addEthereumChain', params: [params] })
    } else {
      throw switchError
    }
  }
}