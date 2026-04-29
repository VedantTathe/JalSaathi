import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();
const LOG_PREFIX = '[AuthContext]';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log(`${LOG_PREFIX} Checking auth status on app load...`);
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    console.log(`${LOG_PREFIX} 🔍 checkAuthStatus() called`);
    const token = localStorage.getItem('jalsaathi_token');
    
    if (!token) {
      console.log(`${LOG_PREFIX} ⚠️  No token in localStorage`);
      setUser(null);
      setLoading(false);
      return;
    }

    console.log(`${LOG_PREFIX} 🔑 Token found in localStorage, verifying...`);

    try {
      const response = await authApi.verifyToken();
      console.log(`${LOG_PREFIX} ✅ Token verification response:`, response);
      
      if (response.success && response.user) {
        console.log(`${LOG_PREFIX} ✅ User authenticated:`, response.user);
        setUser(response.user);
      } else {
        console.warn(`${LOG_PREFIX} ⚠️  Token verification returned success=false`);
        console.warn(`${LOG_PREFIX} Response:`, response);
        localStorage.removeItem('jalsaathi_token');
        setUser(null);
      }
    } catch (error) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message || error?.message;
      console.error(`${LOG_PREFIX} ❌ Auth check failed [${status}]:`, message);
      console.error(`${LOG_PREFIX} Full error:`, error);
      
      // 401/403 is expected when token is expired/invalid; clear session silently.
      if (status !== 401 && status !== 403) {
        console.error(`${LOG_PREFIX} Unexpected error status: ${status}`);
      }
      localStorage.removeItem('jalsaathi_token');
      setUser(null);
    } finally {
      console.log(`${LOG_PREFIX} ✅ Auth check complete. User:`, user, 'Loading:', false);
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authApi.login(email, password);
      
      if (response.success && response.data) {
        localStorage.setItem('jalsaathi_token', response.data.token);
        setUser(response.data.user);
        toast.success('Login successful!');
        return { success: true };
      } else {
        toast.error(response.message || 'Login failed');
        return { success: false, message: response.message };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authApi.register(userData);
      
      if (response.success && response.data) {
        localStorage.setItem('jalsaathi_token', response.data.token);
        setUser(response.data.user);
        toast.success('Registration successful!');
        return { success: true };
      } else {
        toast.error(response.message || 'Registration failed');
        return { success: false, message: response.message };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('jalsaathi_token');
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authApi.updateProfile(profileData);
      
      if (response.success) {
        setUser(prevUser => ({ ...prevUser, ...response.data }));
        toast.success('Profile updated successfully!');
        return { success: true };
      } else {
        toast.error(response.message || 'Profile update failed');
        return { success: false, message: response.message };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed. Please try again.';
      toast.error(message);
      return { success: false, message };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await authApi.changePassword(currentPassword, newPassword);
      
      if (response.success) {
        toast.success('Password changed successfully!');
        return { success: true };
      } else {
        toast.error(response.message || 'Password change failed');
        return { success: false, message: response.message };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Password change failed. Please try again.';
      toast.error(message);
      return { success: false, message };
    }
  };

  const updateUser = (updatedFields) => {
    setUser(prevUser => ({ ...prevUser, ...updatedFields }));
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    checkAuthStatus,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};