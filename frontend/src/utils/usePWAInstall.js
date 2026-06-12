/**
 * usePWAInstall — shared PWA install hook
 *
 * `beforeinstallprompt` fires once very early (before most components mount).
 * By capturing it at module-level we ensure every component that uses this
 * hook can access the same prompt, regardless of when it mounts.
 */

let _deferredPrompt = null;
const _listeners = new Set();

// Capture the prompt as early as possible at module load time
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    // Notify all mounted hook instances
    _listeners.forEach((fn) => fn(e));
  });
}

import { useState, useEffect } from 'react';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(_deferredPrompt);

  // Detect if already running as installed PWA
  const isInstalled =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  useEffect(() => {
    const handler = (e) => setDeferredPrompt(e);
    _listeners.add(handler);
    // In case it fired before this component mounted
    if (_deferredPrompt) setDeferredPrompt(_deferredPrompt);
    return () => _listeners.delete(handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        try {
          await authApi.updateAddToHomeScreenStatus();
        } catch (_) {}
      }
      _deferredPrompt = null;
      setDeferredPrompt(null);
      return outcome === 'accepted';
    }

    // iOS fallback
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      toast('Tap the Share button ↑ then "Add to Home Screen"', { duration: 5000 });
    } else {
      // Android / desktop — browser already installed or not eligible
      toast('To install: open in Chrome and tap the menu → "Add to Home Screen"', {
        duration: 5000,
      });
    }
    return false;
  };

  return { deferredPrompt, isInstalled, handleInstall };
}
