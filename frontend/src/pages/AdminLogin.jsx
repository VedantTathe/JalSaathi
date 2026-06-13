import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, ShieldCheck, Droplets, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import LanguageToggle from '../components/LanguageToggle';

const AdminLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect to admin dashboard when user is logged in
  useEffect(() => {
    if (user) {
      navigate('/myadminpage', { replace: true });
    }
  }, [user, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    mode: 'onSubmit' // Ensure it doesn't validate on change to prevent any re-render lag
  });

  const onSubmit = async (data) => {
    setLoading(true);
    
    try {
      const result = await login(data.email, data.password);
      
      if (!result.success) {
        setError('root', {
          message: result.message || 'Authentication failed. Invalid credentials.',
        });
      }
    } catch (error) {
      setError('root', {
        message: 'A network error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex relative">
      {/* Top right actions */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center space-x-3">
        <LanguageToggle />
        <Link 
          to="/register/provider"
          className="inline-flex items-center justify-center px-4 py-2 border border-primary-200 rounded-md shadow-sm text-sm font-medium text-primary-600 bg-white hover:bg-gray-50 transition-colors"
        >
          Become a Provider
        </Link>
      </div>

      {/* Left side - Decorative/Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 items-center justify-center overflow-hidden">
        {/* Abstract water/wave shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute w-full h-full fill-current text-white">
            <path d="M0 100 C 20 0 50 0 100 100 Z" />
            <path d="M0 50 C 40 80 60 20 100 50 L 100 100 L 0 100 Z" className="opacity-50" />
          </svg>
        </div>
        
        <div className="relative z-10 text-center px-12">
          <div className="inline-flex items-center justify-center p-4 bg-white/10 rounded-2xl backdrop-blur-sm mb-8 ring-1 ring-white/20 shadow-2xl">
            <ShieldCheck className="h-16 w-16 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">JalSaathi Admin Portal</h1>
          <p className="text-lg text-primary-100 max-w-md mx-auto font-light leading-relaxed">
            Secure management interface for overseeing operations, analyzing performance, and ensuring seamless water delivery across the network.
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 relative bg-white">
        {/* Mobile Header (Hidden on large screens) */}
        <div className="absolute top-8 left-8 flex items-center gap-2 lg:hidden">
          <div className="bg-primary-600 p-2 rounded-xl shadow-lg shadow-primary-200">
            <Droplets className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">JalSaathi</span>
        </div>

        <div className="w-full max-w-md space-y-10">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <Lock className="h-5 w-5 text-primary-600" />
              <span className="text-sm font-bold tracking-wider text-primary-600 uppercase">Secure Access</span>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Admin Login
            </h2>
            <p className="mt-2 text-sm text-gray-500 font-medium">
              Please enter your administrator credentials to continue
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            {errors.root && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm animate-fade-in">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ShieldCheck className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{errors.root.message}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Administrator Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@example.com"
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Please enter a valid email address'
                      }
                    })}
                    className={`block w-full px-4 py-3.5 bg-gray-50 border ${
                      errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-primary-500 focus:border-primary-500'
                    } rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all duration-200 sm:text-sm`}
                  />
                  {errors.email && (
                    <p className="mt-2 text-sm font-medium text-red-500 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-red-500"></span>
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register('password', { 
                      required: 'Password is required'
                    })}
                    className={`block w-full px-4 py-3.5 bg-gray-50 border ${
                      errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-primary-500 focus:border-primary-500'
                    } rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all duration-200 sm:text-sm pr-12`}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm font-medium text-red-500 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-red-500"></span>
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="small" />
                    <span className="ml-2">Authenticating...</span>
                  </>
                ) : (
                  'Secure Sign In'
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-8 pt-8 border-t border-gray-100">
            <p className="text-center text-xs font-medium text-gray-400">
              &copy; {new Date().getFullYear()} JalSaathi. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
