'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const { signIn, signUp, loading: authLoading } = useAuth();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        // Sign In
        const result = await signIn(formData.email, formData.password);
        if (result.success) {
          setSuccess('Successfully signed in! Redirecting...');
          // Redirect immediately after successful login
          router.push('/en/dashboard');
        } else {
          // Check if it's an email confirmation issue
          if (result.error?.includes('Email not confirmed') || 
              result.error?.includes('email_not_confirmed') ||
              result.error?.includes('not_confirmed')) {
            setError('Email not confirmed. Confirming automatically...');
            
            // Try to confirm email automatically for development
            try {
              const confirmResponse = await fetch('/api/auth/confirm-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email })
              });
              
              const confirmResult = await confirmResponse.json();
              
              if (confirmResult.confirmed) {
                setSuccess('Email confirmed! Trying login again...');
                setTimeout(async () => {
                  const retryResult = await signIn(formData.email, formData.password);
                  if (retryResult.success) {
                    setSuccess('Successfully signed in! Redirecting...');
                    router.push('/en/dashboard');
                  } else {
                    setError(retryResult.error || 'Login failed after confirmation');
                  }
                }, 2000);
              } else {
                setError('Failed to confirm email automatically. Please contact support.');
              }
            } catch (confirmErr) {
              setError('Auto-confirmation failed. Please contact support.');
            }
          } else {
            setError(result.error || 'Failed to sign in');
          }
        }
      } else {
        // Sign Up
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        const result = await signUp(formData.email, formData.password, formData.fullName);
        if (result.success) {
          if (result.needsConfirmation) {
            setSuccess('Account created! Auto-confirming email...');
            
            // Auto-confirm email for development
            try {
              const confirmResponse = await fetch('/api/auth/confirm-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email })
              });
              
              const confirmResult = await confirmResponse.json();
              
              if (confirmResult.confirmed) {
                setSuccess('Account created and confirmed! You can now sign in.');
                setTimeout(() => setIsLogin(true), 2000);
              } else {
                setSuccess('Account created! Please check your email to confirm your account.');
              }
            } catch (confirmErr) {
              setSuccess('Account created! Please check your email to confirm your account.');
            }
          } else {
            setSuccess('Account created successfully! Redirecting to AI Pulse...');
            router.push('/en/ai-pulse');
          }
        } else {
          setError(result.error || 'Failed to create account');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Navigation is provided globally by [locale]/layout.tsx */}
          </div>
        </div>
      </nav>

      {/* Login Form */}
      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        {/* What We Offer Section */}
        <div className="sm:mx-auto sm:w-full sm:max-w-4xl mb-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Welcome to <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">EconoPulse</span>
            </h1>
            <p className="text-lg text-gray-300">
              Advanced AI-powered financial analysis platform for smart investors
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 ring-1 ring-white/10">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">Real-Time Dashboard</h3>
              <p className="text-gray-400 text-sm">Live market data, ETF heatmaps, and options flow analysis</p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 ring-1 ring-white/10">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">AI Portfolio Builder</h3>
              <p className="text-gray-400 text-sm">Dynamic portfolio generation with economic cycle analysis</p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 ring-1 ring-white/10">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">EconoAI Assistant</h3>
              <p className="text-gray-400 text-sm">Ask anything about stocks, sectors, earnings & get instant answers</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl p-4 ring-1 ring-blue-500/20 text-center">
            <p className="text-white/90 text-sm">
              <span className="font-semibold">🎁 Start Free:</span> Get instant access to Dashboard, Market DNA, and Visual AI. 
              <span className="text-blue-400 font-medium"> Upgrade anytime for premium AI features.</span>
            </p>
          </div>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-4 text-center text-2xl font-bold leading-9 tracking-tight text-white">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-300">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="font-semibold leading-6 text-blue-400 hover:text-blue-300"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-md">
              <p className="text-red-200 text-sm">{error}</p>
              {error.includes('Auth unavailable') && (
                <div className="mt-2 p-2 bg-blue-900/30 border border-blue-400 rounded">
                  <p className="text-blue-200 text-xs">
                    🔧 <strong>Setup richiesto:</strong> Le variabili d'ambiente Supabase non sono configurate su Vercel.
                    <br />
                    📖 Segui la guida in <code>SUPABASE_SETUP.md</code> per configurare l'autenticazione (5 minuti).
                  </p>
                </div>
              )}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-900/50 border border-green-500 rounded-md">
              <p className="text-green-200 text-sm">{success}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium leading-6 text-white">
                  Full Name
                </label>
                <div className="mt-2">
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required={!isLogin}
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-0 py-1.5 px-3 bg-white/10 text-white shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-white">
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-0 py-1.5 px-3 bg-white/10 text-white shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium leading-6 text-white">
                  Password
                </label>
                {isLogin && (
                  <div className="text-sm">
                    <Link href="/en/forgot-password" className="font-semibold text-blue-400 hover:text-blue-300">
                      Forgot password?
                    </Link>
                  </div>
                )}
              </div>
              <div className="mt-2 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-0 py-1.5 px-3 pr-10 bg-white/10 text-white shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium leading-6 text-white">
                  Confirm Password
                </label>
                <div className="mt-2">
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-0 py-1.5 px-3 bg-white/10 text-white shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : (isLogin ? 'Sign in' : 'Sign up')}
              </button>
            </div>
          </form>

          <p className="mt-10 text-center text-sm text-gray-400">
            By {isLogin ? 'signing in' : 'signing up'}, you agree to our{' '}
            <Link href="/en/terms" className="font-semibold leading-6 text-blue-400 hover:text-blue-300">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/en/privacy" className="font-semibold leading-6 text-blue-400 hover:text-blue-300">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
