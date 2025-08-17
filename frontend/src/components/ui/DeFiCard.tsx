import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { hematService, DeFiInfo } from '@services/web3/hematService';

interface DeFiCardProps {
  className?: string;
}

const DeFiCard: React.FC<DeFiCardProps> = ({ className = '' }) => {
  const [defiInfo, setDefiInfo] = useState<DeFiInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHarvesting, setIsHarvesting] = useState(false);

  useEffect(() => {
    loadDeFiInfo();
  }, []);

  const loadDeFiInfo = async () => {
    try {
      setIsLoading(true);
      const info = await hematService.getDeFiInfo();
      setDefiInfo(info);
    } catch (error) {
      console.error('Error loading DeFi info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHarvest = async () => {
    try {
      setIsHarvesting(true);
      const harvestedAmount = await hematService.harvestDeFiYield();
      if (harvestedAmount) {
        // Reload info after successful harvest
        await loadDeFiInfo();
      }
    } catch (error) {
      console.error('Error harvesting yield:', error);
    } finally {
      setIsHarvesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`card ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner w-8 h-8"></div>
        </div>
      </div>
    );
  }

  if (!defiInfo) {
    return (
      <div className={`card ${className}`}>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <SparklesIcon className="h-6 w-6 text-purple-400 mr-2" />
            <h3 className="text-lg font-semibold text-white">DeFi Strategy</h3>
          </div>
          <p className="text-gray-400">Unable to load DeFi information</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`card-hover ${className}`}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="p-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl mr-3">
              <SparklesIcon className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">DeFi Strategy</h3>
              <p className="text-sm text-gray-400">Yield Generation Protocol</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-400">
              {hematService.formatAPY(defiInfo.apy)}
            </div>
            <div className="text-xs text-gray-400">Current APY</div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="metric-card">
            <div className="flex items-center mb-2">
              <CurrencyDollarIcon className="h-4 w-4 text-blue-400 mr-2" />
              <span className="metric-label">Strategy Balance</span>
            </div>
            <div className="metric-value">
              ${hematService.formatUSDT(defiInfo.strategyBalance)}
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center mb-2">
              <ChartBarIcon className="h-4 w-4 text-green-400 mr-2" />
              <span className="metric-label">Total Value Locked</span>
            </div>
            <div className="metric-value">
              ${hematService.formatUSDT(defiInfo.tvl)}
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center mb-2">
              <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-400 mr-2" />
              <span className="metric-label">Total Deposited</span>
            </div>
            <div className="metric-value">
              ${hematService.formatUSDT(defiInfo.totalDeposited)}
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center mb-2">
              <ClockIcon className="h-4 w-4 text-yellow-400 mr-2" />
              <span className="metric-label">Total Harvested</span>
            </div>
            <div className="metric-value">
              ${hematService.formatUSDT(defiInfo.totalHarvested)}
            </div>
          </div>
        </div>

        {/* Last Harvest Info */}
        {parseInt(defiInfo.lastHarvestAt) > 0 && (
          <div className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Last Harvest</p>
                <p className="text-sm text-white">
                  {new Date(parseInt(defiInfo.lastHarvestAt) * 1000).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Time</p>
                <p className="text-sm text-white">
                  {new Date(parseInt(defiInfo.lastHarvestAt) * 1000).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={handleHarvest}
            disabled={isHarvesting}
            className="btn-success flex-1 flex items-center justify-center"
          >
            {isHarvesting ? (
              <>
                <div className="loading-spinner w-4 h-4 mr-2"></div>
                Harvesting...
              </>
            ) : (
              <>
                <SparklesIcon className="h-4 w-4 mr-2" />
                Harvest Yield
              </>
            )}
          </button>
          
          <button
            onClick={loadDeFiInfo}
            className="btn-secondary flex items-center justify-center px-4"
          >
            <ArrowTrendingUpIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Performance Indicator */}
        <div className="mt-4 p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-400 font-medium">Performance</span>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm text-green-400">Active</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DeFiCard;