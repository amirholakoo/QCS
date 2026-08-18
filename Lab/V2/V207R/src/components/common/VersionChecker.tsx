import React, { useEffect, useState, useRef } from 'react';
import { useVersionCheck } from '../../hooks/useVersionCheck';

export const VersionChecker: React.FC = () => {
  const { currentVersion, needsUpdate, updateVersion, hardRefresh } = useVersionCheck();
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const hasStartedRef = useRef(false);
  const lastVersionRef = useRef<string | null>(null);

  // Reset when needsUpdate changes or version changes
  useEffect(() => {
    if (!needsUpdate) {
      hasStartedRef.current = false;
      setShowProgress(false);
      setProgress(0);
    } else if (currentVersion && currentVersion !== lastVersionRef.current) {
      // New version detected, reset to allow starting again
      hasStartedRef.current = false;
      lastVersionRef.current = currentVersion;
    }
  }, [needsUpdate, currentVersion]);

  useEffect(() => {
    if (needsUpdate && currentVersion && !hasStartedRef.current) {
      hasStartedRef.current = true;
      setShowProgress(true);
      setProgress(0);

      const duration = 5000; // 5 seconds
      const interval = 50; // Update every 50ms for smoother animation
      const steps = duration / interval; // 100 steps
      const increment = 100 / steps; // ~1% per step
      let currentStep = 0;

      const progressInterval = setInterval(() => {
        currentStep += 1;
        const newProgress = Math.min((currentStep / steps) * 100, 100);
        setProgress(newProgress);

        if (currentStep >= steps) {
          clearInterval(progressInterval);
          setProgress(100);
          // Small delay to show 100% before refresh
          setTimeout(() => {
            updateVersion(currentVersion);
            hardRefresh();
          }, 200);
        }
      }, interval);

      return () => {
        clearInterval(progressInterval);
      };
    }
  }, [needsUpdate, currentVersion, updateVersion, hardRefresh]);

  if (!showProgress) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            در حال دریافت بروزرسانی
          </h3>
          <p className="text-sm text-gray-600">
            نسخه جدید سیستم در حال دریافت است...
          </p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className="bg-primary-600 h-3 rounded-full transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-center text-xs text-gray-500">
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
};
