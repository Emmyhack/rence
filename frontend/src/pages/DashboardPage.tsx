import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  SparklesIcon,
  TrendingUpIcon,
  BanknotesIcon,
  UserGroupIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

import { useAppDispatch, useAppSelector } from '@hooks/redux';
import { 
  fetchUserGroups, 
  fetchPlatformStats,
  setCurrentGroup 
} from '@store/slices/groupsSlice';
import { fetchUserClaims } from '@store/slices/insuranceSlice';
import { fetchStakeInfo } from '@store/slices/stakingSlice';
import { hematService } from '@services/web3/hematService';
import LoadingSpinner from '@components/ui/LoadingSpinner';
import GroupCard from '@components/groups/GroupCard';
import DeFiCard from '@components/ui/DeFiCard';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isConnected, address, usdtBalance } = useAppSelector((state) => state.wallet);
  const { 
    userGroups, 
    createdGroups, 
    isLoading: groupsLoading, 
    platformStats 
  } = useAppSelector((state) => state.groups);
  const { userClaims, isLoading: claimsLoading } = useAppSelector((state) => state.insurance);
  const { stakeInfo, isLoading: stakingLoading } = useAppSelector((state) => state.staking);

  const [activeTab, setActiveTab] = useState<'overview' | 'groups' | 'defi' | 'staking' | 'insurance'>('overview');
  const [yieldInfo, setYieldInfo] = useState<any>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      navigate('/');
      return;
    }

    // Fetch all user data
    dispatch(fetchUserGroups(address));
    dispatch(fetchPlatformStats());
    dispatch(fetchUserClaims(address));
    dispatch(fetchStakeInfo(address));
    loadYieldInfo();
  }, [isConnected, address, navigate, dispatch]);

  const loadYieldInfo = async () => {
    try {
      const info = await hematService.getYieldInfo();
      setYieldInfo(info);
    } catch (error) {
      console.error('Error loading yield info:', error);
    }
  };

  const handleGroupClick = (group: any) => {
    dispatch(setCurrentGroup(group));
    navigate(`/groups/${group.id}`);
  };

  const handleGroupAction = async (action: string, group: any) => {
    try {
      switch (action) {
        case 'contribute':
          await hematService.contributeToGroup(group.address, group.contributionAmount);
          break;
        case 'pause':
          await hematService.pauseGroup(group.address);
          break;
        case 'resume':
          await hematService.resumeGroup(group.address);
          break;
        default:
          break;
      }
      // Refresh groups after action
      dispatch(fetchUserGroups(address!));
    } catch (error) {
      console.error('Error performing group action:', error);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'groups', name: 'My Groups', icon: UsersIcon },
    { id: 'defi', name: 'DeFi Strategy', icon: SparklesIcon },
    { id: 'staking', name: 'Staking', icon: ShieldCheckIcon },
    { id: 'insurance', name: 'Insurance', icon: ShieldCheckIcon },
  ];

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500" />
          <h2 className="mt-4 text-lg font-medium text-white">Wallet not connected</h2>
          <p className="mt-2 text-sm text-gray-400">Please connect your wallet to view your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Welcome back! Here's your financial overview.</p>
        </div>
        <button
          onClick={() => navigate('/create-group')}
          className="btn-primary flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Group
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="metric-card"
        >
          <div className="flex items-center">
            <div className="p-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl mr-3">
              <CurrencyDollarIcon className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="metric-label">USDT Balance</p>
              <p className="metric-value">
                ${hematService.formatUSDT(usdtBalance || '0')}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="metric-card"
        >
          <div className="flex items-center">
            <div className="p-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl mr-3">
              <UsersIcon className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="metric-label">Active Groups</p>
              <p className="metric-value">
                {userGroups?.length || 0}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="metric-card"
        >
          <div className="flex items-center">
            <div className="p-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl mr-3">
              <SparklesIcon className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <p className="metric-label">Total Yield</p>
              <p className="metric-value">
                ${yieldInfo ? hematService.formatUSDT(yieldInfo.totalYield) : '0.00'}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="metric-card"
        >
          <div className="flex items-center">
            <div className="p-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl mr-3">
              <ShieldCheckIcon className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <p className="metric-label">Insurance Claims</p>
              <p className="metric-value">
                {userClaims?.length || 0}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-800">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Recent Groups */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Recent Groups</h2>
                <button
                  onClick={() => setActiveTab('groups')}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                >
                  View All
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userGroups?.slice(0, 3).map((group: any, index: number) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onGroupClick={handleGroupClick}
                    onAction={handleGroupAction}
                  />
                ))}
                {(!userGroups || userGroups.length === 0) && (
                  <div className="col-span-full text-center py-12">
                    <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-400">No groups yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating your first group.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => navigate('/create-group')}
                        className="btn-primary"
                      >
                        Create Group
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* DeFi Overview */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">DeFi Strategy Overview</h2>
              <DeFiCard />
            </div>
          </motion.div>
        )}

        {activeTab === 'groups' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">My Groups</h2>
              <button
                onClick={() => navigate('/create-group')}
                className="btn-primary"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create New Group
              </button>
            </div>
            
            {groupsLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userGroups?.map((group: any) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onGroupClick={handleGroupClick}
                    onAction={handleGroupAction}
                  />
                ))}
                {(!userGroups || userGroups.length === 0) && (
                  <div className="col-span-full text-center py-12">
                    <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-400">No groups yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating your first group.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => navigate('/create-group')}
                        className="btn-primary"
                      >
                        Create Group
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'defi' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-semibold text-white mb-6">DeFi Strategy Management</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DeFiCard />
              
              {/* Yield Statistics */}
              <div className="card">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Yield Statistics</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
                      <span className="text-gray-400">Total Deposits</span>
                      <span className="text-white font-medium">
                        ${yieldInfo ? hematService.formatUSDT(yieldInfo.totalDeposits) : '0.00'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
                      <span className="text-gray-400">Total Yield Generated</span>
                      <span className="text-green-400 font-medium">
                        ${yieldInfo ? hematService.formatUSDT(yieldInfo.totalYield) : '0.00'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
                      <span className="text-gray-400">Last Harvest</span>
                      <span className="text-white font-medium">
                        {yieldInfo && parseInt(yieldInfo.lastHarvestAt) > 0
                          ? new Date(parseInt(yieldInfo.lastHarvestAt) * 1000).toLocaleDateString()
                          : 'Never'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'staking' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-semibold text-white mb-6">Staking Management</h2>
            {stakingLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Stake Information</h3>
                    {stakeInfo ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
                          <span className="text-gray-400">Total Staked</span>
                          <span className="text-white font-medium">
                            ${hematService.formatUSDT(stakeInfo.stakeAmount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
                          <span className="text-gray-400">Trust Score</span>
                          <span className="text-green-400 font-medium">
                            {stakeInfo.trustScore}/1000
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
                          <span className="text-gray-400">Default Count</span>
                          <span className="text-white font-medium">
                            {stakeInfo.defaultCount}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-400">No staking information available</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'insurance' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-semibold text-white mb-6">Insurance Claims</h2>
            {claimsLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="card">
                <div className="p-6">
                  {userClaims && userClaims.length > 0 ? (
                    <div className="space-y-4">
                      {userClaims.map((claim: any) => (
                        <div key={claim.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
                          <div>
                            <p className="text-white font-medium">Claim #{claim.id}</p>
                            <p className="text-gray-400 text-sm">
                              Amount: ${hematService.formatUSDT(claim.amount)}
                            </p>
                          </div>
                          <span className={`status-badge ${
                            claim.status === 0 ? 'status-created' :
                            claim.status === 1 ? 'status-active' :
                            claim.status === 2 ? 'status-completed' :
                            'status-cancelled'
                          }`}>
                            {hematService.getClaimStatusName(claim.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-400">No insurance claims</h3>
                      <p className="mt-1 text-sm text-gray-500">You haven't submitted any insurance claims yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;