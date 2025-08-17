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
      className={`glass-card-hover ${className}`}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-gradient-to-r from-kaia-primary/20 to-kaia-primary/10 rounded-kaia-lg border border-kaia-primary/30">
                {getModelIcon(group.model)}
              </div>
              <span className="model-badge">
                {hematService.getThriftModelName(group.model)}
              </span>
              <span className={`status-badge ${getStatusColor(group.status)}`}>
                {getStatusIcon(group.status)}
                <span className="ml-2">{hematService.getGroupStatusName(group.status)}</span>
              </span>
            </div>
            <h3 className="text-xl font-semibold text-kaia-text-primary mb-2">
              Group #{group.id || 'N/A'}
            </h3>
            <p className="text-sm text-kaia-text-muted">
              Created by {hematService.formatAddress(group.creator)}
            </p>
          </div>
          
          <div className="text-right">
            <div className="amount-display">
              ${hematService.formatUSDT(group.contributionAmount)}
            </div>
            <div className="text-xs text-kaia-text-muted">per contribution</div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="metric-card">
            <div className="flex items-center mb-2">
              <UsersIcon className="h-4 w-4 text-kaia-primary mr-2" />
              <span className="metric-label">Members</span>
            </div>
            <div className="metric-value">
              {group.activeMemberCount}/{group.groupSize}
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center mb-2">
              <ClockIcon className="h-4 w-4 text-kaia-primary mr-2" />
              <span className="metric-label">Cycle Interval</span>
            </div>
            <div className="metric-value text-sm">
              {formatCycleInterval(group.cycleInterval)}
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center mb-2">
              <CurrencyDollarIcon className="h-4 w-4 text-kaia-primary mr-2" />
              <span className="metric-label">Stake Required</span>
            </div>
            <div className="metric-value">
              ${hematService.formatUSDT(group.stakeRequired)}
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center mb-2">
              <ShieldCheckIcon className="h-4 w-4 text-kaia-primary mr-2" />
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
            <div className="flex items-center justify-between p-3 bg-kaia-surface/50 rounded-kaia-lg border border-kaia-border/50">
              <span className="text-sm text-kaia-text-muted">Lock Duration</span>
              <span className="text-sm text-kaia-text-primary font-medium">
                {formatTime(group.lockDuration)}
              </span>
            </div>
          )}

          {group.insuranceEnabled && (
            <div className="flex items-center justify-between p-3 bg-kaia-primary/10 rounded-kaia-lg border border-kaia-primary/20">
              <span className="text-sm text-kaia-primary">Insurance Premium</span>
              <span className="text-sm text-kaia-primary font-medium">
                {parseInt(group.insuranceBps) / 100}%
              </span>
            </div>
          )}

          {parseInt(group.currentCycle) > 0 && (
            <div className="flex items-center justify-between p-3 bg-kaia-primary/10 rounded-kaia-lg border border-kaia-primary/20">
              <span className="text-sm text-kaia-primary">Current Cycle</span>
              <span className="text-sm text-kaia-primary font-medium">
                {group.currentCycle}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={() => onGroupClick(group)}
            className="btn-kaia-primary flex-1 flex items-center justify-center"
          >
            <ArrowRightIcon className="h-4 w-4 mr-2" />
            View Details
          </button>

          {group.status === 1 && onAction && (
            <button
              onClick={() => handleAction('contribute')}
              disabled={isLoading}
              className="btn-kaia-success flex items-center justify-center px-4"
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
              className="btn-kaia-warning flex items-center justify-center px-4"
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
              className="btn-kaia-secondary flex items-center justify-center px-4"
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
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-kaia-text-muted mb-3">
              <span>Progress</span>
              <span>{group.activeMemberCount}/{group.groupSize} members</span>
            </div>
            <div className="w-full bg-kaia-surface/50 rounded-full h-2 border border-kaia-border/50">
              <div
                className="bg-gradient-to-r from-kaia-primary to-kaia-primaryLight h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(parseInt(group.activeMemberCount) / parseInt(group.groupSize)) * 100}%`
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Trust Score Indicator */}
        <div className="mt-6 flex items-center justify-between p-3 bg-kaia-surface/50 rounded-kaia-lg border border-kaia-border/50">
          <div className="flex items-center">
            <StarIcon className="h-4 w-4 text-kaia-primary mr-2" />
            <span className="text-sm text-kaia-text-muted">Group Health</span>
          </div>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon
                key={star}
                className={`h-3 w-3 ${
                  star <= Math.min(5, Math.max(1, parseInt(group.activeMemberCount)))
                    ? 'text-kaia-primary fill-current'
                    : 'text-kaia-text-muted'
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