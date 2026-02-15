import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Droplets, ArrowLeft, Users, Store, Truck, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('customer');
  const [loading, setLoading] = useState(false);
  const { register: registerUser, user } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard when user is registered and logged in
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
    watch,
  } = useForm();

  const password = watch('password');

  const userRoles = [
    {
      id: 'customer',
      title: 'Customer',
      description: 'Order water from local providers',
      icon: Users,
      color: 'primary',
    },
    {
      id: 'provider',
      title: 'Provider',
      description: 'Supply water to customers in your area',
      icon: Store,
      color: 'secondary',
    },
    {
      id: 'delivery',
      title: 'Delivery Partner',
      description: 'Deliver water orders to customers',
      icon: Truck,
      color: 'warning',
    },
  ];

  const onSubmit = async (data) => {
    setLoading(true);
    
    try {
      const { confirmPassword, ...registrationData } = data;
      registrationData.role = selectedRole;
      
      const result = await registerUser(registrationData);
      
      if (!result.success) {
        setError('root', {
          message: result.message || 'Registration failed. Please try again.',
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        {/* Back to home link */}
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        {/* Logo and title */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Droplets className="h-8 w-8 text-water-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">JalSaathi</h1>
              <p className="text-sm text-gray-500">Har Pyaas Ka Saathi</p>
            </div>
          </div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              sign in to existing account
            </Link>
          </p>
        </div>

        <div className="card">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Role Selection */}
            <div className="form-group">
              <label className="form-label">I want to join as a</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {userRoles.map((role) => {
                  const Icon = role.icon;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRole(role.id)}
                      className={`p-4 border rounded-lg text-left transition-all ${
                        selectedRole === role.id
                          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <Icon className={`h-6 w-6 mb-2 ${
                        selectedRole === role.id ? 'text-primary-600' : 'text-gray-400'
                      }`} />
                      <h3 className={`font-medium ${
                        selectedRole === role.id ? 'text-primary-900' : 'text-gray-900'
                      }`}>
                        {role.title}
                      </h3>
                      <p className={`text-sm ${
                        selectedRole === role.id ? 'text-primary-600' : 'text-gray-600'
                      }`}>
                        {role.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name */}
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                className={`input-field ${errors.name ? 'input-error' : ''}`}
                placeholder="Enter your full name"
                {...register('name', {
                  required: 'Name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters',
                  },
                })}
              />
              {errors.name && (
                <p className="form-error">{errors.name.message}</p>
              )}
            </div>

            {/* Email and Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <div className="form-group">
                <label htmlFor="phone" className="form-label">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  className={`input-field ${errors.phone ? 'input-error' : ''}`}
                  placeholder="Enter your phone number"
                  {...register('phone', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^(\+91|91|0)?[6789]\d{9}$/,
                      message: 'Invalid phone number',
                    },
                  })}
                />
                {errors.phone && (
                  <p className="form-error">{errors.phone.message}</p>
                )}
              </div>
            </div>

            {/* Address (for customers and providers) */}
            {(selectedRole === 'customer' || selectedRole === 'provider') && (
              <>
                <div className="form-group">
                  <label htmlFor="street" className="form-label">
                    Street Address
                  </label>
                  <input
                    id="street"
                    type="text"
                    className={`input-field ${errors['address.street'] ? 'input-error' : ''}`}
                    placeholder="Enter your street address"
                    {...register('address.street', {
                      required: selectedRole !== 'delivery' ? 'Street address is required' : false,
                    })}
                  />
                  {errors['address.street'] && (
                    <p className="form-error">{errors['address.street'].message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="form-group">
                    <label htmlFor="area" className="form-label">
                      Area
                    </label>
                    <input
                      id="area"
                      type="text"
                      className={`input-field ${errors['address.area'] ? 'input-error' : ''}`}
                      placeholder="Enter your area"
                      {...register('address.area', {
                        required: selectedRole !== 'delivery' ? 'Area is required' : false,
                      })}
                    />
                    {errors['address.area'] && (
                      <p className="form-error">{errors['address.area'].message}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="city" className="form-label">
                      City
                    </label>
                    <input
                      id="city"
                      type="text"
                      className={`input-field ${errors['address.city'] ? 'input-error' : ''}`}
                      placeholder="Enter your city"
                      {...register('address.city', {
                        required: selectedRole !== 'delivery' ? 'City is required' : false,
                      })}
                    />
                    {errors['address.city'] && (
                      <p className="form-error">{errors['address.city'].message}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="pincode" className="form-label">
                      Pincode
                    </label>
                    <input
                      id="pincode"
                      type="text"
                      className={`input-field ${errors['address.pincode'] ? 'input-error' : ''}`}
                      placeholder="Enter pincode"
                      {...register('address.pincode', {
                        required: selectedRole !== 'delivery' ? 'Pincode is required' : false,
                        pattern: {
                          value: /^[1-9][0-9]{5}$/,
                          message: 'Invalid pincode',
                        },
                      })}
                    />
                    {errors['address.pincode'] && (
                      <p className="form-error">{errors['address.pincode'].message}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Provider-specific fields */}
            {selectedRole === 'provider' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <label htmlFor="businessName" className="form-label">
                      Business Name
                    </label>
                    <input
                      id="businessName"
                      type="text"
                      className={`input-field ${errors.businessName ? 'input-error' : ''}`}
                      placeholder="Enter your business name"
                      {...register('businessName', {
                        required: selectedRole === 'provider' ? 'Business name is required' : false,
                      })}
                    />
                    {errors.businessName && (
                      <p className="form-error">{errors.businessName.message}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="pricePerCan" className="form-label">
                      Price per Can (₹)
                    </label>
                    <input
                      id="pricePerCan"
                      type="number"
                      min="1"
                      step="0.01"
                      className={`input-field ${errors.pricePerCan ? 'input-error' : ''}`}
                      placeholder="Enter price per can"
                      {...register('pricePerCan', {
                        required: selectedRole === 'provider' ? 'Price per can is required' : false,
                        min: {
                          value: 1,
                          message: 'Price must be greater than 0',
                        },
                      })}
                    />
                    {errors.pricePerCan && (
                      <p className="form-error">{errors.pricePerCan.message}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`input-field pr-10 ${errors.password ? 'input-error' : ''}`}
                    placeholder="Create a password"
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

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`input-field pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                    placeholder="Confirm your password"
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (value) =>
                        value === password || 'Passwords do not match',
                    })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="form-error">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Terms and conditions */}
            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                {...register('terms', {
                  required: 'You must accept the terms and conditions',
                })}
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                I agree to the{' '}
                <a href="#" className="text-primary-600 hover:text-primary-500">
                  Terms and Conditions
                </a>{' '}
                and{' '}
                <a href="#" className="text-primary-600 hover:text-primary-500">
                  Privacy Policy
                </a>
              </label>
            </div>
            {errors.terms && (
              <p className="form-error">{errors.terms.message}</p>
            )}

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
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;