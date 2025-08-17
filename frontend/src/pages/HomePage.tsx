import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  UsersIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

import { useAppSelector } from '@hooks/redux';
import { usePlatformStats } from '@hooks/api/usePlatformStats';
import StatsCard from '@components/ui/StatsCard';
import FeatureCard from '@components/ui/FeatureCard';
import TestimonialCard from '@components/ui/TestimonialCard';

const HomePage: React.FC = () => {
  const { isConnected } = useAppSelector((state) => state.wallet);
  const { data: platformStats, isLoading: statsLoading } = usePlatformStats();

  const features = [
    {
      icon: <CurrencyDollarIcon className="w-6 h-6" />,
      title: 'Rotational Savings (Ajo)',
      description: 'Traditional rotating savings where members contribute fixed amounts and take turns receiving the pot.',
      benefits: ['Guaranteed payouts', 'Community-driven', 'Cultural familiarity'],
    },
    {
      icon: <ShieldCheckIcon className="w-6 h-6" />,
      title: 'Fixed Savings Pool',
      description: 'Lock your funds for a fixed period and earn yield from DeFi strategies on idle funds.',
      benefits: ['Earn yield', 'Capital protection', 'Fixed maturity'],
    },
    {
      icon: <ChartBarIcon className="w-6 h-6" />,
      title: 'Emergency Insurance',
      description: 'Access emergency liquidity through community insurance pool for verified emergencies.',
      benefits: ['Quick access', 'Community support', 'Verified claims'],
    },
  ];

  const benefits = [
    'USDT stability protects against volatility',
    'Smart contracts eliminate trust issues',
    'Automatic yield generation on idle funds',
    'Transparent insurance pool coverage',
    'Real-time transaction tracking',
    'Mobile-first design for accessibility',
  ];

  const testimonials = [
    {
      name: 'Adaora Okafor',
      role: 'Small Business Owner',
      avatar: '/avatars/adaora.jpg',
      content: 'Hemat helped me save consistently for my business expansion. The blockchain transparency gives me confidence.',
    },
    {
      name: 'Kwame Asante',
      role: 'Software Developer',
      avatar: '/avatars/kwame.jpg',
      content: 'I love earning yield while participating in traditional savings. The best of both worlds!',
    },
    {
      name: 'Fatima Abdul',
      role: 'Teacher',
      avatar: '/avatars/fatima.jpg',
      content: 'The insurance feature saved me during a medical emergency. The community support is amazing.',
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-y-0 h-full w-full" aria-hidden="true">
          <div className="relative h-full">
            <svg
              className="absolute right-full transform translate-y-1/3 translate-x-1/4 md:translate-y-1/2 sm:translate-x-1/2 lg:translate-x-full"
              width={404}
              height={784}
              fill="none"
              viewBox="0 0 404 784"
            >
              <defs>
                <pattern
                  id="e229dbec-10e9-49ee-8ec3-0286ca089edf"
                  x={0}
                  y={0}
                  width={20}
                  height={20}
                  patternUnits="userSpaceOnUse"
                >
                  <rect x={0} y={0} width={4} height={4} className="text-gray-200" fill="currentColor" />
                </pattern>
              </defs>
              <rect width={404} height={784} fill="url(#e229dbec-10e9-49ee-8ec3-0286ca089edf)" />
            </svg>
          </div>
        </div>

        <div className="relative pt-6 pb-16 sm:pb-24">
          <main className="mt-16 mx-auto max-w-7xl px-4 sm:mt-24 sm:px-6 lg:mt-32">
            <div className="lg:grid lg:grid-cols-12 lg:gap-8">
              <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <h1>
                    <span className="block text-sm font-semibold uppercase tracking-wide text-indigo-600">
                      DeFi Meets Tradition
                    </span>
                    <span className="mt-1 block text-4xl tracking-tight font-extrabold sm:text-5xl xl:text-6xl">
                      <span className="block text-gray-900">Hemat</span>
                      <span className="block text-indigo-600">Thrift & Insurance</span>
                    </span>
                  </h1>
                  <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
                    USDT-powered thrift savings and insurance platform on Kaia blockchain. 
                    Join traditional communal savings with modern DeFi benefits.
                  </p>
                </motion.div>

                <motion.div
                  className="mt-8 sm:max-w-lg sm:mx-auto sm:text-center lg:text-left lg:mx-0"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    {isConnected ? (
                      <>
                        <Link
                          to="/dashboard"
                          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200"
                        >
                          Go to Dashboard
                          <ArrowRightIcon className="ml-2 h-5 w-5" />
                        </Link>
                        <Link
                          to="/create-group"
                          className="inline-flex items-center justify-center px-6 py-3 border border-indigo-600 text-base font-medium rounded-md text-indigo-600 hover:bg-indigo-50 transition-colors duration-200"
                        >
                          Create Group
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/groups"
                          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200"
                        >
                          Explore Groups
                          <ArrowRightIcon className="ml-2 h-5 w-5" />
                        </Link>
                        <button className="inline-flex items-center justify-center px-6 py-3 border border-indigo-600 text-base font-medium rounded-md text-indigo-600 hover:bg-indigo-50 transition-colors duration-200">
                          Connect Wallet
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              </div>

              <motion.div
                className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6 lg:flex lg:items-center"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <div className="relative mx-auto w-full rounded-lg shadow-lg lg:max-w-md">
                  <div className="relative block w-full bg-white rounded-lg overflow-hidden">
                    <img
                      className="w-full"
                      src="/images/hero-dashboard.png"
                      alt="Hemat Dashboard Preview"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.onerror = null;
                        target.src = 'https://dummyimage.com/800x500/e5e7eb/111827.png&text=Dashboard+Preview';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-600 to-transparent opacity-20"></div>
                  </div>
                </div>
              </motion.div>
            </div>
          </main>
        </div>
      </div>

      {/* Stats Section */}
      {platformStats && (
        <motion.div
          className="bg-indigo-600"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="max-w-7xl mx-auto py-12 px-4 sm:py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                Trusted by the Community
              </h2>
              <p className="mt-3 text-xl text-indigo-200 sm:mt-4">
                Join thousands of users building wealth together
              </p>
            </div>
            <dl className="mt-10 text-center sm:max-w-3xl sm:mx-auto sm:grid sm:grid-cols-3 sm:gap-8">
              <div className="flex flex-col">
                <dt className="order-2 mt-2 text-lg leading-6 font-medium text-indigo-200">
                  Active Groups
                </dt>
                <dd className="order-1 text-5xl font-extrabold text-white">
                  {platformStats.totalGroups.toLocaleString()}
                </dd>
              </div>
              <div className="flex flex-col mt-10 sm:mt-0">
                <dt className="order-2 mt-2 text-lg leading-6 font-medium text-indigo-200">
                  Total Volume
                </dt>
                <dd className="order-1 text-5xl font-extrabold text-white">
                  ${platformStats.totalVolume?.toLocaleString() || '0'}
                </dd>
              </div>
              <div className="flex flex-col mt-10 sm:mt-0">
                <dt className="order-2 mt-2 text-lg leading-6 font-medium text-indigo-200">
                  Members
                </dt>
                <dd className="order-1 text-5xl font-extrabold text-white">
                  {platformStats.totalUsers?.toLocaleString() || '0'}
                </dd>
              </div>
            </dl>
          </div>
        </motion.div>
      )}

      {/* Features Section */}
      <div className="py-16 bg-gray-50 overflow-hidden lg:py-24">
        <div className="relative max-w-xl mx-auto px-4 sm:px-6 lg:px-8 lg:max-w-7xl">
          <div className="relative">
            <h2 className="text-center text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Three Ways to Save
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-center text-xl text-gray-500">
              Choose the savings model that best fits your financial goals and community needs.
            </p>
          </div>

          <div className="relative mt-12 lg:mt-24 lg:grid lg:grid-cols-3 lg:gap-8 lg:items-center">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <FeatureCard {...feature} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-white py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Why Choose Hemat?
              </h2>
              <p className="mt-3 max-w-3xl text-lg text-gray-500">
                We combine the best of traditional community savings with modern blockchain technology 
                to create a secure, transparent, and profitable savings experience.
              </p>

              <dl className="mt-10 space-y-6">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    className="flex"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <CheckCircleIcon className="flex-shrink-0 w-6 h-6 text-green-500" />
                    <div className="ml-3">
                      <p className="text-lg text-gray-500">{benefit}</p>
                    </div>
                  </motion.div>
                ))}
              </dl>
            </div>

            <motion.div
              className="mt-10 lg:mt-0"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <img
                className="mx-auto rounded-lg shadow-lg"
                src="/images/benefits-illustration.png"
                alt="Hemat Benefits"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.onerror = null;
                  target.src = 'https://dummyimage.com/800x500/e5e7eb/111827.png&text=Benefits+Illustration';
                }}
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="bg-gray-50 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              What Our Community Says
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Real stories from real people building wealth with Hemat
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <TestimonialCard 
                  quote={testimonial.content}
                  author={testimonial.name}
                  role={testimonial.role}
                  avatar={testimonial.avatar}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-indigo-600">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              <span className="block">Ready to start saving?</span>
              <span className="block">Join a group today.</span>
            </h2>
            <p className="mt-4 text-lg leading-6 text-indigo-200">
              Connect your wallet and join thousands of users building wealth together through community savings.
            </p>
            <div className="mt-8 flex justify-center space-x-4">
              <Link
                to="/groups"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 transition-colors duration-200"
              >
                Browse Groups
              </Link>
              <Link
                to="/create-group"
                className="inline-flex items-center justify-center px-6 py-3 border border-white text-base font-medium rounded-md text-white hover:bg-indigo-700 transition-colors duration-200"
              >
                Create Group
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;