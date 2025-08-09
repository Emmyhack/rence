import express from "express";
import bodyParser from "body-parser";
import { relayFeeDelegatedTx } from "./kaiaFeeDelegation";

const app = express();
app.use(bodyParser.json());

app.post("/relay", async (req, res) => {
  const { signedTx } = req.body;
  if (!signedTx) return res.status(400).json({ error: "Missing signedTx" });
  try {
    const txHash = await relayFeeDelegatedTx(signedTx);
    res.json({ txHash });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Relay backend listening on port ${PORT}`);
}); 