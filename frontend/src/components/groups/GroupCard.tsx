import React from 'react';
import { motion } from 'framer-motion';
import {
  UsersIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import { GroupInfo } from '@services/web3/hematService';

interface GroupCardProps {
  group: GroupInfo;
  onClick: () => void;
  isCreator: boolean;
}

const GroupCard: React.FC<GroupCardProps> = ({ group, onClick, isCreator }) => {
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

  const getModelIcon = (model: number) => {
    const icons = [UsersIcon, ClockIcon, ShieldCheckIcon];
    return icons[model] || UsersIcon;
  };

  const getModelColor = (model: number) => {
    const colors = ['text-blue-600', 'text-green-600', 'text-purple-600'];
    return colors[model] || 'text-gray-600';
  };

  const formatTime = (seconds: string) => {
    const secs = parseInt(seconds);
    if (secs === 0) return 'No lock';
    if (secs < 86400) return `${secs / 3600} hours`;
    if (secs < 2592000) return `${secs / 86400} days`;
    return `${secs / 2592000} months`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const ModelIcon = getModelIcon(group.model);
  const modelColor = getModelColor(group.model);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-lg shadow-md border border-gray-200 cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden"
      onClick={onClick}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <ModelIcon className={`h-5 w-5 ${modelColor} mr-2`} />
            <span className="text-sm font-medium text-gray-500">
              {getThriftModelName(group.model)}
            </span>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGroupStatusColor(group.status)}`}>
            {getGroupStatusName(group.status)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Group #{group.id}
          </h3>
          {isCreator && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Creator
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center text-sm">
            <CurrencyDollarIcon className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-gray-600">Contribution:</span>
            <span className="ml-1 font-medium text-gray-900">
              {parseFloat(group.contributionAmount).toFixed(2)} USDT
            </span>
          </div>
          
          <div className="flex items-center text-sm">
            <UsersIcon className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-gray-600">Members:</span>
            <span className="ml-1 font-medium text-gray-900">
              {group.members.length}/{group.groupSize}
            </span>
          </div>
        </div>

        {/* Cycle Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center text-sm">
            <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-gray-600">Cycle:</span>
            <span className="ml-1 font-medium text-gray-900">
              {group.currentCycle}
            </span>
          </div>
          
          <div className="flex items-center text-sm">
            <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-gray-600">Interval:</span>
            <span className="ml-1 font-medium text-gray-900">
              {formatTime(group.cycleInterval)}
            </span>
          </div>
        </div>

        {/* Advanced Info */}
        {group.lockDuration !== '0' && (
          <div className="flex items-center text-sm">
            <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-gray-600">Lock Duration:</span>
            <span className="ml-1 font-medium text-gray-900">
              {formatTime(group.lockDuration)}
            </span>
          </div>
        )}

        {group.stakeRequired !== '0' && (
          <div className="flex items-center text-sm">
            <ShieldCheckIcon className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-gray-600">Required Stake:</span>
            <span className="ml-1 font-medium text-gray-900">
              {parseFloat(group.stakeRequired).toFixed(2)} USDT
            </span>
          </div>
        )}

        {/* Insurance Status */}
        <div className="flex items-center text-sm">
          <ShieldCheckIcon className={`h-4 w-4 mr-2 ${group.insuranceEnabled ? 'text-green-500' : 'text-gray-400'}`} />
          <span className="text-gray-600">Insurance:</span>
          <span className={`ml-1 font-medium ${group.insuranceEnabled ? 'text-green-600' : 'text-gray-500'}`}>
            {group.insuranceEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {/* Creator Info */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Creator: {formatAddress(group.creator)}</span>
            <span>Next Payout: {group.nextPayoutTime !== '0' ? formatTime(group.nextPayoutTime) : 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Click to view details
          </span>
          <div className="flex items-center text-sm text-indigo-600">
            <span>View Group</span>
            <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GroupCard;