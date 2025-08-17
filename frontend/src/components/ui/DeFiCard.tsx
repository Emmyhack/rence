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
import { fetchKaiaChainTvl, fetchTopKaiaYields, YieldPool } from '@services/defiFeeds';

interface DeFiCardProps {
  className?: string;
}

const DeFiCard: React.FC<DeFiCardProps> = ({ className = '' }) => {
  const [defiInfo, setDefiInfo] = useState<DeFiInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [chainTvl, setChainTvl] = useState<number | null>(null)
  const [topPools, setTopPools] = useState<YieldPool[]>([])
  const [feedsLoading, setFeedsLoading] = useState(true)

  useEffect(() => {
    loadDeFiInfo();
    loadFeeds();
  }, []);

  const loadFeeds = async () => {
    try {
      setFeedsLoading(true)
      const [tvl, pools] = await Promise.all([
        fetchKaiaChainTvl(),
        fetchTopKaiaYields(5),
      ])
      setChainTvl(tvl)
      setTopPools(pools)
    } catch {
      setTopPools([])
    } finally {
      setFeedsLoading(false)
    }
  }

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
      <div className={`glass-card ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner w-8 h-8"></div>
        </div>
      </div>
    );
  }

  if (!defiInfo) {
    return (
      <div className={`glass-card ${className}`}>
        <div className="p-8">
          <div className="flex items-center mb-6">
            <SparklesIcon className="h-6 w-6 text-kaia-primary mr-3" />
            <h3 className="text-xl font-semibold text-kaia-text-primary">DeFi Strategy</h3>
          </div>
          <p className="text-kaia-text-muted">Unable to load DeFi information</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`glass-card-hover ${className}`}
    >
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-r from-kaia-primary/20 to-kaia-primary/10 rounded-kaia-lg mr-4 border border-kaia-primary/30">
              <SparklesIcon className="h-6 w-6 text-kaia-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-kaia-text-primary">DeFi Strategy</h3>
              <p className="text-sm text-kaia-text-secondary">Yield Generation Protocol</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-kaia-primary">
              {hematService.formatAPY(defiInfo.apy)}
            </div>
            <div className="text-xs text-kaia-text-muted">Current APY</div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="metric-card">
            <div className="flex items-center mb-2">
              <CurrencyDollarIcon className="h-4 w-4 text-kaia-primary mr-2" />
              <span className="metric-label">Strategy Balance</span>
            </div>
            <div className="metric-value">
              ${hematService.formatUSDT(defiInfo.strategyBalance)}
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center mb-2">
              <ChartBarIcon className="h-4 w-4 text-kaia-primary mr-2" />
              <span className="metric-label">Total Value Locked</span>
            </div>
            <div className="metric-value">
              ${hematService.formatUSDT(defiInfo.tvl)}
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center mb-2">
              <ArrowTrendingUpIcon className="h-4 w-4 text-kaia-primary mr-2" />
              <span className="metric-label">Total Deposited</span>
            </div>
            <div className="metric-value">
              ${hematService.formatUSDT(defiInfo.totalDeposited)}
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center mb-2">
              <ClockIcon className="h-4 w-4 text-kaia-primary mr-2" />
              <span className="metric-label">Total Harvested</span>
            </div>
            <div className="metric-value">
              ${hematService.formatUSDT(defiInfo.totalHarvested)}
            </div>
          </div>
        </div>

        {/* Chain Feed */}
        <div className="mb-8 p-6 bg-kaia-surface/50 rounded-kaia-lg border border-kaia-border/50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-kaia-text-muted">Kaia Chain TVL (DefiLlama)</p>
            <p className="text-sm text-kaia-text-primary font-medium">{feedsLoading ? 'Loading…' : chainTvl ? `$${chainTvl.toLocaleString()}` : 'N/A'}</p>
          </div>
        </div>

        {/* Top Pools */}
        {feedsLoading ? (
          <div className="mb-4 text-sm text-kaia-text-muted">Loading top pools…</div>
        ) : topPools.length > 0 ? (
          <div className="mb-8">
            <h4 className="text-sm text-kaia-text-muted mb-4">Top Kaia Pools</h4>
            <div className="space-y-3">
              {topPools.map((p) => (
                <div key={p.pool} className="flex items-center justify-between p-4 bg-kaia-surface/50 rounded-kaia-lg border border-kaia-border/50">
                  <div className="text-sm text-kaia-text-primary font-medium">{p.project} · {p.symbol}</div>
                  <div className="text-sm text-kaia-text-secondary">APY: {p.apy.toFixed(2)}% · TVL: ${Math.round(p.tvlUsd).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-4 text-sm text-kaia-text-muted">No Kaia pools available right now.</div>
        )}

        {/* Last Harvest Info */}
        {parseInt(defiInfo.lastHarvestAt) > 0 && (
          <div className="mb-8 p-6 bg-kaia-surface/50 rounded-kaia-lg border border-kaia-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-kaia-text-muted">Last Harvest</p>
                <p className="text-sm text-kaia-text-primary font-medium">
                  {new Date(parseInt(defiInfo.lastHarvestAt) * 1000).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-kaia-text-muted">Time</p>
                <p className="text-sm text-kaia-text-primary font-medium">
                  {new Date(parseInt(defiInfo.lastHarvestAt) * 1000).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-4">
          <button
            onClick={handleHarvest}
            disabled={isHarvesting}
            className="btn-kaia-success flex-1 flex items-center justify-center"
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
            className="btn-kaia-secondary flex items-center justify-center px-6"
          >
            <ArrowTrendingUpIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Performance Indicator */}
        <div className="mt-6 p-4 bg-gradient-to-r from-kaia-primary/10 to-kaia-primary/5 rounded-kaia-lg border border-kaia-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-kaia-primary font-medium">Performance</span>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-kaia-primary rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm text-kaia-primary">Active</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DeFiCard;