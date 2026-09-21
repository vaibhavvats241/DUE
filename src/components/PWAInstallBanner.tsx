import React, { useState } from 'react';
import { Download, X, Smartphone, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled || dismissed) {
    return null;
  }

  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <div id="pwa-install-banner" className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-4 py-3 shadow-md flex items-center justify-between border-b border-blue-800/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider">Mobile PWA</p>
            <p className="text-sm font-medium text-white leading-tight">Install DUE Khata on Android</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isInstallable ? (
            <button
              id="install-pwa-button"
              onClick={install}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          ) : isIOS ? (
            <button
              id="install-ios-button"
              onClick={() => setShowIOSGuide(true)}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition"
            >
              How to Install
            </button>
          ) : null}

          <button
            id="dismiss-pwa-banner"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss banner"
            className="text-white/60 hover:text-white p-1 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showIOSGuide && (
        <div id="ios-guide-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Add to Home Screen</h3>
              <button onClick={() => setShowIOSGuide(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 space-y-2.5 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">1</span>
                <span>Tap the <strong>Share</strong> icon in the bottom Safari toolbar.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">2</span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">3</span>
                <span>Tap <strong>Add</strong> in the top right.</span>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
