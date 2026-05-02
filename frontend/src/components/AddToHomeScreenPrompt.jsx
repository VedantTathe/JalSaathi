import React, { useState, useEffect } from 'react';
import { X, Smartphone, Download, Share } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const AddToHomeScreenPrompt = ({ onClose }) => {
  const { updateUser } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as standalone app
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone ||
                      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e) => {
      console.log('✅ beforeinstallprompt event fired! Install is available.');
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    console.log('AddToHomeScreenPrompt: Listening for install prompt. Standalone:', standalone, 'iOS:', iOS);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Android/Chrome installation
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast.success('App installed successfully!');
        await markAsAdded();
      }
      
      setDeferredPrompt(null);
    } else if (isIOS) {
      // iOS - just close the prompt, they need to follow manual instructions
      toast('Please follow the instructions above');
    } else {
      // Browser doesn't support installation
      toast('Your browser doesn\'t support app installation');
    }
  };

  const markAsAdded = async () => {
    try {
      await authApi.updateAddToHomeScreenStatus();
      updateUser({ addedToHomeScreen: true });
      onClose();
    } catch (error) {
      console.error('Failed to update add to home screen status:', error);
      onClose();
    }
  };

  const handleDismiss = async () => {
    await markAsAdded();
  };

  // Don't show if already in standalone mode
  if (isStandalone) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full animate-slide-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Install JalSaathi App</h3>
              <p className="text-sm text-gray-500">Quick access from your home screen</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isIOS ? (
            // iOS Instructions
            <div className="space-y-4">
              <p className="text-gray-700">To install this app on your iPhone/iPad:</p>
              <ol className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>
                    Tap the <Share className="inline h-4 w-4 mx-1" /> <strong>Share</strong> button in Safari
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>
                    Scroll down and tap <Download className="inline h-4 w-4 mx-1" /> <strong>"Add to Home Screen"</strong>
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Tap <strong>"Add"</strong> in the top right corner</span>
                </li>
              </ol>
            </div>
          ) : deferredPrompt ? (
            // Android/Chrome with install prompt
            <div className="space-y-4">
              <p className="text-gray-700">
                Install JalSaathi app for quick access and offline functionality.
              </p>
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <h4 className="font-semibold text-primary-900 mb-2">Benefits:</h4>
                <ul className="space-y-1 text-sm text-primary-700">
                  <li>✅ Quick access from home screen</li>
                  <li>✅ Works offline</li>
                  <li>✅ Faster loading</li>
                  <li>✅ App-like experience</li>
                </ul>
              </div>
            </div>
          ) : (
            // Browser doesn't support installation
            <div className="space-y-4">
              <p className="text-gray-700">
                For the best experience, use Chrome or Safari to install this app on your device.
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  You can still bookmark this page for quick access!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 space-x-3">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Maybe Later
          </button>
          {deferredPrompt && (
            <button
              onClick={handleInstall}
              className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Download className="h-5 w-5" />
              <span>Install Now</span>
            </button>
          )}
          {(isIOS || !deferredPrompt) && (
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Got It
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddToHomeScreenPrompt;
