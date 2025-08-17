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
    <div className="min-h-screen">
      <div className="container-kaia py-8">
        {/* Header */}
        <div className="mb-12">
          <div className="glass-card p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-kaia-text-primary to-kaia-primary bg-clip-text text-transparent">
                  Thrift Groups
                </h1>
                <p className="mt-3 text-kaia-text-secondary text-lg">
                  Discover and join thrift groups that match your savings goals.
                </p>
              </div>
              <button
                onClick={() => navigate('/create-group')}
                className="btn-kaia-primary"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Group
              </button>
            </div>
          </div>
        </div>

        {/* Platform Stats */}
        {platformStats && (
          <div className="mb-12 glass-card p-8">
            <h3 className="text-2xl font-semibold text-kaia-text-primary mb-6">Platform Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-sm text-kaia-text-muted mb-2">Total Groups</p>
                <p className="text-3xl font-bold text-kaia-text-primary">{platformStats.totalGroups}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-kaia-text-muted mb-2">Active Groups</p>
                <p className="text-3xl font-bold text-kaia-primary">{platformStats.totalActive}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-kaia-text-muted mb-2">Min Contribution</p>
                <p className="text-2xl font-semibold text-kaia-text-primary">{platformStats.minContribution} USDT</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-kaia-text-muted mb-2">Max Contribution</p>
                <p className="text-2xl font-semibold text-kaia-text-primary">{platformStats.maxContribution} USDT</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="glass-card mb-12">
          <div className="p-8 border-b border-kaia-border/50">
            <h3 className="text-2xl font-semibold text-kaia-text-primary mb-6">Filters & Search</h3>
            
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-kaia-text-muted" />
                <input
                  type="text"
                  placeholder="Search groups by address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 w-full rounded-kaia-lg bg-kaia-surface/50 border border-kaia-border text-kaia-text-primary placeholder-kaia-text-muted focus:border-kaia-primary focus:ring-kaia-primary/20 focus:ring-2 transition-all duration-300"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Model Filter */}
              <div>
                <label className="block text-sm font-medium text-kaia-text-secondary mb-3">
                  Thrift Model
                </label>
                <select
                  value={selectedModel || ''}
                  onChange={(e) => setSelectedModel(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full rounded-kaia-lg bg-kaia-surface/50 border border-kaia-border text-kaia-text-primary focus:border-kaia-primary focus:ring-kaia-primary/20 focus:ring-2 transition-all duration-300"
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
                <label className="block text-sm font-medium text-kaia-text-secondary mb-3">
                  Group Status
                </label>
                <select
                  value={selectedStatus || ''}
                  onChange={(e) => setSelectedStatus(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full rounded-kaia-lg bg-kaia-surface/50 border border-kaia-border text-kaia-text-primary focus:border-kaia-primary focus:ring-kaia-primary/20 focus:ring-2 transition-all duration-300"
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
                <label className="block text-sm font-medium text-kaia-text-secondary mb-3">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full rounded-kaia-lg bg-kaia-surface/50 border border-kaia-border text-kaia-text-primary focus:border-kaia-primary focus:ring-kaia-primary/20 focus:ring-2 transition-all duration-300"
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
          <div className="px-8 py-6 bg-kaia-surface/30 border-t border-kaia-border/50 rounded-b-kaia-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm text-kaia-text-muted">
                Showing {filteredAndSortedGroups.length} of {groups.length} groups
              </p>
              <div className="flex items-center space-x-2">
                <FunnelIcon className="h-4 w-4 text-kaia-text-muted" />
                <span className="text-sm text-kaia-text-muted">Filters applied</span>
              </div>
            </div>
          </div>
        </div>

        {/* Groups Grid */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredAndSortedGroups.length === 0 ? (
          <div className="text-center py-16">
            <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-kaia-text-muted" />
            <h3 className="mt-4 text-lg font-medium text-kaia-text-primary">No groups found</h3>
            <p className="mt-2 text-kaia-text-muted">
              {searchTerm || selectedModel !== null || selectedStatus !== null
                ? 'Try adjusting your filters or search terms.'
                : 'No thrift groups have been created yet.'}
            </p>
            {!searchTerm && selectedModel === null && selectedStatus === null && (
              <div className="mt-8">
                <button
                  onClick={() => navigate('/create-group')}
                  className="btn-kaia-primary"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create First Group
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
          <div className="mt-12 text-center">
            <button className="btn-kaia-secondary">
              Load More Groups
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupsPage;