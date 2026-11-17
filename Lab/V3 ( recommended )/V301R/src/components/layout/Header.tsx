import React, { useState } from 'react';
import { LogOut, User, FileText, Layers, Activity, BarChart3, CheckCircle, Settings, Menu, X, ChevronDown, Gauge } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { User as UserType, AppSection } from '../../types';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { qcAPI } from '../../utils/api';
import { useEffect } from 'react';
import { useVersionCheck } from '../../hooks/useVersionCheck';
import { filterNavItems } from '../../utils/permissions';

interface HeaderProps {
  currentUser: UserType;
  currentSection: AppSection;
  onSectionChange: (section: AppSection) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentUser, 
  currentSection, 
  onSectionChange, 
  onLogout 
}) => {
  const { t } = useTranslation();
  const [hasDraftQC, setHasDraftQC] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { currentVersion } = useVersionCheck();

  useEffect(() => {
    let mounted = true;
    const checkDrafts = async () => {
      try {
        const res = await qcAPI.listRecords({ status: 'draft', page: '1' });
        if (!mounted) return;
        const found = Array.isArray(res.results) ? res.results.length > 0 : false;
        setHasDraftQC(found);
      } catch (err) {
        // silently ignore API errors for poll
        if (!mounted) return;
        setHasDraftQC(false);
      }
    };

    // initial check
    checkDrafts();
    const id = window.setInterval(checkDrafts, 10000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);
  
  const displayVersion = currentVersion || 'V2.3';

  const allNavItems: { key: AppSection; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: t('navigation.dashboard'), icon: <Activity className="w-5 h-5" /> },
    { key: 'paper', label: t('navigation.paper'), icon: <FileText className="w-5 h-5" /> },
    { key: 'pulp', label: t('navigation.pulp'), icon: <Layers className="w-5 h-5" /> },
    { key: 'settings', label: t('navigation.settings'), icon: <Settings className="w-5 h-5" /> },
    { key: 'speed', label: t('navigation.speed'), icon: <Gauge className="w-5 h-5" /> },
    { key: 'complete-report', label: t('navigation.completeReport'), icon: <BarChart3 className="w-5 h-5" /> },
    // { key: 'technical-report', label: t('navigation.technicalReport'), icon: <BarChart3 className="w-5 h-5" /> },
    { key: 'qc', label: t('navigation.qc'), icon: <CheckCircle className="w-5 h-5" /> },
    { key: 'logs', label: t('navigation.logs'), icon: <Activity className="w-5 h-5" /> },
  ];
  
  const navItems = filterNavItems(allNavItems, currentUser);
  if (navItems.length < allNavItems.length) {
    onSectionChange(navItems[0].key);
  }
  const handleNavClick = (section: AppSection) => {
    onSectionChange(section);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <h1 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 truncate">
              <span className="hidden sm:inline">{t('navigation.paperProductionManagement')} <span className='text-gray-500' style={{ fontSize: '12px' }}>( {displayVersion} )</span></span>
              <span className="sm:hidden">{t('navigation.paperProduction')} <span className='text-gray-500' style={{ fontSize: '10px' }}>( {displayVersion} )</span></span>
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => onSectionChange(item.key)}
                className={`flex items-center gap-2 px-3 xl:px-4 py-2 rounded-lg text-xs xl:text-sm font-medium transition-colors whitespace-nowrap ${
                  currentSection === item.key
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.icon}
                <span className="hidden xl:inline">{item.label}</span>
                {item.key === 'qc' && hasDraftQC && (
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full ml-1" aria-hidden="true" />
                )}
              </button>
            ))}
          </nav>

          {/* User Menu - Desktop */}
          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            <LanguageSwitcher />
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap hidden lg:inline">
                {currentUser.first_name} {currentUser.last_name}
              </span>
            </div>
            
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden xl:inline">{t('navigation.logout')}</span>
            </button>
          </div>

          {/* Mobile User Menu Button and Language Switcher */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher />
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <User className="w-5 h-5" />
                <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

            {userMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">
                      {currentUser.first_name} {currentUser.last_name}
                    </p>
                  </div>
                  <div className="px-4 py-2 border-b border-gray-200">
                    <div className="w-full">
                      <LanguageSwitcher />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors text-right"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('navigation.logout')}
                  </button>
                </div>
              </>
            )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors ml-2"
            aria-label={t('navigation.menu')}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-14 sm:top-16 left-0 right-0 bottom-0 bg-white z-50 overflow-y-auto lg:hidden">
            <nav className="p-4 space-y-1">
              {navItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors text-right ${
                    currentSection === item.key
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  <div className="flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.key === 'qc' && hasDraftQC && (
                      <span className="inline-block w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
                    )}
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </>
      )}
    </header>
  );
};