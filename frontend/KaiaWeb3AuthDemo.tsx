import React, { useState } from "react";
import { Web3Auth, Web3AuthOptions } from "@web3auth/modal";
import { CHAIN_NAMESPACES, UserInfo } from "@web3auth/base";
import { ExternalProvider } from "@ethersproject/providers";
import { signFeeDelegatedTxWithWeb3Auth } from "./kaiaFeeDelegation";

const clientId = "BIDvAvA5x2GW8H2Mq-FKUSmqE1szipafK1SUMYipZmzT1xdWtkc2bbOpSX2VyVJtJCH3LxdJy400Esv82MU6KG8"; // Web3Auth client ID

export default function KaiaWeb3AuthDemo() {
  const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
  const [provider, setProvider] = useState<ExternalProvider | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [txHash, setTxHash] = useState<string>("");

  // 1. Initialize Web3Auth with Sapphire Devnet
  const initWeb3Auth = async () => {
    const options: Web3AuthOptions = {
      clientId,
      web3AuthNetwork: "sapphire_devnet",
      chainConfig: {
        chainNamespace: CHAIN_NAMESPACES.EIP155,
        chainId: "0x3e9", // 1001 (Kairos testnet)
        rpcTarget: "https://public-en-kairos.kaia.io",
        displayName: "Kaia Kairos Testnet",
        blockExplorer: "https://kairos.scope.kaia.io/",
        ticker: "KAIA",
        tickerName: "Kaia",
      },
    };
    const web3authInstance = new Web3Auth(options);
    await web3authInstance.initModal();
    setWeb3auth(web3authInstance);
  };

  // 2. Login with Web3Auth
  const login = async () => {
    if (!web3auth) return;
    const provider = (await web3auth.connect()) as ExternalProvider;
    setProvider(provider);
    const userInfo = await web3auth.getUserInfo();
    setUser(userInfo);
  };

  // 3. Sign and send a fee-delegated transaction
  const sendTx = async () => {
    if (!provider) return;
    // Example: call a contract method (replace with your contract address and data)
    const contractAddress = "0x...YOUR_CONTRACT_ADDRESS...";
    const data = "0x..."; // ABI-encoded data for the contract call
    const signedTx = await signFeeDelegatedTxWithWeb3Auth(provider, contractAddress, data);
    // Send to backend relay endpoint
    const res = await fetch("/relay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedTx }),
    });
    const { txHash } = await res.json();
    setTxHash(txHash);
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Kaia + Web3Auth Demo</h2>
      {!web3auth && <button onClick={initWeb3Auth}>Init Web3Auth</button>}
      {web3auth && !user && <button onClick={login}>Login with Web3Auth</button>}
      {user && (
        <div>
          <div>Logged in as: {user.name || user.email}</div>
          <button onClick={sendTx}>Send Fee-Delegated Tx</button>
        </div>
      )}
      {txHash && (
        <div>
          <div>Transaction sent!</div>
          <a href={`https://kairos.scope.kaia.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            View on Kaia Explorer
          </a>
        </div>
      )}
    </div>
  );
} 