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

  const [activeTab, setActiveTab] = useState<'overview' | 'groups' | 'staking' | 'insurance'>('overview');

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
  }, [isConnected, address, navigate, dispatch]);

  const handleGroupClick = (group: any) => {
    dispatch(setCurrentGroup(group));
    navigate(`/groups/${group.id}`);
  };

  const getThriftModelName = (model: number) => {
    const models = ['Rotational Savings', 'Fixed Savings Pool', 'Emergency Liquidity'];
    return models[model] || 'Unknown';
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

  const getGroupStatusName = (status: number) => {
    const statuses = ['Created', 'Active', 'Completed', 'Paused', 'Cancelled'];
    return statuses[status] || 'Unknown';
  };

  const formatTime = (seconds: string) => {
    const secs = parseInt(seconds);
    if (secs === 0) return 'No lock';
    if (secs < 86400) return `${secs / 3600} hours`;
    if (secs < 2592000) return `${secs / 86400} days`;
    return `${secs / 2592000} months`;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">Wallet not connected</h2>
          <p className="mt-2 text-sm text-gray-500">Please connect your wallet to view your dashboard.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'groups', name: 'My Groups', icon: UsersIcon },
    { id: 'staking', name: 'Staking', icon: ShieldCheckIcon },
    { id: 'insurance', name: 'Insurance', icon: ShieldCheckIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back! Here's an overview of your thrift groups and platform activity.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">USDT Balance</p>
                <p className="text-2xl font-semibold text-gray-900">{parseFloat(usdtBalance).toFixed(2)}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Groups</p>
                <p className="text-2xl font-semibold text-gray-900">{userGroups.length + createdGroups.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShieldCheckIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Claims</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {userClaims.filter(claim => claim.status === 0 || claim.status === 1).length}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Staked</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stakeInfo ? parseFloat(stakeInfo.stakeAmount).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Recent Groups */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Recent Groups</h3>
                    <button
                      onClick={() => navigate('/create-group')}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create Group
                    </button>
                  </div>
                  
                  {groupsLoading ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : userGroups.length === 0 && createdGroups.length === 0 ? (
                    <div className="text-center py-8">
                      <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No groups yet</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by creating your first thrift group.
                      </p>
                      <div className="mt-6">
                        <button
                          onClick={() => navigate('/create-group')}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Create Group
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[...userGroups, ...createdGroups]
                        .slice(0, 6)
                        .map((group) => (
                          <div
                            key={group.address}
                            className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleGroupClick(group)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGroupStatusColor(group.status)}`}>
                                {getGroupStatusName(group.status)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {getThriftModelName(group.model)}
                              </span>
                            </div>
                            <h4 className="font-medium text-gray-900 mb-2">
                              Group #{group.id}
                            </h4>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p>Contribution: {parseFloat(group.contributionAmount).toFixed(2)} USDT</p>
                              <p>Members: {group.members.length}/{group.groupSize}</p>
                              <p>Cycle: {group.currentCycle}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <button
                    onClick={() => navigate('/create-group')}
                    className="bg-indigo-50 hover:bg-indigo-100 rounded-lg p-6 text-center transition-colors"
                  >
                    <PlusIcon className="mx-auto h-8 w-8 text-indigo-600 mb-3" />
                    <h4 className="font-medium text-indigo-900">Create New Group</h4>
                    <p className="text-sm text-indigo-600 mt-1">Start a new thrift group</p>
                  </button>

                  <button
                    onClick={() => setActiveTab('staking')}
                    className="bg-green-50 hover:bg-green-100 rounded-lg p-6 text-center transition-colors"
                  >
                    <ShieldCheckIcon className="mx-auto h-8 w-8 text-green-600 mb-3" />
                    <h4 className="font-medium text-green-900">Manage Stakes</h4>
                    <p className="text-sm text-green-600 mt-1">View and manage your stakes</p>
                  </button>

                  <button
                    onClick={() => setActiveTab('insurance')}
                    className="bg-purple-50 hover:bg-purple-100 rounded-lg p-6 text-center transition-colors"
                  >
                    <ShieldCheckIcon className="mx-auto h-8 w-8 text-purple-600 mb-3" />
                    <h4 className="font-medium text-purple-900">Insurance Claims</h4>
                    <p className="text-sm text-purple-600 mt-1">View your insurance status</p>
                  </button>
                </div>
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
                  <h3 className="text-lg font-medium text-gray-900">My Groups</h3>
                  <button
                    onClick={() => navigate('/create-group')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Group
                  </button>
                </div>

                {groupsLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Created Groups */}
                    {createdGroups.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-gray-700 mb-3">Groups I Created</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {createdGroups.map((group) => (
                            <GroupCard
                              key={group.address}
                              group={group}
                              onClick={() => handleGroupClick(group)}
                              isCreator={true}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Member Groups */}
                    {userGroups.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-gray-700 mb-3">Groups I'm In</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {userGroups.map((group) => (
                            <GroupCard
                              key={group.address}
                              group={group}
                              onClick={() => handleGroupClick(group)}
                              isCreator={false}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {createdGroups.length === 0 && userGroups.length === 0 && (
                      <div className="text-center py-8">
                        <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No groups yet</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Get started by creating your first thrift group.
                        </p>
                        <div className="mt-6">
                          <button
                            onClick={() => navigate('/create-group')}
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                          >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Create Group
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Staking Tab */}
            {activeTab === 'staking' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-medium text-gray-900">Staking Information</h3>
                
                {stakingLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : stakeInfo ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-medium text-gray-900 mb-4">Current Stakes</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Staked:</span>
                          <span className="font-medium">{parseFloat(stakeInfo.stakeAmount).toFixed(2)} USDT</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Trust Score:</span>
                          <span className="font-medium">{stakeInfo.trustScore}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Platform Total:</span>
                          <span className="font-medium">{parseFloat(stakeInfo.totalStakes).toFixed(2)} USDT</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-medium text-gray-900 mb-4">Stake History</h4>
                      {stakeInfo.stakeHistory.length > 0 ? (
                        <div className="space-y-2">
                          {stakeInfo.stakeHistory.slice(-5).map((stake, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-gray-600">Stake {index + 1}:</span>
                              <span className="font-medium">{parseFloat(stake).toFixed(2)} USDT</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No stake history yet</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No staking information</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Start staking to build your trust score and access more features.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Insurance Tab */}
            {activeTab === 'insurance' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-medium text-gray-900">Insurance Claims</h3>
                
                {claimsLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : userClaims.length > 0 ? (
                  <div className="space-y-4">
                    {userClaims.map((claim) => (
                      <div
                        key={claim.id}
                        className="bg-gray-50 rounded-lg p-4 border-l-4 border-indigo-500"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">Claim #{claim.id}</h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            claim.status === 0 ? 'bg-yellow-100 text-yellow-800' :
                            claim.status === 1 ? 'bg-blue-100 text-blue-800' :
                            claim.status === 2 ? 'bg-red-100 text-red-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {claim.status === 0 ? 'Submitted' :
                             claim.status === 1 ? 'Approved' :
                             claim.status === 2 ? 'Rejected' : 'Paid'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Amount:</span>
                            <span className="ml-2 font-medium">{parseFloat(claim.amount).toFixed(2)} USDT</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Group ID:</span>
                            <span className="ml-2 font-medium">{claim.groupId}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Submitted:</span>
                            <span className="ml-2 font-medium">
                              {new Date(parseInt(claim.submittedAt) * 1000).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No insurance claims</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      You haven't submitted any insurance claims yet.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;