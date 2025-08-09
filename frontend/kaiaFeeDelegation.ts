import { ethers, BrowserProvider } from "ethers";

const KAIA_RPC = "https://public-en-kairos.kaia.io"; // Testnet

// web3authProvider: the provider object from Web3Auth
export async function signFeeDelegatedTxWithWeb3Auth(web3authProvider: any, to: string, data: string) {
  const provider = new BrowserProvider(web3authProvider);
  const signer = await provider.getSigner();

  // Prepare transaction (no gas, fee payer will pay)
  const tx = {
    to,
    data,
    value: 0,
    gasLimit: 300000n, // ethers v6 expects bigint
    // Do NOT set gasPrice or nonce; fee payer will handle
  };

  // Sign the transaction (but do not send)
  const signedTx = await signer.signTransaction(tx);

  // Send signedTx to your backend for fee delegation
  // Example:
  // await fetch('/relay', { method: 'POST', body: JSON.stringify({ signedTx }) });
  return signedTx;
} 