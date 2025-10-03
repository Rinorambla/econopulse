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
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-white">
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
