import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Droplets, 
  User, 
  LogOut, 
  Bell,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AddToHomeScreenPrompt from './AddToHomeScreenPrompt';

const DashboardLayout = ({ children, activeTab, navigation }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showAddToHomeScreen, setShowAddToHomeScreen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Show popup only if user hasn't added to home screen and after a short delay
    if (user && user.addedToHomeScreen === false) {
      const timer = setTimeout(() => {
        setShowAddToHomeScreen(true);
      }, 2000); // Show after 2 seconds

      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setShowLogoutConfirm(false);
    navigate('/login');
  };

  const cancelLogout = () => {
    if (!isLoggingOut) {
      setShowLogoutConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar - Hidden on Mobile */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 bg-white shadow-lg">
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 flex-shrink-0">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <Droplets className="h-8 w-8 text-water-500" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">JalSaathi</h1>
              <p className="text-xs text-gray-500">Har Pyaas Ka Saathi</p>
            </div>
          </Link>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              
              return (
                <li key={item.key}>
                  {item.onClick ? (
                    <button
                      onClick={item.onClick}
                      className={`nav-link w-full text-left ${isActive ? 'nav-link-active' : ''}`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                      {item.badge && (
                        <span className="ml-auto bg-primary-100 text-primary-600 text-xs rounded-full px-2 py-1">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ) : (
                    <Link
                      to={item.href}
                      className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                      {item.badge && (
                        <span className="ml-auto bg-primary-100 text-primary-600 text-xs rounded-full px-2 py-1">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout button */}
        <div className="px-4 py-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top bar - Mobile & Desktop */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 lg:px-8 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Mobile Logo */}
            <Link to="/dashboard" className="flex items-center space-x-2 lg:hidden">
              <Droplets className="h-7 w-7 text-water-500" />
              <div>
                <h1 className="text-base font-bold text-gray-900">JalSaathi</h1>
              </div>
            </Link>

            {/* Desktop - Empty space */}
            <div className="hidden lg:block flex-1"></div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-3">
              {/* Notifications */}
              <button className="text-gray-400 hover:text-gray-600 relative">
                <Bell className="h-5 w-5 lg:h-6 lg:w-6" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-error-500 text-white rounded-full text-xs flex items-center justify-center">
                  3
                </span>
              </button>

              {/* User Profile - Desktop */}
              <Link
                to="/profile"
                className="hidden lg:flex items-center space-x-3 text-gray-600 hover:text-gray-900"
              >
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600" />
                </div>
                <span className="text-sm font-medium">{user?.name}</span>
              </Link>

              {/* User Profile Icon - Mobile */}
              <Link to="/profile" className="lg:hidden">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 pb-20 lg:pb-6">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation - Fixed at bottom, hidden on desktop */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
          <div className="flex items-start justify-around px-1 py-2 safe-bottom">
            {navigation.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              const mobileLabel = item.mobileName || item.shortName || item.name;
              
              return (
                <button
                  key={item.key}
                  onClick={item.onClick || (() => navigate(item.href))}
                  className={`flex flex-col items-center justify-start px-2 py-2 rounded-lg transition-all min-w-0 flex-1 relative ${
                    isActive 
                      ? 'text-primary-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-error-500 text-white rounded-full text-xs flex items-center justify-center font-semibold">
                      {item.badge}
                    </span>
                  )}
                  <Icon className={`h-6 w-6 mb-1 ${isActive ? 'text-primary-600' : ''}`} />
                  <span className={`text-[11px] leading-tight font-medium text-center max-w-full ${
                    isActive ? 'text-primary-600' : ''
                  }`}>
                    {mobileLabel}
                  </span>
                  {isActive && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-600 rounded-full"></div>
                  )}
                </button>
              );
            })}
            {/* Logout Button - Last item */}
            <button
              onClick={handleLogout}
              className="flex flex-col items-center justify-start px-2 py-2 rounded-lg transition-all min-w-0 flex-1 text-gray-500 hover:text-error-600"
            >
              <LogOut className="h-6 w-6 mb-1" />
              <span className="text-[11px] leading-tight font-medium text-center">Logout</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Add to Home Screen Prompt */}
      {showAddToHomeScreen && (
        <AddToHomeScreenPrompt
          onClose={() => setShowAddToHomeScreen(false)}
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-primary-500 to-primary-700 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Confirm Logout</h3>
                  <p className="text-xs text-white/90">You will need to sign in again</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <p className="text-sm text-gray-700 mb-5">
                Are you sure you want to log out of your account?
              </p>

              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={cancelLogout}
                  disabled={isLoggingOut}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-60"
                >
                  No
                </button>
                <button
                  onClick={confirmLogout}
                  disabled={isLoggingOut}
                  className="px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-60"
                >
                  {isLoggingOut ? 'Logging out...' : 'Yes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;