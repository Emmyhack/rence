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
import { useState } from 'react';

const HomePage: React.FC = () => {
  const { isConnected } = useAppSelector((state) => state.wallet);
  const { data: platformStats, isLoading: statsLoading } = usePlatformStats();
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [benefitsLoaded, setBenefitsLoaded] = useState(false);

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
    <div className="min-h-screen bg-kaia-background relative">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-kaia-radial opacity-10 pointer-events-none"></div>
      
      {/* Hero Section */}
      <div className="hero-section relative">
        <div className="hero-bg"></div>
        
        <div className="hero-content">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="hero-title">
              <span className="block text-sm font-semibold uppercase tracking-wide text-kaia-primary mb-4">
                DeFi Meets Tradition
              </span>
              <span className="block text-gradient">
                Hemat
              </span>
              <span className="block text-kaia-text-primary">
                Thrift & Insurance
              </span>
            </h1>
            <p className="hero-subtitle">
              USDT-powered thrift savings and insurance platform on Kaia blockchain. 
              Join traditional communal savings with modern DeFi benefits.
            </p>
          </motion.div>

          <motion.div
            className="mt-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isConnected ? (
                <>
                  <Link
                    to="/dashboard"
                    className="btn-kaia-primary inline-flex items-center"
                  >
                    Go to Dashboard
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </Link>
                  <Link
                    to="/create-group"
                    className="btn-kaia-secondary inline-flex items-center"
                  >
                    Create Group
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/groups"
                    className="btn-kaia-primary inline-flex items-center"
                  >
                    Explore Groups
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </Link>
                  <button className="btn-kaia-secondary inline-flex items-center">
                    Connect Wallet
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>

        {/* Hero Image */}
        <motion.div
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-4xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="relative mx-auto w-full">
            <div className="relative rounded-kaia-md p-[2px] bg-kaia-gradient">
              <div className="relative rounded-kaia-md bg-kaia-card border border-kaia-border overflow-hidden backdrop-blur-kaia">
                {!heroLoaded && (
                  <div className="h-[280px] sm:h-[320px] lg:h-[360px] w-full animate-pulse bg-gradient-to-r from-kaia-surface to-kaia-card" />
                )}
                <img
                  className={`w-full ${heroLoaded ? 'block' : 'hidden'}`}
                  src="/images/hero-dashboard.png"
                  alt="Hemat Dashboard Preview"
                  onLoad={() => setHeroLoaded(true)}
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'https://dummyimage.com/800x500/111827/9ca3af.png&text=Dashboard+Preview';
                    setHeroLoaded(true);
                  }}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-kaia-primary/20 to-transparent" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Stats Section */}
      {platformStats && !statsLoading && (
        <motion.div
          className="section"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="container-kaia">
            <div className="text-center mb-16">
              <h2 className="section-title">Platform Statistics</h2>
              <p className="section-subtitle">
                Join thousands of users building wealth together through community savings
              </p>
            </div>
            
            <div className="grid-kaia-3">
              <div className="text-center">
                <div className="metric-card text-center">
                  <div className="metric-value text-kaia-primary">
                    {platformStats.totalGroups.toLocaleString()}
                  </div>
                  <div className="metric-label">Active Groups</div>
                </div>
              </div>
              <div className="text-center">
                <div className="metric-card text-center">
                  <div className="metric-value text-kaia-primary">
                    ${platformStats.totalVolume?.toLocaleString() || '0'}
                  </div>
                  <div className="metric-label">Total Volume</div>
                </div>
              </div>
              <div className="text-center">
                <div className="metric-card text-center">
                  <div className="metric-value text-kaia-primary">
                    {platformStats.totalUsers?.toLocaleString() || '0'}
                  </div>
                  <div className="metric-label">Members</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Features Section */}
      <div className="section">
        <div className="container-kaia">
          <div className="text-center mb-16">
            <h2 className="section-title">Three Ways to Save</h2>
            <p className="section-subtitle">
              Choose the savings model that best fits your financial goals and community needs.
            </p>
          </div>

          <div className="grid-kaia-3">
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
      <div className="section">
        <div className="container-kaia">
          <div className="grid-kaia-2 items-center">
            <div>
              <h2 className="section-title text-left">Why Choose Hemat?</h2>
              <p className="text-xl text-kaia-text-secondary mb-8 leading-relaxed">
                We combine the best of traditional community savings with modern blockchain technology 
                to create a secure, transparent, and profitable savings experience.
              </p>

              <div className="space-y-6">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    className="flex items-start"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <CheckCircleIcon className="flex-shrink-0 w-6 h-6 text-kaia-primary mt-1" />
                    <div className="ml-4">
                      <p className="text-lg text-kaia-text-secondary">{benefit}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              className="mt-12 lg:mt-0"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="relative rounded-kaia-md p-[2px] bg-kaia-gradient">
                <div className="relative rounded-kaia-md bg-kaia-card border border-kaia-border overflow-hidden backdrop-blur-kaia">
                  {!benefitsLoaded && (
                    <div className="h-[280px] sm:h-[320px] lg:h-[360px] w-full animate-pulse bg-gradient-to-r from-kaia-surface to-kaia-card" />
                  )}
                  <img
                    className={`w-full ${benefitsLoaded ? 'block' : 'hidden'}`}
                    src="/images/benefits-illustration.png"
                    alt="Hemat Benefits"
                    onLoad={() => setBenefitsLoaded(true)}
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.onerror = null;
                      target.src = 'https://dummyimage.com/800x500/111827/9ca3af.png&text=Benefits+Illustration';
                      setBenefitsLoaded(true);
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-kaia-primary/20 to-transparent" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="section">
        <div className="container-kaia">
          <div className="text-center mb-16">
            <h2 className="section-title">What Our Community Says</h2>
            <p className="section-subtitle">
              Real stories from real people building wealth with Hemat
            </p>
          </div>

          <div className="grid-kaia-3">
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
      <div className="section bg-kaia-primary">
        <div className="container-kaia-sm text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-kaia-background mb-6">
              <span className="block">Ready to start saving?</span>
              <span className="block">Join a group today.</span>
            </h2>
            <p className="text-xl leading-6 text-kaia-background/80 mb-8">
              Connect your wallet and join thousands of users building wealth together through community savings.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/groups"
                className="btn-secondary bg-kaia-background text-kaia-primary hover:bg-kaia-background/90"
              >
                Browse Groups
              </Link>
              <Link
                to="/create-group"
                className="btn-outline border-kaia-background text-kaia-background hover:bg-kaia-background hover:text-kaia-primary"
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