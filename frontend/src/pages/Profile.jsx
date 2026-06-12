import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { User, Mail, Phone, MapPin, Edit2, Save, X, ArrowLeft, Download, Smartphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi, addressApi } from '../services/api';
import { usePWAInstall } from '../utils/usePWAInstall';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDateTime } from '../utils/helpers';
import toast from 'react-hot-toast';

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const { deferredPrompt, isInstalled, handleInstall } = usePWAInstall();
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // Fetch user profile
  const { data: profileResponse, isLoading } = useQuery(
    'user-profile',
    authApi.getProfile,
    {
      onSuccess: (response) => {
        const data = response.data || response;
        
        // ✅ Profile data processing working correctly
        setProfileData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
        });
      }
    }
  );

  const profile = profileResponse?.data || profileResponse;

  // Fetch customer's saved delivery addresses
  const { data: addressesResponse } = useQuery('customer-addresses', addressApi.getAddresses);
  const addresses = addressesResponse?.data?.addresses || addressesResponse?.addresses || [];

  // Update profile mutation
  const updateProfileMutation = useMutation(
    authApi.updateProfile,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('user-profile');
        setIsEditing(false);
        toast.success('Profile updated successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update profile');
      }
    }
  );

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setProfileData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSave = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original data
    if (profile) {
      setProfileData({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
      });
    }
  };

  const handleAddToHomeScreen = () => handleInstall();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Back</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account information and preferences</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-8 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center">
                  <User className="h-10 w-10 text-white" />
                </div>
                <div className="text-white">
                  <h2 className="text-2xl font-bold">{profile?.name}</h2>
                  <p className="text-primary-100 capitalize">
                    {user?.role?.replace('_', ' ')}
                  </p>
                  <p className="text-primary-100 text-sm">
                    Member since {formatDateTime(profile?.createdAt, { dateOnly: true })}
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCancel}
                      className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={updateProfileMutation.isLoading}
                      className="bg-white text-primary-600 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      {updateProfileMutation.isLoading ? (
                        <LoadingSpinner size="small" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-6">
            {/* Personal Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="h-5 w-5 mr-2 text-primary-500" />
                  Personal Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="input-field"
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{profile?.name || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      {isEditing ? (
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="input-field"
                          placeholder="Enter your email"
                        />
                      ) : (
                        <p className="text-gray-900">{profile?.email || 'Not provided'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-400 mr-2" />
                      {isEditing ? (
                        <input
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="input-field"
                          placeholder="Enter your phone number"
                        />
                      ) : (
                        <p className="text-gray-900">{profile?.phone || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Saved Delivery Addresses */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                  <MapPin className="h-5 w-5 mr-2 text-primary-500" />
                  Saved Delivery Addresses
                </h3>

                {addresses.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <MapPin className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No delivery addresses saved yet.</p>
                    <p className="text-gray-400 text-xs mt-1">Add addresses from the Dashboard → Address Management section.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <div
                        key={addr._id}
                        className={`rounded-xl border-2 p-4 flex items-start gap-3 ${
                          addr.isDefault
                            ? 'border-primary-300 bg-primary-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className={`mt-0.5 p-1.5 rounded-lg ${
                          addr.isDefault ? 'bg-primary-100' : 'bg-gray-200'
                        }`}>
                          <MapPin className={`h-4 w-4 ${
                            addr.isDefault ? 'text-primary-600' : 'text-gray-500'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs font-bold uppercase tracking-wide ${
                              addr.isDefault ? 'text-primary-700' : 'text-gray-600'
                            }`}>
                              {addr.label || 'Address'}
                            </span>
                            {addr.isDefault && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-600 text-white">
                                ✓ Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-800 leading-relaxed">
                            {[addr.street, addr.area, addr.city].filter(Boolean).join(', ')}
                            {addr.pincode && ` — ${addr.pincode}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            {/* App Settings */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Smartphone className="h-5 w-5 mr-2 text-primary-500" />
                App Settings
              </h3>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-gray-900 mb-1">
                      Add to Home Screen
                    </h4>
                    <p className="text-sm text-gray-600">
                      Install JalSaathi on your device for quick access and offline functionality
                    </p>
                  </div>
                  <button
                    onClick={handleAddToHomeScreen}
                    className="ml-4 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center space-x-2 flex-shrink-0"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Install App</span>
                    <span className="sm:hidden">Install</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;