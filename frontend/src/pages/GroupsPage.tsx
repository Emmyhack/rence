import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  UsersIcon,
  ClockIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import { useAppDispatch, useAppSelector } from '@hooks/redux';
import { fetchGroupsByModel, fetchPlatformStats, setCurrentGroup } from '@store/slices/groupsSlice';
import { GroupInfo } from '@services/web3/hematService';
import LoadingSpinner from '@components/ui/LoadingSpinner';
import GroupCard from '@components/groups/GroupCard';

const GroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { groups, isLoading, platformStats } = useAppSelector((state) => state.groups);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModel, setSelectedModel] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'members' | 'contribution'>('newest');

  useEffect(() => {
    // Fetch platform stats and all groups
    dispatch(fetchPlatformStats());
    dispatch(fetchGroupsByModel(0)); // Fetch all models
  }, [dispatch]);

  const handleGroupClick = (group: GroupInfo) => {
    dispatch(setCurrentGroup(group));
    navigate(`/groups/${group.id}`);
  };

  const getThriftModelName = (model: number) => {
    const models = ['Rotational Savings', 'Fixed Savings Pool', 'Emergency Liquidity'];
    return models[model] || 'Unknown';
  };

  const getGroupStatusName = (status: number) => {
    const statuses = ['Created', 'Active', 'Completed', 'Paused', 'Cancelled'];
    return statuses[status] || 'Unknown';
  };

  const getModelIcon = (model: number) => {
    const icons = [UsersIcon, ClockIcon, ShieldCheckIcon];
    return icons[model] || UsersIcon;
  };

  const getModelColor = (model: number) => {
    const colors = ['text-blue-600', 'text-green-600', 'text-purple-600'];
    return colors[model] || 'text-gray-600';
  };

  // Filter and sort groups
  const filteredAndSortedGroups = groups
    .filter((group) => {
      // Search filter
      if (searchTerm && !group.address.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Model filter
      if (selectedModel !== null && group.model !== selectedModel) {
        return false;
      }
      
      // Status filter
      if (selectedStatus !== null && group.status !== selectedStatus) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return parseInt(b.cycleStartTime) - parseInt(a.cycleStartTime);
        case 'oldest':
          return parseInt(a.cycleStartTime) - parseInt(b.cycleStartTime);
        case 'members':
          return b.members.length - a.members.length;
        case 'contribution':
          return parseFloat(b.contributionAmount) - parseFloat(a.contributionAmount);
        default:
          return 0;
      }
    });

  const modelOptions = [
    { value: null, label: 'All Models', icon: UsersIcon },
    { value: 0, label: 'Rotational Savings', icon: UsersIcon },
    { value: 1, label: 'Fixed Savings Pool', icon: ClockIcon },
    { value: 2, label: 'Emergency Liquidity', icon: ShieldCheckIcon },
  ];

  const statusOptions = [
    { value: null, label: 'All Statuses' },
    { value: 0, label: 'Created' },
    { value: 1, label: 'Active' },
    { value: 2, label: 'Completed' },
    { value: 3, label: 'Paused' },
    { value: 4, label: 'Cancelled' },
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'members', label: 'Most Members' },
    { value: 'contribution', label: 'Highest Contribution' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Thrift Groups</h1>
              <p className="mt-2 text-gray-600">
                Discover and join thrift groups that match your savings goals.
              </p>
            </div>
            <button
              onClick={() => navigate('/create-group')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Group
            </button>
          </div>
        </div>

        {/* Platform Stats */}
        {platformStats && (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-500">Total Groups</p>
                <p className="text-2xl font-semibold text-gray-900">{platformStats.totalGroups}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Active Groups</p>
                <p className="text-2xl font-semibold text-green-600">{platformStats.totalActive}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Min Contribution</p>
                <p className="text-lg font-semibold text-gray-900">{platformStats.minContribution} USDT</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Max Contribution</p>
                <p className="text-lg font-semibold text-gray-900">{platformStats.maxContribution} USDT</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filters & Search</h3>
            
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search groups by address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Model Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thrift Model
                </label>
                <select
                  value={selectedModel || ''}
                  onChange={(e) => setSelectedModel(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {modelOptions.map((option) => (
                    <option key={option.value} value={option.value || ''}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Status
                </label>
                <select
                  value={selectedStatus || ''}
                  onChange={(e) => setSelectedStatus(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value || ''}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {filteredAndSortedGroups.length} of {groups.length} groups
              </p>
              <div className="flex items-center space-x-2">
                <FunnelIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">Filters applied</span>
              </div>
            </div>
          </div>
        </div>

        {/* Groups Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredAndSortedGroups.length === 0 ? (
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No groups found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedModel !== null || selectedStatus !== null
                ? 'Try adjusting your filters or search terms.'
                : 'No thrift groups have been created yet.'}
            </p>
            {!searchTerm && selectedModel === null && selectedStatus === null && (
              <div className="mt-6">
                <button
                  onClick={() => navigate('/create-group')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create First Group
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedGroups.map((group) => (
              <motion.div
                key={group.address}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <GroupCard
                  group={group}
                  onClick={() => handleGroupClick(group)}
                  isCreator={false}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Load More (if needed) */}
        {filteredAndSortedGroups.length > 0 && filteredAndSortedGroups.length < groups.length && (
          <div className="mt-8 text-center">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Load More Groups
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupsPage;