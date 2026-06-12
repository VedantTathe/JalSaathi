import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Droplets, ArrowLeft, Users, Store, Truck, Shield, MapPin, Navigation } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'react-hot-toast';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const Register = () => {
  const { role } = useParams(); // Get role from URL parameter
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState(role || 'customer');
  const [loading, setLoading] = useState(false);
  const { register: registerUser, user, checkAuthStatus } = useAuth();
  const navigate = useNavigate();
  
  // OTP verification states
  const [otpSent, setOtpSent] = useState(false);
  const [registrationData, setRegistrationData] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  
  // Map state for provider location
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // India center
  const [mapZoom, setMapZoom] = useState(5);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null });
  const [serviceRadius, setServiceRadius] = useState(5);

  // Redirect to dashboard when user is registered and logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Update selectedRole when URL parameter changes
  useEffect(() => {
    if (role && (role === 'customer' || role === 'provider')) {
      setSelectedRole(role);
    }
  }, [role]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
    setValue,
  } = useForm();

  const password = watch('password');

  // Location Marker Component for map click handling
  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setMarkerPosition([lat, lng]);
        setCoordinates({ latitude: lat, longitude: lng });
        
        // Reverse geocode using backend proxy to avoid CORS
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'JalSaathi/1.0'
          }
        })
          .then(res => res.json())
          .then(data => {
            const addr = data.address || {};
            
            // Auto-fill using setValue from react-hook-form
            if (addr.road || addr.suburb) {
              setValue('address.street', addr.road || addr.suburb || '');
            }
            if (addr.neighbourhood || addr.suburb || addr.quarter) {
              setValue('address.area', addr.neighbourhood || addr.suburb || addr.quarter || '');
            }
            if (addr.city || addr.town || addr.village) {
              setValue('address.city', addr.city || addr.town || addr.village || '');
            }
            if (addr.postcode) {
              setValue('address.pincode', addr.postcode || '');
            }
          })
          .catch(err => {
            console.error('Geocoding error:', err);
          });
      },
    });

    return markerPosition ? <Marker position={markerPosition} /> : null;
  };

  // Get current location from GPS
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    toast.loading('Getting your location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter([latitude, longitude]);
        setMapZoom(15);
        setMarkerPosition([latitude, longitude]);
        setCoordinates({ latitude, longitude });
        
        toast.dismiss();

        // Reverse geocode with proper headers
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'JalSaathi/1.0'
          }
        })
          .then(res => res.json())
          .then(data => {
            const addr = data.address || {};
            
            // Auto-fill address fields
            if (addr.road || addr.suburb) {
              setValue('address.street', addr.road || addr.suburb || '');
            }
            if (addr.neighbourhood || addr.suburb || addr.quarter) {
              setValue('address.area', addr.neighbourhood || addr.suburb || addr.quarter || '');
            }
            if (addr.city || addr.town || addr.village) {
              setValue('address.city', addr.city || addr.town || addr.village || '');
            }
            if (addr.postcode) {
              setValue('address.pincode', addr.postcode || '');
            }
          })
          .catch(err => {
            console.error('Geocoding error:', err);
          })
          .finally(() => setGettingLocation(false));
      },
      (error) => {
        toast.dismiss();
        setGettingLocation(false);
        
        let errorMessage = 'Unable to get your location';
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Location permission denied. Please enable location access.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = 'Location information unavailable.';
        } else if (error.code === error.TIMEOUT) {
          errorMessage = 'Location request timed out.';
        }
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

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
  ];

  const onSubmit = async (data) => {
    setLoading(true);
    
    try {
      const { confirmPassword, ...regData } = data;
      regData.role = selectedRole;
      
      // For customers, remove address data since it's not collected during registration
      if (selectedRole === 'customer') {
        delete regData.address;
      }
      
      // Add coordinates and format data for providers
      if (selectedRole === 'provider') {
        // Make coordinates optional but recommended
        if (coordinates.latitude && coordinates.longitude) {
          regData.coordinates = coordinates;
        }
        regData.serviceRadius = parseFloat(serviceRadius);
        
        // Format minimumOrder as number
        if (regData.minimumOrder) {
          regData.minimumOrder = parseInt(regData.minimumOrder);
        }
        
        // Ensure operatingHours has default values if not provided
        if (!regData.operatingHours) {
          regData.operatingHours = { open: '08:00', close: '20:00' };
        }
        
        // Clean up empty payment details
        if (regData.bankDetails) {
          const hasAnyBankDetail = Object.values(regData.bankDetails).some(val => val);
          if (!hasAnyBankDetail) {
            delete regData.bankDetails;
          }
        }
        
        // Remove empty UPI fields
        if (!regData.upiId) delete regData.upiId;
        if (!regData.upiNumber) delete regData.upiNumber;
      }
      
      // Store registration data and send OTP
      setRegistrationData(regData);
      
      // Import api from services
      const { authApi } = await import('../services/api');
      const response = await authApi.sendRegistrationOTP(regData);
      
      if (response.success) {
        setOtpSent(true);
        toast.success('OTP sent to your email!');
      } else {
        setError('root', {
          message: response.message || 'Failed to send OTP. Please try again.',
        });
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send OTP. Please try again.';
      setError('root', {
        message,
      });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (!otpCode || otpCode.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP');
      return;
    }
    
    setOtpLoading(true);
    setOtpError('');
    
    try {
      const { authApi } = await import('../services/api');
      const response = await authApi.verifyRegistrationOTP(
        registrationData.email,
        otpCode,
        registrationData
      );
      
      if (response.success && response.data) {
        // Store token
        localStorage.setItem('jalsaathi_token', response.data.token);
        setOtpSuccess('Registration successful! Redirecting...');
        toast.success('Registration successful!');
        
        // Navigate immediately to dashboard (AuthContext will verify token on mount)
        navigate('/dashboard', { replace: true });
      } else {
        setOtpError(response.message || 'Invalid OTP. Please try again.');
        toast.error(response.message || 'Invalid OTP');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to verify OTP. Please try again.';
      setOtpError(message);
      toast.error(message);
    } finally {
      setOtpLoading(false);
    }
  };
  
  const handleResendOTP = async () => {
    setOtpLoading(true);
    setOtpError('');
    setOtpSuccess('');
    
    try {
      const { authApi } = await import('../services/api');
      const response = await authApi.resendOTP(registrationData.email);
      
      if (response.success) {
        setOtpSuccess('OTP resent successfully!');
        toast.success('OTP resent to your email!');
        setOtpCode('');
      } else {
        setOtpError(response.message || 'Failed to resend OTP');
        toast.error(response.message || 'Failed to resend OTP');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to resend OTP';
      setOtpError(message);
      toast.error(message);
    } finally {
      setOtpLoading(false);
    }
  };
  
  const handleChangeEmail = () => {
    setOtpSent(false);
    setOtpCode('');
    setOtpError('');
    setOtpSuccess('');
    setRegistrationData(null);
  };

  return (
    <div className="min-h-screen gradient-water py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl w-full">
        {/* Back to home link */}
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-white/80 hover:text-white mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        {/* Logo and title */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center space-x-2 mb-4 bg-white/20 p-3 rounded-full backdrop-blur-sm">
            <Droplets className="h-8 w-8 text-white" />
            <div>
              <h1 className="text-2xl font-bold text-white">JalSaathi</h1>
              <p className="text-sm text-white/80">Har Pyaas Ka Saathi</p>
            </div>
          </div>
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-white px-2">
            {role === 'provider' ? 'Become a Provider' : role === 'customer' ? 'Create Customer Account' : 'Create your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-white/80">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-white hover:text-white/80 underline"
            >
              sign in to existing account
            </Link>
          </p>
        </div>

        <div className="card premium-glass-card text-gray-900 relative z-10">
          {/* OTP Verification Screen */}
          {otpSent ? (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 mb-4">
                  <Shield className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Verify Your Email</h3>
                <p className="text-sm text-gray-600">
                  We've sent a 6-digit OTP to <span className="font-semibold">{registrationData?.email}</span>
                </p>
              </div>

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
                    OTP is valid for 10 minutes
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
                    disabled={otpLoading || otpCode.length !== 6}
                    className="btn-primary w-full"
                  >
                    {otpLoading ? (
                      <>
                        <LoadingSpinner size="small" />
                        Verifying...
                      </>
                    ) : (
                      'Verify & Complete Registration'
                    )}
                  </button>

                  <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 text-sm">
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={otpLoading}
                      className="text-primary-600 hover:text-primary-500 font-medium"
                    >
                      Resend OTP
                    </button>
                    <span className="hidden sm:inline text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleChangeEmail}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Change Email
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Role Selection - only show if no role specified in URL */}
            {!role && (
              <div className="form-group">
                <label className="form-label">I want to join as a</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {userRoles.map((roleOption) => {
                    const Icon = roleOption.icon;
                    return (
                      <button
                        key={roleOption.id}
                        type="button"
                        onClick={() => setSelectedRole(roleOption.id)}
                        className={`p-4 sm:p-5 border rounded-xl text-left transition-all min-h-[140px] ${
                          selectedRole === roleOption.id
                            ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <Icon className={`h-6 w-6 mb-2 ${
                          selectedRole === roleOption.id ? 'text-primary-600' : 'text-gray-400'
                        }`} />
                        <h3 className={`font-medium ${
                          selectedRole === roleOption.id ? 'text-primary-900' : 'text-gray-900'
                        }`}>
                          {roleOption.title}
                        </h3>
                        <p className={`text-sm ${
                          selectedRole === roleOption.id ? 'text-primary-600' : 'text-gray-600'
                        }`}>
                          {roleOption.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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

            {/* Provider-specific fields */}
            {selectedRole === 'provider' && (
              <>
                {/* Business Location Map - SHOW FIRST */}
                <div className="form-group">
                  <label className="form-label flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Business Location (Optional)
                    </span>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center sm:justify-start min-h-[44px]"
                    >
                      <Navigation className="h-4 w-4 mr-1" />
                      {gettingLocation ? 'Getting location...' : 'Use GPS Location'}
                    </button>
                  </label>
                  
                  <div className="relative rounded-lg overflow-hidden border-2 border-gray-300 h-56 sm:h-80">
                    <MapContainer
                      key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
                      center={mapCenter}
                      zoom={mapZoom}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <LocationMarker />
                    </MapContainer>
                    
                    {markerPosition && (
                      <div className="absolute bottom-3 left-3 bg-success-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg z-[1000]">
                        📍 {coordinates.latitude?.toFixed(4)}, {coordinates.longitude?.toFixed(4)}
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-2">
                    💡 Click on the map or use GPS to mark your business location. Address fields will be auto-filled!
                  </p>
                </div>

                {/* Address fields - SHOW AFTER MAP for providers */}
                <div className="form-group">
                  <label htmlFor="street" className="form-label">
                    Street Address
                  </label>
                  <input
                    id="street"
                    type="text"
                    className={`input-field ${errors['address.street'] ? 'input-error' : ''}`}
                    placeholder="Enter street address"
                    {...register('address.street', {
                      required: 'Street address is required',
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
                      placeholder="Enter area"
                      {...register('address.area', {
                        required: 'Area is required',
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
                      placeholder="Enter city"
                      {...register('address.city', {
                        required: 'City is required',
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
                        required: 'Pincode is required',
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
                      Price per Can (Rs.)
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="form-group">
                    <label htmlFor="serviceRadius" className="form-label">
                      Delivery Radius (km)
                    </label>
                    <input
                      id="serviceRadius"
                      type="number"
                      min="1"
                      max="50"
                      step="1"
                      value={serviceRadius}
                      onChange={(e) => setServiceRadius(e.target.value)}
                      className="input-field"
                      placeholder="Enter delivery radius"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      How far from your location will you deliver? (1-50 km)
                    </p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="minimumOrder" className="form-label">
                      Minimum Order (cans)
                    </label>
                    <input
                      id="minimumOrder"
                      type="number"
                      min="1"
                      step="1"
                      defaultValue="1"
                      className="input-field"
                      placeholder="Minimum order quantity"
                      {...register('minimumOrder')}
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Minimum number of cans per order
                    </p>
                  </div>
                </div>

                {/* Operating Hours */}
                <div className="form-group">
                  <label className="form-label">Operating Hours</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="openTime" className="text-sm text-gray-600">Opening Time</label>
                      <input
                        id="openTime"
                        type="time"
                        defaultValue="08:00"
                        className="input-field"
                        {...register('operatingHours.open')}
                      />
                    </div>
                    <div>
                      <label htmlFor="closeTime" className="text-sm text-gray-600">Closing Time</label>
                      <input
                        id="closeTime"
                        type="time"
                        defaultValue="20:00"
                        className="input-field"
                        {...register('operatingHours.close')}
                      />
                    </div>
                  </div>
                </div>

                {/* Business Description */}
                <div className="form-group">
                  <label htmlFor="description" className="form-label">
                    Business Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    rows="3"
                    className="input-field"
                    placeholder="Tell customers about your business, water quality, delivery service..."
                    {...register('description')}
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Help customers know more about your business
                  </p>
                </div>

                {/* Payment Details - Optional */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-blue-600" />
                    Payment Details (Optional - Can be added later)
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Bank Details */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Bank Account Details</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Account Holder Name"
                          {...register('bankDetails.accountHolder')}
                        />
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Bank Name"
                          {...register('bankDetails.bankName')}
                        />
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Account Number"
                          {...register('bankDetails.accountNumber')}
                        />
                        <input
                          type="text"
                          className="input-field"
                          placeholder="IFSC Code"
                          {...register('bankDetails.ifsc')}
                        />
                      </div>
                    </div>

                    {/* UPI Details */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">UPI Details (Provide either one)</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          className="input-field"
                          placeholder="UPI ID (example@bank)"
                          {...register('upiId')}
                        />
                        <input
                          type="text"
                          className="input-field"
                          placeholder="UPI Number (98XXXXXXXX)"
                          {...register('upiNumber')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Customer info box - address can be added later */}
            {selectedRole === 'customer' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Delivery Address</h4>
                    <p className="text-sm text-blue-800">
                      You can add and manage your delivery addresses from your dashboard after registration.
                    </p>
                  </div>
                </div>
              </div>
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
            <div className="flex items-start">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1 flex-shrink-0"
                {...register('terms', {
                  required: 'You must accept the terms and conditions',
                })}
              />
              <label htmlFor="terms" className="ml-3 block text-sm leading-6 text-gray-900">
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;