// Test utility to verify network-based USDT configuration
import { getContractAddresses, getUSDTTokenInfo, NETWORK_CONFIG } from '../services/web3/contracts';

export const testNetworkConfiguration = () => {
  console.log('=== Network Configuration Test ===');
  
  // Test Kaia Mainnet (8217)
  const mainnetConfig = getContractAddresses(8217);
  const mainnetTokenInfo = getUSDTTokenInfo(8217);
  
  console.log('Kaia Mainnet (8217):');
  console.log('- USDT Address:', mainnetConfig.USDT);
  console.log('- Token Name:', mainnetTokenInfo.name);
  console.log('- Is Testnet:', mainnetTokenInfo.isTestnet);
  console.log('- Expected: Real USDT on Mainnet');
  
  // Test Kaia Testnet (1001)
  const testnetConfig = getContractAddresses(1001);
  const testnetTokenInfo = getUSDTTokenInfo(1001);
  
  console.log('\nKaia Testnet (1001):');
  console.log('- USDT Address:', testnetConfig.USDT);
  console.log('- Token Name:', testnetTokenInfo.name);
  console.log('- Is Testnet:', testnetTokenInfo.isTestnet);
  console.log('- Expected: Mock USDT on Testnet');
  
  // Test unknown network (should default to testnet)
  const unknownConfig = getContractAddresses(999);
  const unknownTokenInfo = getUSDTTokenInfo(999);
  
  console.log('\nUnknown Network (999):');
  console.log('- USDT Address:', unknownConfig.USDT);
  console.log('- Token Name:', unknownTokenInfo.name);
  console.log('- Is Testnet:', unknownTokenInfo.isTestnet);
  console.log('- Expected: Should default to Testnet config');
  
  console.log('\n=== Test Complete ===');
  
  return {
    mainnet: { config: mainnetConfig, token: mainnetTokenInfo },
    testnet: { config: testnetConfig, token: testnetTokenInfo },
    unknown: { config: unknownConfig, token: unknownTokenInfo }
  };
};

// Wallet detection test
export const testWalletDetection = () => {
  console.log('=== Wallet Detection Test ===');
  
  const anyWindow: any = window as any;
  
  const kaikasAvailable = typeof anyWindow.klaytn !== 'undefined';
  const metamaskAvailable = typeof anyWindow.ethereum !== 'undefined';
  
  console.log('Kaikas Available:', kaikasAvailable);
  console.log('MetaMask Available:', metamaskAvailable);
  
  // Determine priority
  const prioritizedProvider = anyWindow.klaytn || anyWindow.ethereum;
  const detectedWallet = anyWindow.klaytn ? 'Kaikas' : 'MetaMask/Other';
  
  console.log('Prioritized Provider:', prioritizedProvider ? 'Found' : 'None');
  console.log('Detected Wallet Type:', detectedWallet);
  console.log('Kaikas Prioritized:', !!anyWindow.klaytn);
  
  console.log('=== Wallet Test Complete ===');
  
  return {
    kaikasAvailable,
    metamaskAvailable,
    prioritizedProvider: !!prioritizedProvider,
    detectedWallet,
    kaikasPrioritized: !!anyWindow.klaytn
  };
};