import React, { useEffect, useState, useRef } from 'react';
import { Info } from 'lucide-react';
import { useVersionCheck } from '../../hooks/useVersionCheck';
import { useTranslation } from 'react-i18next';

const LATER_REMIND_INTERVAL = 60000;

export const VersionChecker: React.FC = () => {
  const { t } = useTranslation();
  const { currentVersion, updateDetails, needsUpdate, updateVersion, hardRefresh } = useVersionCheck();
  const [showPopup, setShowPopup] = useState(false);
  const [postponeUntil, setPostponeUntil] = useState<number | null>(null);
  const lastVersionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!needsUpdate || !currentVersion) {
      setShowPopup(false);
      return;
    }
    if (currentVersion !== lastVersionRef.current) {
      lastVersionRef.current = currentVersion;
      setPostponeUntil(null);
      setShowPopup(true);
      return;
    }
    const now = Date.now();
    if (postponeUntil === null || now >= postponeUntil) {
      setShowPopup(true);
    }
  }, [needsUpdate, currentVersion, postponeUntil]);

  useEffect(() => {
    if (!needsUpdate || postponeUntil === null || showPopup) return;
    const remaining = postponeUntil - Date.now();
    if (remaining <= 0) {
      setShowPopup(true);
      return;
    }
    const timer = setTimeout(() => {
      setShowPopup(true);
    }, remaining);
    return () => clearTimeout(timer);
  }, [needsUpdate, postponeUntil, showPopup]);

  const handleAccept = () => {
    sessionStorage.removeItem('pending_update_details');
    if (currentVersion) {
      updateVersion(currentVersion);
      hardRefresh();
    }
  };

  const handleLater = () => {
    setShowPopup(false);
    setPostponeUntil(Date.now() + LATER_REMIND_INTERVAL);
  };

  if (!showPopup || !needsUpdate || !currentVersion) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center gap-2 p-4 border-b border-gray-200">
          <Info className="w-5 h-5 text-primary-600 flex-shrink-0" />
          <h3 className="text-lg font-semibold text-gray-900">
            {t('version.newVersionAvailable', 'نسخه جدید سیستم آماده است')}
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {updateDetails ? (
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-4">
              {updateDetails}
            </div>
          ) : (
            <p className="text-sm text-gray-600 mb-4">
              {t('version.updateReady', 'بروزرسانی آماده دریافت است. برای اعمال تغییرات صفحه را رفرش کنید.')}
            </p>
          )}
          <p className="text-xs text-gray-500">
            {t('version.versionLabel', 'نسخه')}: {currentVersion}
          </p>
        </div>
        <div className="p-4 border-t border-gray-200 flex gap-3 justify-end">
          <button onClick={handleLater} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            {t('version.later', 'بعداً')}
          </button>
          <button onClick={handleAccept} className="btn-primary">
            {t('version.acceptAndUpdate', 'قبول و بروزرسانی')}
          </button>
        </div>
      </div>
    </div>
  );
};
