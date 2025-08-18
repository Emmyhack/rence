import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  UsersIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  SparklesIcon,
  RocketLaunchIcon,
  BanknotesIcon,
  TrophyIcon,
  GlobeAltIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

import { useAppSelector } from '@hooks/redux';
import { usePlatformStats } from '@hooks/api/usePlatformStats';
import TestimonialCard from '@components/ui/TestimonialCard';

const HomePage: React.FC = () => {
  const { isConnected } = useAppSelector((state) => state.wallet);
  const { data: platformStats, isLoading: statsLoading } = usePlatformStats();
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [benefitsLoaded, setBenefitsLoaded] = useState(false);

  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, 50]);
  const y2 = useTransform(scrollY, [0, 300], [0, -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.8]);

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.6, -0.05, 0.01, 0.99] }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const features = [
    {
      icon: <BanknotesIcon className="w-8 h-8" />,
      title: 'Basic Groups',
      subtitle: 'Free Community Savings',
      description: 'Start your savings journey with our free basic groups. Perfect for beginners exploring community-based savings.',
      benefits: ['No subscription fee', 'Up to 5 members', '7-day cycles', 'Platform fee on payouts'],
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'from-emerald-500/10 to-teal-600/10',
    },
    {
      icon: <ShieldCheckIcon className="w-8 h-8" />,
      title: 'Trust Groups',
      subtitle: 'Stake-Based Security',
      description: 'Enhanced security with stake requirements and creator benefits. Build trust through commitment.',
      benefits: ['10 USDT subscription', 'Up to 30 members', 'Creator fee share', 'Stake protection'],
      color: 'from-purple-500 to-indigo-600',
      bgColor: 'from-purple-500/10 to-indigo-600/10',
    },
    {
      icon: <TrophyIcon className="w-8 h-8" />,
      title: 'Super-Trust Groups',
      subtitle: 'Premium Experience',
      description: 'Our most advanced offering with maximum benefits, higher limits, and premium features.',
      benefits: ['25 USDT subscription', 'Up to 100 members', '90% fee share', 'Premium features'],
      color: 'from-amber-500 to-orange-600',
      bgColor: 'from-amber-500/10 to-orange-600/10',
    },
  ];

  const benefits = [
    {
      icon: <LockClosedIcon className="w-6 h-6" />,
      title: 'USDT Stability',
      description: 'Protect against volatility with stable USDT-based savings',
    },
    {
      icon: <SparklesIcon className="w-6 h-6" />,
      title: 'Smart Contracts',
      description: 'Eliminate trust issues with transparent blockchain automation',
    },
    {
      icon: <ChartBarIcon className="w-6 h-6" />,
      title: 'Yield Generation',
      description: 'Earn passive income on idle funds through DeFi strategies',
    },
    {
      icon: <ShieldCheckIcon className="w-6 h-6" />,
      title: 'Insurance Coverage',
      description: 'Community-backed insurance pool for emergency protection',
    },
    {
      icon: <GlobeAltIcon className="w-6 h-6" />,
      title: 'Real-time Tracking',
      description: 'Monitor your savings and earnings with live blockchain data',
    },
    {
      icon: <UsersIcon className="w-6 h-6" />,
      title: 'Mobile Optimized',
      description: 'Access your savings anywhere with our mobile-first design',
    },
  ];

  const testimonials = [
    {
      name: 'Adaora Okafor',
      role: 'Small Business Owner',
      content: 'Hemat helped me save consistently for my business expansion. The blockchain transparency gives me confidence.',
    },
    {
      name: 'Kwame Asante',
      role: 'Software Developer',
      content: 'I love earning yield while participating in traditional savings. The best of both worlds!',
    },
    {
      name: 'Fatima Abdul',
      role: 'Teacher',
      content: 'The insurance feature saved me during a medical emergency. The community support is amazing.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.6, 0.3, 0.6],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      {/* Hero Section */}
      <motion.section 
        className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8"
        style={{ opacity }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
            <motion.div 
              className="lg:col-span-6 text-center lg:text-left"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <motion.div variants={fadeInUp}>
                <motion.span 
                  className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-purple-600/20 to-cyan-600/20 text-cyan-300 border border-cyan-500/30 mb-6"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <SparklesIcon className="w-4 h-4 mr-2" />
                  DeFi Meets Traditional Savings
                </motion.span>
              </motion.div>

              <motion.h1 
                className="text-5xl lg:text-7xl font-bold mb-8"
                variants={fadeInUp}
              >
                <span className="block text-white mb-2">Hemat</span>
                <span className="block bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Thrift & Insurance
                </span>
              </motion.h1>

              <motion.p 
                className="text-xl text-gray-300 mb-10 max-w-2xl"
                variants={fadeInUp}
              >
                USDT-powered thrift savings and insurance platform on Kaia blockchain. 
                Join traditional communal savings with modern DeFi benefits and earn yield on your savings.
              </motion.p>

              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
                variants={fadeInUp}
              >
                {isConnected ? (
                  <>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link
                        to="/dashboard"
                        className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-2xl text-white bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 shadow-2xl shadow-purple-500/25 transition-all duration-300"
                      >
                        <RocketLaunchIcon className="w-5 h-5 mr-2" />
                        Go to Dashboard
                        <ArrowRightIcon className="w-5 h-5 ml-2" />
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link
                        to="/create-group"
                        className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-2xl text-white border-2 border-purple-500/50 hover:bg-purple-500/10 transition-all duration-300"
                      >
                        Create Group
                      </Link>
                    </motion.div>
                  </>
                ) : (
                  <>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link
                        to="/groups"
                        className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-2xl text-white bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 shadow-2xl shadow-purple-500/25 transition-all duration-300"
                      >
                        <UsersIcon className="w-5 h-5 mr-2" />
                        Explore Groups
                        <ArrowRightIcon className="w-5 h-5 ml-2" />
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <button className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-2xl text-white border-2 border-cyan-500/50 hover:bg-cyan-500/10 transition-all duration-300">
                        Connect Wallet
                      </button>
                    </motion.div>
                  </>
                )}
              </motion.div>
            </motion.div>

            <motion.div
              className="lg:col-span-6 mt-16 lg:mt-0"
              style={{ y: y1 }}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
            >
              <div className="relative">
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-cyan-600/20 rounded-3xl blur-3xl"
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-2 shadow-2xl">
                  {!heroLoaded && (
                    <div className="h-[400px] w-full animate-pulse bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl" />
                  )}
                  <img
                    className={`w-full rounded-2xl ${heroLoaded ? 'block' : 'hidden'}`}
                    src="/images/hero-dashboard.svg"
                    alt="Hemat Dashboard Preview"
                    onLoad={() => setHeroLoaded(true)}
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.onerror = null;
                      target.src = '/images/hero-dashboard.svg';
                      setHeroLoaded(true);
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Stats Section */}
      {platformStats && (
        <motion.section
          className="py-20 bg-gradient-to-r from-purple-600/10 to-cyan-600/10 backdrop-blur-sm"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-white mb-4">
                Trusted by the Community
              </h2>
              <p className="text-xl text-gray-300">
                Join thousands of users building wealth together
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { label: 'Active Groups', value: platformStats.totalGroups, icon: UsersIcon },
                { label: 'Total Volume', value: `$${platformStats.totalVolume?.toLocaleString() || '0'}`, icon: CurrencyDollarIcon },
                { label: 'Members', value: platformStats.totalUsers?.toLocaleString() || '0', icon: GlobeAltIcon },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="relative group"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-cyan-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
                  <div className="relative bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 text-center">
                    <stat.icon className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                    <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
                    <div className="text-gray-300">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Choose Your Savings Model
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              From free basic groups to premium super-trust communities, we have the perfect savings solution for everyone.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="relative group"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02 }}
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.bgColor} rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300`} />
                <div className="relative bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 h-full">
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${feature.color} mb-6`}>
                    {feature.icon}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-cyan-400 font-medium mb-4">{feature.subtitle}</p>
                  <p className="text-gray-300 mb-6">{feature.description}</p>
                  
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-center text-gray-300">
                        <CheckCircleIcon className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-white mb-6">
                Why Choose Hemat?
              </h2>
              <p className="text-xl text-gray-300 mb-10">
                We combine the best of traditional community savings with modern blockchain technology 
                to create a secure, transparent, and profitable savings experience.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit.title}
                    className="flex items-start space-x-4"
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <div className="flex-shrink-0 p-2 bg-gradient-to-r from-purple-600/20 to-cyan-600/20 rounded-lg">
                      {benefit.icon}
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">{benefit.title}</h4>
                      <p className="text-gray-400 text-sm">{benefit.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="mt-16 lg:mt-0"
              style={{ y: y2 }}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="relative">
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 rounded-3xl blur-3xl"
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                  }}
                />
                <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-2 shadow-2xl">
                  {!benefitsLoaded && (
                    <div className="h-[400px] w-full animate-pulse bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl" />
                  )}
                  <img
                    className={`w-full rounded-2xl ${benefitsLoaded ? 'block' : 'hidden'}`}
                    src="/images/benefits-illustration.svg"
                    alt="Hemat Benefits"
                    onLoad={() => setBenefitsLoaded(true)}
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.onerror = null;
                      target.src = '/images/benefits-illustration.svg';
                      setBenefitsLoaded(true);
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-r from-slate-800/50 to-purple-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              What Our Community Says
            </h2>
            <p className="text-xl text-gray-300">
              Real stories from real people building wealth with Hemat
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-cyan-600/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
                  <div className="relative">
                    <TestimonialCard 
                      quote={testimonial.content}
                      author={testimonial.name}
                      role={testimonial.role}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.div
              className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/30 mb-8"
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <SparklesIcon className="w-5 h-5 text-cyan-400 mr-2" />
              <span className="text-cyan-300 font-medium">Ready to start your journey?</span>
            </motion.div>
            
            <h2 className="text-5xl font-bold text-white mb-6">
              <span className="block">Join the Future of</span>
              <span className="block bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Community Savings
              </span>
            </h2>
            
            <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
              Connect your wallet and join thousands of users building wealth together through 
              community savings powered by blockchain technology.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/groups"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-2xl text-white bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 shadow-2xl shadow-purple-500/25 transition-all duration-300"
                >
                  <UsersIcon className="w-5 h-5 mr-2" />
                  Browse Groups
                </Link>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/create-group"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-2xl text-white border-2 border-cyan-500/50 hover:bg-cyan-500/10 transition-all duration-300"
                >
                  <RocketLaunchIcon className="w-5 h-5 mr-2" />
                  Create Group
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;