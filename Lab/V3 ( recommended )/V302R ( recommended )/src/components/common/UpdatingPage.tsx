import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

function formatHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export interface UpdatingPageProps {
  timerSeconds: number;
  message?: string;
}

export const UpdatingPage: React.FC<UpdatingPageProps> = ({ timerSeconds, message = '' }) => {
  const [remaining, setRemaining] = useState(timerSeconds);

  useEffect(() => {
    setRemaining(timerSeconds);
  }, [timerSeconds]);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining((r) => (r <= 0 ? 0 : r - 1)), 1000);
    return () => clearInterval(t);
  }, [timerSeconds]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <div className="flex justify-center mb-4">
            <Loader2 className="w-14 h-14 text-primary-600 animate-spin" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            در حال به‌روزرسانی...
          </h1>
          <p className="text-gray-600 text-sm mb-4">
            لطفاً چند لحظه صبر کنید.
          </p>
          <div className="font-mono text-3xl font-semibold text-primary-600 mb-4 tabular-nums">
            {formatHMS(remaining >= 0 ? remaining : 0)}
          </div>
          {message && (
            <p className="text-gray-600 text-sm border-t border-gray-100 pt-4">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
