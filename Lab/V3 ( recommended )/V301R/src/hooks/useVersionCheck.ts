/**
 * Hook for checking system version and managing version updates
 */
import { useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';

const VERSION_COOKIE_NAME = 'system_version';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
};

const setCookie = (name: string, value: string, maxAge: number = COOKIE_MAX_AGE): void => {
  document.cookie = `${name}=${value}; max-age=${maxAge}; path=/`;
};

export const useVersionCheck = () => {
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [updateDetails, setUpdateDetails] = useState<string | null>(null);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isInitialCheck = true;

    const checkVersion = async () => {
      try {
        if (isInitialCheck) {
          setLoading(true);
        }
        const response = await authAPI.getSystemVersion();
        const serverVersion = response.version;
        const details = response.update_details || '';
        setCurrentVersion(serverVersion);
        setUpdateDetails(details);

        const clientVersion = getCookie(VERSION_COOKIE_NAME);

        if (clientVersion !== serverVersion) {
          setNeedsUpdate(true);
          // Store update details in sessionStorage before refresh
          if (details) {
            sessionStorage.setItem('pending_update_details', details);
          }
        } else {
          setNeedsUpdate(false);
        }
      } catch (error) {
        console.error('Failed to check version:', error);
        setNeedsUpdate(false);
      } finally {
        if (isInitialCheck) {
          setLoading(false);
          isInitialCheck = false;
        }
      }
    };

    // Initial check
    checkVersion();

    // Poll every 10 seconds to check for version changes in real-time
    const pollInterval = setInterval(() => {
      checkVersion();
    }, 10000); // 10 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  const updateVersion = useCallback((version: string) => {
    setCookie(VERSION_COOKIE_NAME, version);
    setNeedsUpdate(false);
  }, []);

  const hardRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  return {
    currentVersion,
    updateDetails,
    needsUpdate,
    loading,
    updateVersion,
    hardRefresh,
  };
};
