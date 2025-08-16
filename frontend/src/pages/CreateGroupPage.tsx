import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { motion } from 'framer-motion';
import {
  CurrencyDollarIcon,
  ClockIcon,
  UsersIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

import { useAppDispatch, useAppSelector } from '@hooks/redux';
import { createGroup, fetchPlatformStats } from '@store/slices/groupsSlice';
import { GroupConfig } from '@services/web3/hematService';
import LoadingSpinner from '@components/ui/LoadingSpinner';

// Validation schema
const schema = yup.object({
  model: yup.number().required('Please select a thrift model'),
  contributionAmount: yup
    .string()
    .required('Contribution amount is required')
    .test('min-amount', 'Amount must be at least 10 USDT', (value) => {
      const num = parseFloat(value);
      return !isNaN(num) && num >= 10;
    })
    .test('max-amount', 'Amount cannot exceed 10,000 USDT', (value) => {
      const num = parseFloat(value);
      return !isNaN(num) && num <= 10000;
    }),
  cycleInterval: yup
    .string()
    .required('Cycle interval is required')
    .test('min-interval', 'Interval must be at least 1 day', (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num >= 86400; // 1 day in seconds
    }),
  groupSize: yup
    .string()
    .required('Group size is required')
    .test('min-size', 'Group size must be at least 3', (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num >= 3;
    })
    .test('max-size', 'Group size cannot exceed 50', (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num <= 50;
    }),
  lockDuration: yup
    .string()
    .required('Lock duration is required')
    .test('min-duration', 'Lock duration must be at least 1 day', (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num >= 86400;
    }),
  gracePeriod: yup
    .string()
    .required('Grace period is required')
    .test('min-grace', 'Grace period must be at least 1 day', (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num >= 86400;
    }),
  stakeRequired: yup
    .string()
    .required('Stake amount is required')
    .test('min-stake', 'Stake must be at least 10 USDT', (value) => {
      const num = parseFloat(value);
      return !isNaN(num) && num >= 10;
    }),
  insuranceEnabled: yup.boolean(),
  insuranceBps: yup
    .string()
    .when('insuranceEnabled', {
      is: true,
      then: yup
        .string()
        .required('Insurance rate is required when insurance is enabled')
        .test('valid-bps', 'Rate must be between 0 and 1000 basis points', (value) => {
          const num = parseInt(value);
          return !isNaN(num) && num >= 0 && num <= 1000;
        }),
    }),
  platformFeeBps: yup
    .string()
    .required('Platform fee is required')
    .test('valid-bps', 'Fee must be between 0 and 1000 basis points', (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num >= 0 && num <= 1000;
    }),
  earlyWithdrawalPenaltyBps: yup
    .string()
    .required('Early withdrawal penalty is required')
    .test('valid-bps', 'Penalty must be between 0 and 1000 basis points', (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num >= 0 && num <= 1000;
    }),
});

const CreateGroupPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isConnected, address } = useAppSelector((state) => state.wallet);
  const { isLoading, error, platformStats } = useAppSelector((state) => state.groups);

  const [selectedModel, setSelectedModel] = useState<number>(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<GroupConfig>({
    resolver: yupResolver(schema),
    mode: 'onChange',
    defaultValues: {
      model: 0,
      contributionAmount: '100',
      cycleInterval: '604800', // 7 days
      groupSize: '10',
      lockDuration: '2592000', // 30 days
      gracePeriod: '172800', // 2 days
      stakeRequired: '50',
      insuranceEnabled: true,
      insuranceBps: '200', // 2%
      platformFeeBps: '100', // 1%
      earlyWithdrawalPenaltyBps: '500', // 5%
    },
  });

  const insuranceEnabled = watch('insuranceEnabled');

  useEffect(() => {
    if (!isConnected) {
      navigate('/');
      return;
    }

    // Fetch platform stats
    dispatch(fetchPlatformStats());
  }, [isConnected, navigate, dispatch]);

  useEffect(() => {
    // Update form when model changes
    setValue('model', selectedModel);
    
    // Set default values based on model
    if (selectedModel === 0) { // Rotational
      setValue('lockDuration', '0');
      setValue('earlyWithdrawalPenaltyBps', '0');
    } else if (selectedModel === 1) { // Fixed Savings
      setValue('lockDuration', '2592000'); // 30 days
      setValue('earlyWithdrawalPenaltyBps', '500'); // 5%
    } else if (selectedModel === 2) { // Emergency Liquidity
      setValue('lockDuration', '0');
      setValue('earlyWithdrawalPenaltyBps', '1000'); // 10%
    }
  }, [selectedModel, setValue]);

  const onSubmit = async (data: GroupConfig) => {
    try {
      const result = await dispatch(createGroup(data)).unwrap();
      if (result) {
        navigate(`/groups/${result.id}`);
      }
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const formatTime = (seconds: string) => {
    const secs = parseInt(seconds);
    if (secs === 0) return 'No lock';
    if (secs < 86400) return `${secs / 3600} hours`;
    if (secs < 2592000) return `${secs / 86400} days`;
    return `${secs / 2592000} months`;
  };

  const formatBps = (bps: string) => {
    const num = parseInt(bps);
    return `${(num / 100).toFixed(1)}%`;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">Wallet not connected</h2>
          <p className="mt-2 text-sm text-gray-500">Please connect your wallet to create a group.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Thrift Group</h1>
          <p className="mt-2 text-gray-600">
            Set up a new thrift group with your preferred configuration and invite members to join.
          </p>
        </div>

        {/* Platform Stats */}
        {platformStats && (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Limits</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-500">Min Contribution</p>
                <p className="text-lg font-semibold text-gray-900">{platformStats.minContribution} USDT</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Max Contribution</p>
                <p className="text-lg font-semibold text-gray-900">{platformStats.maxContribution} USDT</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Min Group Size</p>
                <p className="text-lg font-semibold text-gray-900">{platformStats.minGroupSize}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Max Group Size</p>
                <p className="text-lg font-semibold text-gray-900">{platformStats.maxGroupSize}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Thrift Model Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Thrift Model</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  id: 0,
                  name: 'Rotational Savings',
                  description: 'Traditional rotating savings where members take turns receiving payouts',
                  icon: UsersIcon,
                  features: ['Fixed contribution cycles', 'Rotating payouts', 'No lock period']
                },
                {
                  id: 1,
                  name: 'Fixed Savings Pool',
                  description: 'Lock funds for a fixed period and earn yield',
                  icon: ClockIcon,
                  features: ['Fixed lock period', 'Yield generation', 'Early withdrawal penalty']
                },
                {
                  id: 2,
                  name: 'Emergency Liquidity',
                  description: 'Emergency fund with instant access for verified claims',
                  icon: ShieldCheckIcon,
                  features: ['Emergency access', 'Verification required', 'Higher penalties']
                }
              ].map((model) => (
                <div
                  key={model.id}
                  className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedModel === model.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedModel(model.id)}
                >
                  <input
                    type="radio"
                    {...register('model')}
                    value={model.id}
                    className="sr-only"
                  />
                  <div className="flex items-center mb-3">
                    <model.icon className="h-6 w-6 text-indigo-600 mr-2" />
                    <h4 className="font-medium text-gray-900">{model.name}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{model.description}</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    {model.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircleIcon className="h-3 w-3 text-green-500 mr-1" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {selectedModel === model.id && (
                    <div className="absolute top-2 right-2">
                      <CheckCircleIcon className="h-5 w-5 text-indigo-600" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Basic Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contribution Amount (USDT)
                </label>
                <div className="relative">
                  <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    {...register('contributionAmount')}
                    className="pl-10 w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="100.00"
                  />
                </div>
                {errors.contributionAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.contributionAmount.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cycle Interval (seconds)
                </label>
                <div className="relative">
                  <ClockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    {...register('cycleInterval')}
                    className="pl-10 w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="604800"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {formatTime(watch('cycleInterval'))}
                </p>
                {errors.cycleInterval && (
                  <p className="mt-1 text-sm text-red-600">{errors.cycleInterval.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Size
                </label>
                <div className="relative">
                  <UsersIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    {...register('groupSize')}
                    className="pl-10 w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="10"
                  />
                </div>
                {errors.groupSize && (
                  <p className="mt-1 text-sm text-red-600">{errors.groupSize.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lock Duration (seconds)
                </label>
                <div className="relative">
                  <ClockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    {...register('lockDuration')}
                    className="pl-10 w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="2592000"
                    disabled={selectedModel === 0}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {formatTime(watch('lockDuration'))}
                </p>
                {errors.lockDuration && (
                  <p className="mt-1 text-sm text-red-600">{errors.lockDuration.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grace Period (seconds)
                </label>
                <input
                  type="number"
                  {...register('gracePeriod')}
                  className="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="172800"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formatTime(watch('gracePeriod'))}
                </p>
                {errors.gracePeriod && (
                  <p className="mt-1 text-sm text-red-600">{errors.gracePeriod.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Stake (USDT)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('stakeRequired')}
                  className="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="50.00"
                />
                {errors.stakeRequired && (
                  <p className="mt-1 text-sm text-red-600">{errors.stakeRequired.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform Fee (basis points)
                </label>
                <input
                  type="number"
                  {...register('platformFeeBps')}
                  className="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formatBps(watch('platformFeeBps'))}
                </p>
                {errors.platformFeeBps && (
                  <p className="mt-1 text-sm text-red-600">{errors.platformFeeBps.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Early Withdrawal Penalty (basis points)
                </label>
                <input
                  type="number"
                  {...register('earlyWithdrawalPenaltyBps')}
                  className="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="500"
                  disabled={selectedModel === 0}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formatBps(watch('earlyWithdrawalPenaltyBps'))}
                </p>
                {errors.earlyWithdrawalPenaltyBps && (
                  <p className="mt-1 text-sm text-red-600">{errors.earlyWithdrawalPenaltyBps.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Insurance Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Insurance Configuration</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register('insuranceEnabled')}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Enable insurance coverage for this group
                </label>
              </div>

              {insuranceEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Insurance Premium Rate (basis points)
                  </label>
                  <input
                    type="number"
                    {...register('insuranceBps')}
                    className="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="200"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {formatBps(watch('insuranceBps'))}
                  </p>
                  {errors.insuranceBps && (
                    <p className="mt-1 text-sm text-red-600">{errors.insuranceBps.message}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!isValid || isLoading}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="h-5 w-5 mr-2" />
                  Creating Group...
                </>
              ) : (
                'Create Group'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupPage;