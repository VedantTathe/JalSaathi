import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Droplets, ArrowLeft, Mail, Key } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
  const [otpSent, setOtpSent] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard when user is logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    
    try {
      const result = await login(data.email, data.password);
      
      if (!result.success) {
        setError('root', {
          message: result.message || 'Login failed. Please try again.',
        });
      }
      // Navigation will happen automatically via useEffect when user state updates
    } catch (error) {
      setError('root', {
        message: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle sending OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    if (!otpEmail) {
      setOtpError('Please enter your email address');
      return;
    }

    setOtpLoading(true);
    setOtpError('');
    setOtpSuccess('');

    try {
      const response = await api.post('/auth/login/send-otp', { email: otpEmail });
      
      if (response.success) {
        setOtpSent(true);
        setOtpSuccess('OTP sent to your email. Please check your inbox.');
      } else {
        setOtpError(response.message || 'Failed to send OTP');
      }
    } catch (error) {
      setOtpError(error.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle verifying OTP and logging in
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (!otpCode || otpCode.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP');
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    try {
      const response = await api.post('/auth/login/verify-otp', { 
        email: otpEmail, 
        otp: otpCode 
      });
      
      if (response.success) {
        // Store token and user data
        localStorage.setItem('jalsaathi_token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Reload to trigger auth context update
        window.location.href = '/dashboard';
      } else {
        setOtpError(response.message || 'Invalid OTP');
      }
    } catch (error) {
      setOtpError(error.response?.data?.message || 'OTP verification failed. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Reset OTP states when switching login methods
  const handleLoginMethodChange = (method) => {
    setLoginMethod(method);
    setOtpSent(false);
    setOtpEmail('');
    setOtpCode('');
    setOtpError('');
    setOtpSuccess('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md w-full">
        {/* Back to home link */}
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        {/* Logo and title */}
        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-2 mb-4">
            <Droplets className="h-8 w-8 text-water-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">JalSaathi</h1>
              <p className="text-sm text-gray-500">Har Pyaas Ka Saathi</p>
            </div>
          </div>
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/register/customer"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              create a new account
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md w-full">
        <div className="card">
          {/* Login Method Toggle */}
          <div className="mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => handleLoginMethodChange('password')}
                className={`flex items-center justify-center py-3 px-4 rounded-md text-sm font-medium transition-colors min-h-[48px] ${
                  loginMethod === 'password'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Key className="h-4 w-4 mr-2" />
                With Password
              </button>
              <button
                type="button"
                onClick={() => handleLoginMethodChange('otp')}
                className={`flex items-center justify-center py-3 px-4 rounded-md text-sm font-medium transition-colors min-h-[48px] ${
                  loginMethod === 'otp'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Mail className="h-4 w-4 mr-2" />
                With OTP
              </button>
            </div>
          </div>

          {/* Password Login Form */}
          {loginMethod === 'password' && (
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {/* Email */}
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`input-field ${errors.email ? 'input-error' : ''}`}
                  placeholder="Enter your email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Invalid email address',
                    },
                  })}
                />
                {errors.email && (
                  <p className="form-error">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={`input-field pr-10 ${errors.password ? 'input-error' : ''}`}
                    placeholder="Enter your password"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters',
                      },
                    })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="form-error">{errors.password.message}</p>
                )}
              </div>

              {/* Remember me and Forgot password */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Remember me
                  </label>
                </div>
                
                <div className="text-sm sm:text-right">
                  <Link
                    to="/forgot-password"
                    className="font-medium text-primary-600 hover:text-primary-500"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>

              {/* Root error message */}
              {errors.root && (
                <div className="rounded-md bg-error-50 p-4">
                  <p className="text-sm text-error-700">{errors.root.message}</p>
                </div>
              )}

              {/* Submit button */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="small" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* OTP Login Form */}
          {loginMethod === 'otp' && (
            <div className="space-y-6">
              {!otpSent ? (
                <form onSubmit={handleSendOTP} className="space-y-6">
                  <div className="form-group">
                    <label htmlFor="otp-email" className="form-label">
                      Email address
                    </label>
                    <input
                      id="otp-email"
                      type="email"
                      autoComplete="email"
                      className="input-field"
                      placeholder="Enter your email"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      required
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      We'll send a one-time password to your email
                    </p>
                  </div>

                  {otpError && (
                    <div className="rounded-md bg-error-50 p-4">
                      <p className="text-sm text-error-700">{otpError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="btn-primary w-full"
                  >
                    {otpLoading ? (
                      <>
                        <LoadingSpinner size="small" />
                        Sending OTP...
                      </>
                    ) : (
                      'Send OTP'
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-6">
                  <div className="form-group">
                    <label htmlFor="otp-code" className="form-label">
                      Enter OTP
                    </label>
                    <input
                      id="otp-code"
                      type="text"
                      maxLength={6}
                      className="input-field text-center text-xl sm:text-2xl font-bold tracking-[0.3em] sm:tracking-widest"
                      placeholder="000000"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Enter the 6-digit OTP sent to {otpEmail}
                    </p>
                  </div>

                  {otpSuccess && (
                    <div className="rounded-md bg-success-50 p-4">
                      <p className="text-sm text-success-700">{otpSuccess}</p>
                    </div>
                  )}

                  {otpError && (
                    <div className="rounded-md bg-error-50 p-4">
                      <p className="text-sm text-error-700">{otpError}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <button
                      type="submit"
                      disabled={otpLoading}
                      className="btn-primary w-full"
                    >
                      {otpLoading ? (
                        <>
                          <LoadingSpinner size="small" />
                          Verifying...
                        </>
                      ) : (
                        'Verify & Login'
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={otpLoading}
                      className="w-full text-sm text-primary-600 hover:text-primary-500 font-medium py-2"
                    >
                      Resend OTP
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpCode('');
                        setOtpError('');
                        setOtpSuccess('');
                      }}
                      className="w-full text-sm text-gray-600 hover:text-gray-900 py-2"
                    >
                      Change email
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;