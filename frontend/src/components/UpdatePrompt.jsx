import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

const DISMISSED_KEY = 'pwa_update_dismissed_sw_version';

// Keys in localStorage that must survive an update (keeps user logged in)
const PRESERVE_KEYS = ['jalsaathi_token', 'user'];

const UpdatePrompt = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  // Check if user dismissed this particular SW update in this session
  const isDismissed = sessionStorage.getItem(DISMISSED_KEY) === 'true';

  const close = () => {
    // Mark as dismissed for this session so it doesn't re-appear on every nav/render
    sessionStorage.setItem(DISMISSED_KEY, 'true');
    setNeedRefresh(false);
  };

  const handleUpdate = async () => {
    // 1. Save auth data we want to keep
    const preserved = {};
    PRESERVE_KEYS.forEach((key) => {
      const val = localStorage.getItem(key);
      if (val) preserved[key] = val;
    });

    // 2. Clear ALL caches so new SW serves fresh assets
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    // 3. Clear sessionStorage (stale UI state)
    sessionStorage.clear();

    // 4. Clear localStorage entirely then restore auth keys
    localStorage.clear();
    PRESERVE_KEYS.forEach((key) => {
      if (preserved[key]) localStorage.setItem(key, preserved[key]);
    });

    // 5. Activate new SW and reload
    updateServiceWorker(true);
  };

  if (!needRefresh || isDismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white rounded-xl shadow-2xl border border-primary-100 p-5 max-w-sm flex flex-col gap-3 relative">
        <button
          onClick={close}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full p-1 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="bg-primary-100 p-2 rounded-lg text-primary-600 mt-1">
            <RefreshCw className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Quick Update ⚡</h3>
            <p className="text-gray-600 text-sm mt-1">
              Done in seconds — you'll stay logged in. Tap to get the latest improvements.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <button
            onClick={handleUpdate}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <RefreshCw className="h-4 w-4" />
            Update Now
          </button>
          <button
            onClick={close}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdatePrompt;
