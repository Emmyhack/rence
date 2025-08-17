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
import ActivityFeed from '@components/ui/ActivityFeed';
import { getUserOnchainActivities, ActivityItem } from '@services/web3/activityService';

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
  const [activities, setActivities] = useState<ActivityItem[]>([]);

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

  useEffect(() => {
    const loadActivities = async () => {
      try {
        if (!address) return;
        const groups = [...(createdGroups || []), ...(userGroups || [])]
          .map(g => ({ id: g.id, address: g.address }));
        if (groups.length === 0) { setActivities([]); return; }
        const result = await getUserOnchainActivities(address, groups);
        setActivities(result.slice(0, 20));
      } catch (e) {
        console.error('Error loading on-chain activities:', e);
      }
    };
    loadActivities();
  }, [address, createdGroups, userGroups]);

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
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-card p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-kaia-text-primary to-kaia-primary bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-kaia-text-secondary mt-2 text-lg">
              Welcome back! Here's your financial overview.
            </p>
          </div>
          <button
            onClick={() => navigate('/create-group')}
            className="btn-kaia-primary flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Group
          </button>
        </div>
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
            <div className="p-3 bg-gradient-to-r from-kaia-primary/20 to-kaia-primary/10 rounded-kaia-lg mr-4 border border-kaia-primary/30">
              <CurrencyDollarIcon className="h-6 w-6 text-kaia-primary" />
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
            <div className="p-3 bg-gradient-to-r from-kaia-primary/20 to-kaia-primary/10 rounded-kaia-lg mr-4 border border-kaia-primary/30">
              <UsersIcon className="h-6 w-6 text-kaia-primary" />
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
            <div className="p-3 bg-gradient-to-r from-kaia-primary/20 to-kaia-primary/10 rounded-kaia-lg mr-4 border border-kaia-primary/30">
              <SparklesIcon className="h-6 w-6 text-kaia-primary" />
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
            <div className="p-3 bg-gradient-to-r from-kaia-primary/20 to-kaia-primary/10 rounded-kaia-lg mr-4 border border-kaia-primary/30">
              <ShieldCheckIcon className="h-6 w-6 text-kaia-primary" />
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
      <div className="glass-card p-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'border-kaia-primary text-kaia-primary'
                    : 'border-transparent text-kaia-text-muted hover:text-kaia-text-secondary hover:border-kaia-border'
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
            className="space-y-8"
          >
            {/* Recent Groups */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-kaia-text-primary">Recent Groups</h2>
                <button
                  onClick={() => setActiveTab('groups')}
                  className="text-kaia-primary hover:text-kaia-primaryLight text-sm font-medium transition-colors duration-300"
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
                    <UsersIcon className="mx-auto h-12 w-12 text-kaia-text-muted" />
                    <h3 className="mt-2 text-sm font-medium text-kaia-text-muted">No groups yet</h3>
                    <p className="mt-1 text-sm text-kaia-text-muted">Get started by creating your first group.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => navigate('/create-group')}
                        className="btn-kaia-primary"
                      >
                        Create Group
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* On-chain Activity */}
            <ActivityFeed items={activities} />

            {/* DeFi Overview */}
            <div className="glass-card p-6">
              <h2 className="text-2xl font-semibold text-kaia-text-primary mb-6">DeFi Strategy Overview</h2>
              <DeFiCard />
            </div>
          </motion.div>
        )}

        {activeTab === 'groups' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-kaia-text-primary">My Groups</h2>
              <button
                onClick={() => navigate('/create-group')}
                className="btn-kaia-primary"
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
                    <UsersIcon className="mx-auto h-12 w-12 text-kaia-text-muted" />
                    <h3 className="mt-2 text-sm font-medium text-kaia-text-muted">No groups yet</h3>
                    <p className="mt-1 text-sm text-kaia-text-muted">Get started by creating your first group.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => navigate('/create-group')}
                        className="btn-kaia-primary"
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
            className="space-y-6"
          >
            <h2 className="text-2xl font-semibold text-kaia-text-primary mb-6">DeFi Strategy Management</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DeFiCard />
              
              {/* Yield Statistics */}
              <div className="glass-card p-6">
                <h3 className="text-xl font-semibold text-kaia-text-primary mb-6">Yield Statistics</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-kaia-surface/50 rounded-kaia-lg border border-kaia-border/50">
                    <span className="text-kaia-text-muted">Total Deposits</span>
                    <span className="text-kaia-text-primary font-medium">
                      ${yieldInfo ? hematService.formatUSDT(yieldInfo.totalDeposits) : '0.00'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-kaia-surface/50 rounded-kaia-lg border border-kaia-border/50">
                    <span className="text-kaia-text-muted">Total Yield Generated</span>
                    <span className="text-kaia-primary font-medium">
                      ${yieldInfo ? hematService.formatUSDT(yieldInfo.totalYield) : '0.00'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-kaia-surface/50 rounded-kaia-lg border border-kaia-border/50">
                    <span className="text-kaia-text-muted">Last Harvest</span>
                    <span className="text-kaia-text-primary font-medium">
                      {yieldInfo && parseInt(yieldInfo.lastHarvestAt) > 0
                        ? new Date(parseInt(yieldInfo.lastHarvestAt) * 1000).toLocaleDateString()
                        : 'Never'
                      }
                    </span>
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
            className="space-y-6"
          >
            <h2 className="text-2xl font-semibold text-kaia-text-primary mb-6">Staking Management</h2>
            {stakingLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                  <h3 className="text-xl font-semibold text-kaia-text-primary mb-6">Stake Information</h3>
                  {stakeInfo ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-kaia-surface/50 rounded-kaia-lg border border-kaia-border/50">
                        <span className="text-kaia-text-muted">Total Staked</span>
                        <span className="text-kaia-text-primary font-medium">
                          ${hematService.formatUSDT(stakeInfo.stakeAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-kaia-surface/50 rounded-kaia-lg border border-kaia-border/50">
                        <span className="text-kaia-text-muted">Trust Score</span>
                        <span className="text-kaia-primary font-medium">
                          {stakeInfo.trustScore}/1000
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-kaia-surface/50 rounded-kaia-lg border border-kaia-border/50">
                        <span className="text-kaia-text-muted">Default Count</span>
                        <span className="text-kaia-text-primary font-medium">
                          {stakeInfo.defaultCount}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-kaia-text-muted">No staking information available</p>
                  )}
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
            className="space-y-6"
          >
            <h2 className="text-2xl font-semibold text-kaia-text-primary mb-6">Insurance Claims</h2>
            {claimsLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="glass-card p-6">
                {userClaims && userClaims.length > 0 ? (
                  <div className="space-y-4">
                    {userClaims.map((claim: any) => (
                      <div key={claim.id} className="flex items-center justify-between p-4 bg-kaia-surface/50 rounded-kaia-lg border border-kaia-border/50">
                        <div>
                          <p className="text-kaia-text-primary font-medium">Claim #{claim.id}</p>
                          <p className="text-kaia-text-muted text-sm">
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
                    <ShieldCheckIcon className="mx-auto h-12 w-12 text-kaia-text-muted" />
                    <h3 className="mt-2 text-sm font-medium text-kaia-text-muted">No insurance claims</h3>
                    <p className="mt-1 text-sm text-kaia-text-muted">You haven't submitted any insurance claims yet.</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;