import React from 'react';
import { Link } from 'react-router-dom';
import { CONTRACT_ADDRESSES } from '@services/web3/contracts';

const HelpPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">How Hemat Works</h1>
          <p className="mt-2 text-gray-300">Quick guide to groups, staking, insurance, and USDT usage on Kaia.</p>
        </div>

        <div className="space-y-8">
          <section className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Prerequisites</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              <li>Connect a wallet (Kaikas or any EVM wallet) to Kaia Kairos Testnet (Chain ID 1001).</li>
              <li>Hold test KAIA for gas and test USDT for contributions/stakes.</li>
              <li>
                USDT contract (Kairos):
                <a className="ml-2 text-emerald-400 underline" href={`https://baobab.scope.klaytn.com/account/${CONTRACT_ADDRESSES.USDT}`} target="_blank" rel="noreferrer">
                  {CONTRACT_ADDRESSES.USDT}
                </a>
              </li>
            </ul>
          </section>

          <section className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Creating a Group</h2>
            <ol className="list-decimal list-inside text-gray-300 space-y-2">
              <li>Go to <Link to="/create-group" className="text-emerald-400 underline">Create Group</Link>.</li>
              <li>Choose a model: Basic (free), Trust (10 USDT), Super-Trust (25 USDT).</li>
              <li>Set contribution, interval, size, and optional insurance/fees.</li>
              <li>Confirm the transaction; on success you’ll be redirected to the group.</li>
            </ol>
          </section>

          <section className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Joining and Contributing</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              <li>Open a group and click Join; approve USDT for stake if required.</li>
              <li>Contribute each cycle; missed payments may reduce trust score.</li>
            </ul>
          </section>

          <section className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Insurance</h2>
            <p className="text-gray-300">If enabled, a portion of contributions fund an insurance pool. Members can submit claims for emergencies.</p>
          </section>

          <section className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Profile & Staking</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              <li>View wallet, USDT balance, trust score, and groups on the Profile page.</li>
              <li>Deposit or withdraw stake; higher trust helps with advanced groups.</li>
            </ul>
          </section>

          <section className="glass-card p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Troubleshooting</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              <li>Ensure you’re on Kaia Kairos (1001) and have gas (KAIA) and USDT.</li>
              <li>If group creation fails, check subscription cost and try again.</li>
              <li>Use the USDT link above to verify token address.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;

