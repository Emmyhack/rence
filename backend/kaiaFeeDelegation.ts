import { ethers } from "ethers";
import { extendEthersWithKaia } from "@kaia-labs/kaia-ethers-ext";
import dotenv from "dotenv";
extendEthersWithKaia(ethers);
dotenv.config();

const KAIA_RPC = "https://public-en-kairos.kaia.io"; // Testnet
const PRIVATE_KEY = process.env.PRIVATE_KEY!; // Fee payer's private key

// This function relays a signed tx from a Web3Auth-authenticated user
export async function relayFeeDelegatedTx(signedTx: string) {
  const provider = new ethers.providers.JsonRpcProvider(KAIA_RPC);
  const feePayer = new ethers.Wallet(PRIVATE_KEY, provider);
  // Fee payer relays the user's signed tx
  const txResponse = await feePayer.sendKaiaFeeDelegatedTransaction(signedTx);
  return txResponse.hash;
}

// Example Express handler
// app.post('/relay', async (req, res) => {
//   const { signedTx } = req.body;
//   try {
//     const txHash = await relayFeeDelegatedTx(signedTx);
//     res.json({ txHash });
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// }); 