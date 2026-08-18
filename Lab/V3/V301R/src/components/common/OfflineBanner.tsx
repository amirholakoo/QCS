import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return false;
    return !navigator.onLine;
  });

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    if (typeof window !== 'undefined') {
      window.addEventListener('offline', handleOffline);
      window.addEventListener('online', handleOnline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('online', handleOnline);
      }
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed inset-x-0 top-20 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto max-w-3xl w-full mx-4 bg-yellow-50 border border-yellow-300 text-yellow-900 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
        <div className="flex-shrink-0">
          <AlertCircle className="w-6 h-6 text-yellow-600" />
        </div>
        <div className="flex-1 text-sm font-medium">
          اتصال اینترنت قطع است — برخی امکانات ممکن است در دسترس نباشند.
        </div>
      </div>
    </div>
  );
};

export default OfflineBanner;
