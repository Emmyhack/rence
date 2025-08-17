import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  UsersIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PauseIcon,
  PlayIcon,
  XMarkIcon,
  ArrowRightIcon,
  ChartBarIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { hematService, GroupInfo } from '@services/web3/hematService';

interface GroupCardProps {
  group: GroupInfo;
  onGroupClick: (group: GroupInfo) => void;
  onAction?: (action: string, group: GroupInfo) => void;
  className?: string;
}

const GroupCard: React.FC<GroupCardProps> = ({ 
  group, 
  onGroupClick, 
  onAction,
  className = '' 
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const getStatusColor = (status: number) => {
    const colors = {
      0: 'status-created',
      1: 'status-active',
      2: 'status-completed',
      3: 'status-paused',
      4: 'status-cancelled',
    };
    return colors[status as keyof typeof colors] || 'status-created';
  };

  const getStatusIcon = (status: number) => {
    switch (status) {
      case 0: return <ClockIcon className="h-4 w-4" />;
      case 1: return <CheckCircleIcon className="h-4 w-4" />;
      case 2: return <CheckCircleIcon className="h-4 w-4" />;
      case 3: return <PauseIcon className="h-4 w-4" />;
      case 4: return <XMarkIcon className="h-4 w-4" />;
      default: return <ClockIcon className="h-4 w-4" />;
    }
  };

  const getModelIcon = (model: number) => {
    switch (model) {
      case 0: return <UsersIcon className="h-4 w-4" />;
      case 1: return <CurrencyDollarIcon className="h-4 w-4" />;
      case 2: return <ShieldCheckIcon className="h-4 w-4" />;
      default: return <ChartBarIcon className="h-4 w-4" />;
    }
  };

  const handleAction = async (action: string) => {
    if (!onAction) return;
    
    setIsLoading(true);
    try {
      await onAction(action, group);
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: string) => {
    const secs = parseInt(seconds);
    if (secs === 0) return 'No lock';
    if (secs < 86400) return `${secs / 3600} hours`;
    if (secs < 2592000) return `${secs / 86400} days`;
    return `${secs / 2592000} months`;
  };

  const formatCycleInterval = (seconds: string) => {
    const secs = parseInt(seconds);
    if (secs < 86400) return `${secs / 3600} hours`;
    if (secs < 2592000) return `${secs / 86400} days`;
    return `${secs / 2592000} months`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`card-hover ${className}`}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <div className="p-1.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg">
                {getModelIcon(group.model)}
              </div>
              <span className="model-badge">
                {hematService.getThriftModelName(group.model)}
              </span>
              <span className={`status-badge ${getStatusColor(group.status)}`}>
                {getStatusIcon(group.status)}
                <span className="ml-1">{hematService.getGroupStatusName(group.status)}</span>
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Group #{group.id || 'N/A'}
            </h3>
            <p className="text-sm text-gray-400">
              Created by {hematService.formatAddress(group.creator)}
            </p>
          </div>
          
          <div className="text-right">
            <div className="amount-display">
              ${hematService.formatUSDT(group.contributionAmount)}
            </div>
            <div className="text-xs text-gray-400">per contribution</div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="metric-card">
            <div className="flex items-center mb-1">
              <UsersIcon className="h-4 w-4 text-blue-400 mr-2" />
              <span className="metric-label">Members</span>
            </div>
            <div className="metric-value">
              {group.activeMemberCount}/{group.groupSize}
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center mb-1">
              <ClockIcon className="h-4 w-4 text-yellow-400 mr-2" />
              <span className="metric-label">Cycle Interval</span>
            </div>
            <div className="metric-value text-sm">
              {formatCycleInterval(group.cycleInterval)}
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center mb-1">
              <CurrencyDollarIcon className="h-4 w-4 text-green-400 mr-2" />
              <span className="metric-label">Stake Required</span>
            </div>
            <div className="metric-value">
              ${hematService.formatUSDT(group.stakeRequired)}
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center mb-1">
              <ShieldCheckIcon className="h-4 w-4 text-purple-400 mr-2" />
              <span className="metric-label">Insurance</span>
            </div>
            <div className="metric-value">
              {group.insuranceEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="space-y-3 mb-6">
          {group.lockDuration && parseInt(group.lockDuration) > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
              <span className="text-sm text-gray-400">Lock Duration</span>
              <span className="text-sm text-white font-medium">
                {formatTime(group.lockDuration)}
              </span>
            </div>
          )}

          {group.insuranceEnabled && (
            <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <span className="text-sm text-purple-400">Insurance Premium</span>
              <span className="text-sm text-purple-400 font-medium">
                {parseInt(group.insuranceBps) / 100}%
              </span>
            </div>
          )}

          {parseInt(group.currentCycle) > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <span className="text-sm text-blue-400">Current Cycle</span>
              <span className="text-sm text-blue-400 font-medium">
                {group.currentCycle}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={() => onGroupClick(group)}
            className="btn-primary flex-1 flex items-center justify-center"
          >
            <ArrowRightIcon className="h-4 w-4 mr-2" />
            View Details
          </button>

          {group.status === 1 && onAction && (
            <button
              onClick={() => handleAction('contribute')}
              disabled={isLoading}
              className="btn-success flex items-center justify-center px-4"
            >
              {isLoading ? (
                <div className="loading-spinner w-4 h-4"></div>
              ) : (
                <CurrencyDollarIcon className="h-4 w-4" />
              )}
            </button>
          )}

          {group.status === 3 && onAction && (
            <button
              onClick={() => handleAction('resume')}
              disabled={isLoading}
              className="btn-warning flex items-center justify-center px-4"
            >
              {isLoading ? (
                <div className="loading-spinner w-4 h-4"></div>
              ) : (
                <PlayIcon className="h-4 w-4" />
              )}
            </button>
          )}

          {group.status === 1 && onAction && (
            <button
              onClick={() => handleAction('pause')}
              disabled={isLoading}
              className="btn-secondary flex items-center justify-center px-4"
            >
              {isLoading ? (
                <div className="loading-spinner w-4 h-4"></div>
              ) : (
                <PauseIcon className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Progress Indicator */}
        {group.status === 1 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>Progress</span>
              <span>{group.activeMemberCount}/{group.groupSize} members</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(parseInt(group.activeMemberCount) / parseInt(group.groupSize)) * 100}%`
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Trust Score Indicator */}
        <div className="mt-4 flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
          <div className="flex items-center">
            <StarIcon className="h-4 w-4 text-yellow-400 mr-2" />
            <span className="text-sm text-gray-400">Group Health</span>
          </div>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon
                key={star}
                className={`h-3 w-3 ${
                  star <= Math.min(5, Math.max(1, parseInt(group.activeMemberCount)))
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GroupCard;