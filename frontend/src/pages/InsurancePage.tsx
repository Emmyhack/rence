import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

import { useAppDispatch, useAppSelector } from '@hooks/redux';
import { submitInsuranceClaim, fetchUserClaims, fetchPoolStats } from '@store/slices/insuranceSlice';
import { fetchUserGroups } from '@store/slices/groupsSlice';
import { hematService } from '@services/web3/hematService';
import LoadingSpinner from '@components/ui/LoadingSpinner';

// Validation schema for insurance claim
const claimSchema = yup.object({
  groupId: yup.number().required('Please select a group'),
  amount: yup
    .string()
    .required('Claim amount is required')
    .test('positive-amount', 'Amount must be greater than 0', (value) => {
      const num = parseFloat(value);
      return !isNaN(num) && num > 0;
    }),
  evidenceCID: yup.string().required('Evidence description is required'),
  reason: yup.string().required('Please provide a reason for your claim'),
});

interface ClaimFormData {
  groupId: number;
  amount: string;
  evidenceCID: string;
  reason: string;
}

const InsurancePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isConnected, address } = useAppSelector((state) => state.wallet);
  const { userGroups, createdGroups } = useAppSelector((state) => state.groups);
  const { userClaims, isLoading, poolStats } = useAppSelector((state) => state.insurance);

  const [showClaimForm, setShowClaimForm] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'claims' | 'submit'>('overview');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<ClaimFormData>({
    resolver: yupResolver(claimSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (!isConnected || !address) {
      navigate('/');
      return;
    }

    // Fetch user data
    dispatch(fetchUserClaims(address));
    dispatch(fetchUserGroups(address));
    dispatch(fetchPoolStats());
  }, [isConnected, address, navigate, dispatch]);

  const onSubmit = async (data: ClaimFormData) => {
    try {
      const result = await dispatch(submitInsuranceClaim({
        groupId: data.groupId,
        amount: data.amount,
        evidenceCID: data.evidenceCID,
      })).unwrap();
      
      if (result) {
        reset();
        setShowClaimForm(false);
        setSelectedTab('claims');
      }
    } catch (error) {
      console.error('Failed to submit claim:', error);
    }
  };

  const getClaimStatusColor = (status: number) => {
    const colors = {
      0: 'bg-yellow-100 text-yellow-800', // Submitted
      1: 'bg-blue-100 text-blue-800', // Approved
      2: 'bg-red-100 text-red-800', // Rejected
      3: 'bg-green-100 text-green-800', // Paid
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getClaimStatusName = (status: number) => {
    const statuses = ['Submitted', 'Approved', 'Rejected', 'Paid'];
    return statuses[status] || 'Unknown';
  };

  const getClaimStatusIcon = (status: number) => {
    const icons = [ClockIcon, CheckCircleIcon, XCircleIcon, CheckCircleIcon];
    return icons[status] || ClockIcon;
  };

  const formatDate = (timestamp: string) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleDateString();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const allGroups = [...userGroups, ...createdGroups];

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">Wallet not connected</h2>
          <p className="mt-2 text-sm text-gray-500">Please connect your wallet to access insurance features.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ShieldCheckIcon },
    { id: 'claims', name: 'My Claims', icon: DocumentTextIcon },
    { id: 'submit', name: 'Submit Claim', icon: PlusIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Insurance Center</h1>
          <p className="mt-2 text-gray-600">
            Manage your insurance coverage and submit claims for emergency situations.
          </p>
        </div>

        {/* Insurance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShieldCheckIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Coverage</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {allGroups.filter(g => g.insuranceEnabled).length}
                </p>
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
                <DocumentTextIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Claims</p>
                <p className="text-2xl font-semibold text-gray-900">{userClaims.length}</p>
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
                <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pool Reserves</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {poolStats ? `${poolStats.reserveRatio}%` : 'N/A'}
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
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    selectedTab === tab.id
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
            {selectedTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Insurance Coverage</h3>
                  {allGroups.filter(g => g.insuranceEnabled).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {allGroups
                        .filter(g => g.insuranceEnabled)
                        .map((group) => (
                          <div
                            key={group.address}
                            className="bg-gray-50 rounded-lg p-4 border-l-4 border-green-500"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900">Group #{group.id}</h4>
                              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                Covered
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p>Contribution: {parseFloat(group.contributionAmount).toFixed(2)} USDT</p>
                              <p>Members: {group.members.length}/{group.groupSize}</p>
                              <p>Premium: 2% of contributions</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No insurance coverage</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Join groups with insurance enabled to get coverage.
                      </p>
                    </div>
                  )}
                </div>

                {/* Pool Statistics */}
                {poolStats && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Pool Statistics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-500">Total Premiums</p>
                        <p className="text-lg font-semibold text-gray-900">{poolStats.totalPremiums} USDT</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-500">Total Claims</p>
                        <p className="text-lg font-semibold text-gray-900">{poolStats.totalClaims} USDT</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-500">Reserve Ratio</p>
                        <p className="text-lg font-semibold text-gray-900">{poolStats.reserveRatio}%</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-500">Min Reserve</p>
                        <p className="text-lg font-semibold text-gray-900">{poolStats.minReserveRatio}%</p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Claims Tab */}
            {selectedTab === 'claims' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">My Insurance Claims</h3>
                  <button
                    onClick={() => setSelectedTab('submit')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Submit New Claim
                  </button>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : userClaims.length > 0 ? (
                  <div className="space-y-4">
                    {userClaims.map((claim) => {
                      const StatusIcon = getClaimStatusIcon(claim.status);
                      return (
                        <div
                          key={claim.id}
                          className="bg-gray-50 rounded-lg p-6 border-l-4 border-indigo-500"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                              <StatusIcon className="h-5 w-5 text-gray-400 mr-2" />
                              <h4 className="font-medium text-gray-900">Claim #{claim.id}</h4>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getClaimStatusColor(claim.status)}`}>
                              {getClaimStatusName(claim.status)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <span className="text-sm text-gray-600">Amount:</span>
                              <span className="ml-2 font-medium">{parseFloat(claim.amount).toFixed(2)} USDT</span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">Group ID:</span>
                              <span className="ml-2 font-medium">{claim.groupId}</span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">Submitted:</span>
                              <span className="ml-2 font-medium">{formatDate(claim.submittedAt)}</span>
                            </div>
                            {claim.processedAt !== '0' && (
                              <div>
                                <span className="text-sm text-gray-600">Processed:</span>
                                <span className="ml-2 font-medium">{formatDate(claim.processedAt)}</span>
                              </div>
                            )}
                          </div>

                          <div className="bg-white rounded-lg p-4">
                            <h5 className="font-medium text-gray-900 mb-2">Evidence & Reason</h5>
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Evidence:</strong> {claim.evidenceCID}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Reason:</strong> Emergency situation requiring immediate funds
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No claims yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      You haven't submitted any insurance claims yet.
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={() => setSelectedTab('submit')}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Submit First Claim
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Submit Claim Tab */}
            {selectedTab === 'submit' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Submit Insurance Claim</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Submit a claim for emergency situations. Make sure you have proper evidence and documentation.
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Group Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Group
                    </label>
                    <select
                      {...register('groupId')}
                      className="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Choose a group...</option>
                      {allGroups
                        .filter(g => g.insuranceEnabled)
                        .map((group) => (
                          <option key={group.address} value={group.id}>
                            Group #{group.id} - {parseFloat(group.contributionAmount).toFixed(2)} USDT
                          </option>
                        ))}
                    </select>
                    {errors.groupId && (
                      <p className="mt-1 text-sm text-red-600">{errors.groupId.message}</p>
                    )}
                  </div>

                  {/* Claim Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Claim Amount (USDT)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('amount')}
                      className="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="0.00"
                    />
                    {errors.amount && (
                      <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                    )}
                  </div>

                  {/* Evidence Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Evidence Description
                    </label>
                    <textarea
                      {...register('evidenceCID')}
                      rows={3}
                      className="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Describe the evidence and documentation you have..."
                    />
                    {errors.evidenceCID && (
                      <p className="mt-1 text-sm text-red-600">{errors.evidenceCID.message}</p>
                    )}
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Claim
                    </label>
                    <textarea
                      {...register('reason')}
                      rows={3}
                      className="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Explain why you need this emergency funding..."
                    />
                    {errors.reason && (
                      <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
                    )}
                  </div>

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
                          Submitting Claim...
                        </>
                      ) : (
                        'Submit Claim'
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsurancePage;