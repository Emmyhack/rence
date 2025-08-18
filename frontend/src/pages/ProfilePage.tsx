import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  UserIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';

import { useAppDispatch, useAppSelector } from '@hooks/redux';
import { depositStake, withdrawStake, fetchStakeInfo } from '@store/slices/stakingSlice';
import { fetchUserGroups } from '@store/slices/groupsSlice';
import { hematService } from '@services/web3/hematService';
import LoadingSpinner from '@components/ui/LoadingSpinner';

// Validation schema for staking
const stakeSchema = yup.object({
  amount: yup
    .string()
    .required('Amount is required')
    .test('positive-amount', 'Amount must be greater than 0', (value) => {
      const num = parseFloat(value);
      return !isNaN(num) && num > 0;
    }),
});

interface StakeFormData {
  amount: string;
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isConnected, address, usdtBalance, networkInfo, tokenInfo } = useAppSelector((state) => state.wallet);
  const { userGroups, createdGroups } = useAppSelector((state) => state.groups);
  const { stakeInfo, isLoading: stakingLoading } = useAppSelector((state) => state.staking);

  const [activeTab, setActiveTab] = useState<'profile' | 'staking' | 'groups' | 'transactions'>('profile');
  const [showStakeForm, setShowStakeForm] = useState<'deposit' | 'withdraw' | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<StakeFormData>({
    resolver: yupResolver(stakeSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (!isConnected || !address) {
      navigate('/');
      return;
    }

    // Fetch user data
    dispatch(fetchUserGroups(address));
    dispatch(fetchStakeInfo(address));
  }, [isConnected, address, navigate, dispatch]);

  const handleStakeSubmit = async (data: StakeFormData) => {
    try {
      if (showStakeForm === 'deposit') {
        await dispatch(depositStake(data.amount)).unwrap();
      } else if (showStakeForm === 'withdraw') {
        await dispatch(withdrawStake(data.amount)).unwrap();
      }
      
      reset();
      setShowStakeForm(null);
    } catch (error) {
      console.error('Failed to process stake:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: string) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleDateString();
  };

  const getThriftModelName = (model: number) => {
    const models = ['Rotational Savings', 'Fixed Savings Pool', 'Emergency Liquidity'];
    return models[model] || 'Unknown';
  };

  const getGroupStatusName = (status: number) => {
    const statuses = ['Created', 'Active', 'Completed', 'Paused', 'Cancelled'];
    return statuses[status] || 'Unknown';
  };

  const getGroupStatusColor = (status: number) => {
    const colors = {
      0: 'bg-blue-100 text-blue-800', // Created
      1: 'bg-green-100 text-green-800', // Active
      2: 'bg-gray-100 text-gray-800', // Completed
      3: 'bg-yellow-100 text-yellow-800', // Paused
      4: 'bg-red-100 text-red-800', // Cancelled
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500" />
          <h2 className="mt-4 text-lg font-medium text-white">Wallet not connected</h2>
          <p className="mt-2 text-sm text-gray-400">Please connect your wallet to view your profile.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'staking', name: 'Staking', icon: ShieldCheckIcon },
    { id: 'groups', name: 'My Groups', icon: UserIcon },
    { id: 'transactions', name: 'Transactions', icon: ClockIcon },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Profile</h1>
          <p className="mt-2 text-gray-300">
            Manage your account, view your activity, and control your stakes.
          </p>
        </div>

        {/* Profile Overview */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-600/30 to-purple-600/30 border border-gray-700">
              <UserIcon className="h-10 w-10 text-blue-300" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">Wallet Address</h2>
              <p className="text-lg text-gray-300 font-mono">{formatAddress(address!)}</p>
              <div className="mt-2 flex items-center space-x-4">
                <span className="text-sm text-gray-400">
                  {tokenInfo?.name || 'USDT'} Balance: {parseFloat(usdtBalance).toFixed(2)}
                  {networkInfo && (
                    <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                      networkInfo.isMainnet ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {networkInfo.isMainnet ? 'Mainnet' : 'Testnet'}
                    </span>
                  )}
                </span>
                <span className="text-sm text-gray-400">Trust Score: {stakeInfo?.trustScore || '0'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="glass-card mb-8">
          <div className="border-b border-gray-800">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Account Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300">Wallet Address</label>
                        <p className="mt-1 text-sm text-gray-200 font-mono">{address}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300">Network</label>
                        <p className="mt-1 text-sm text-gray-200 flex items-center">
                          {networkInfo?.name || 'Unknown Network'}
                          {networkInfo && (
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                              networkInfo.isMainnet ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {networkInfo.isMainnet ? 'Mainnet' : 'Testnet'}
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300">Connected Since</label>
                        <p className="mt-1 text-sm text-gray-200">{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300">
                          {tokenInfo?.name || 'USDT'} Balance
                          {tokenInfo && (
                            <span className="ml-1 text-xs text-gray-500">
                              ({tokenInfo.isTestnet ? 'Mock' : 'Real'})
                            </span>
                          )}
                        </label>
                        <p className="mt-1 text-2xl font-semibold text-white">
                          {parseFloat(usdtBalance).toFixed(2)} {tokenInfo?.symbol || 'USDT'}
                        </p>
                        {tokenInfo && (
                          <p className="text-xs text-gray-400 mt-1">
                            Contract: {tokenInfo.address.slice(0, 8)}...{tokenInfo.address.slice(-6)}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300">Total Staked</label>
                        <p className="mt-1 text-2xl font-semibold text-white">
                          {stakeInfo ? parseFloat(stakeInfo.stakeAmount).toFixed(2) : '0.00'} USDT
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300">Trust Score</label>
                        <p className="mt-1 text-2xl font-semibold text-white">{stakeInfo?.trustScore || '0'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setActiveTab('staking')}
                      className="rounded-lg p-4 text-center transition-all bg-gradient-to-br from-blue-600/10 to-indigo-600/10 hover:from-blue-600/20 hover:to-indigo-600/20 border border-blue-700/30"
                    >
                      <ShieldCheckIcon className="mx-auto h-8 w-8 text-blue-400 mb-3" />
                      <h4 className="font-medium text-white">Manage Stakes</h4>
                      <p className="text-sm text-gray-400 mt-1">Deposit or withdraw stakes</p>
                    </button>

                    <button
                      onClick={() => navigate('/create-group')}
                      className="rounded-lg p-4 text-center transition-all bg-gradient-to-br from-green-600/10 to-emerald-600/10 hover:from-green-600/20 hover:to-emerald-600/20 border border-green-700/30"
                    >
                      <PlusIcon className="mx-auto h-8 w-8 text-green-400 mb-3" />
                      <h4 className="font-medium text-white">Create Group</h4>
                      <p className="text-sm text-gray-400 mt-1">Start a new thrift group</p>
                    </button>

                    <button
                      onClick={() => setActiveTab('groups')}
                      className="rounded-lg p-4 text-center transition-all bg-gradient-to-br from-purple-600/10 to-pink-600/10 hover:from-purple-600/20 hover:to-pink-600/20 border border-purple-700/30"
                    >
                      <UserIcon className="mx-auto h-8 w-8 text-purple-400 mb-3" />
                      <h4 className="font-medium text-white">View Groups</h4>
                      <p className="text-sm text-gray-400 mt-1">See all your groups</p>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Staking Tab */}
            {activeTab === 'staking' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">Staking Management</h3>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowStakeForm('deposit')}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Deposit Stake
                    </button>
                    <button
                      onClick={() => setShowStakeForm('withdraw')}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700"
                    >
                      <MinusIcon className="h-4 w-4 mr-2" />
                      Withdraw Stake
                    </button>
                  </div>
                </div>

                {stakingLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : stakeInfo ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card p-6">
                      <h4 className="font-medium text-white mb-4">Current Stakes</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Staked:</span>
                          <span className="font-medium text-white">{parseFloat(stakeInfo.stakeAmount).toFixed(2)} USDT</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Trust Score:</span>
                          <span className="font-medium text-white">{stakeInfo.trustScore}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Platform Total:</span>
                          <span className="font-medium text-white">{parseFloat(stakeInfo.totalStakes).toFixed(2)} USDT</span>
                        </div>
                      </div>
                    </div>

                    <div className="glass-card p-6">
                      <h4 className="font-medium text-white mb-4">Stake History</h4>
                      {stakeInfo.stakeHistory.length > 0 ? (
                        <div className="space-y-2">
                          {stakeInfo.stakeHistory.slice(-5).map((stake, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-gray-400">Stake {index + 1}:</span>
                              <span className="font-medium text-white">{parseFloat(stake).toFixed(2)} USDT</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm">No stake history yet</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-white">No staking information</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Start staking to build your trust score and access more features.
                    </p>
                  </div>
                )}

                {/* Stake Form */}
                {showStakeForm && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6"
                  >
                    <h4 className="font-medium text-white mb-4">
                      {showStakeForm === 'deposit' ? 'Deposit Stake' : 'Withdraw Stake'}
                    </h4>
                    <form onSubmit={handleSubmit(handleStakeSubmit)} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Amount (USDT)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('amount')}
                          className="w-full rounded-md bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                        {errors.amount && (
                          <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                        )}
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowStakeForm(null);
                            reset();
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-200 bg-gray-900 border border-gray-700 rounded-md hover:bg-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!isValid}
                          className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-md hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                        >
                          {showStakeForm === 'deposit' ? 'Deposit' : 'Withdraw'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Groups Tab */}
            {activeTab === 'groups' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">My Groups</h3>
                  <button
                    onClick={() => navigate('/create-group')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Group
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Created Groups */}
                  {createdGroups.length > 0 && (
                    <div>
                      <h4 className="text-md font-medium text-gray-300 mb-3">Groups I Created</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {createdGroups.map((group) => (
                          <div
                            key={group.address}
                            className="glass-card p-4 border-l-4 border-indigo-500/50"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-white">Group #{group.id}</h5>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGroupStatusColor(group.status)}`}>
                                {getGroupStatusName(group.status)}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-300">
                              <p>Model: {getThriftModelName(group.model)}</p>
                              <p>Contribution: {parseFloat(group.contributionAmount).toFixed(2)} USDT</p>
                              <p>Members: {group.members.length}/{group.groupSize}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Member Groups */}
                  {userGroups.length > 0 && (
                    <div>
                      <h4 className="text-md font-medium text-gray-300 mb-3">Groups I'm In</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {userGroups.map((group) => (
                          <div
                            key={group.address}
                            className="glass-card p-4 border-l-4 border-green-500/50"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-white">Group #{group.id}</h5>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGroupStatusColor(group.status)}`}>
                                {getGroupStatusName(group.status)}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-300">
                              <p>Model: {getThriftModelName(group.model)}</p>
                              <p>Contribution: {parseFloat(group.contributionAmount).toFixed(2)} USDT</p>
                              <p>Members: {group.members.length}/{group.groupSize}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {createdGroups.length === 0 && userGroups.length === 0 && (
                    <div className="text-center py-8">
                      <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-white">No groups yet</h3>
                      <p className="mt-1 text-sm text-gray-400">
                        Get started by creating your first thrift group.
                      </p>
                      <div className="mt-6">
                        <button
                          onClick={() => navigate('/create-group')}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Create Group
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-medium text-white">Transaction History</h3>
                
                <div className="text-center py-8">
                  <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-white">Transaction history coming soon</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    We're working on bringing you detailed transaction history.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;