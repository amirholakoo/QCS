import React from 'react';
import { LogOut, User, FileText, Layers, Package, Activity, BarChart3 } from 'lucide-react';
import type { User as UserType, AppSection } from '../../types';

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
  const navItems: { key: AppSection; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'داشبورد', icon: <Activity className="w-5 h-5" /> },
    { key: 'paper', label: 'کاغذ', icon: <FileText className="w-5 h-5" /> },
    { key: 'pulp', label: 'خمیر کاغذ', icon: <Layers className="w-5 h-5" /> },
    { key: 'material', label: 'مواد', icon: <Package className="w-5 h-5" /> },
    { key: 'logs', label: 'گزارش‌ها', icon: <Activity className="w-5 h-5" /> },
    { key: 'report', label: 'گزارش‌های تحلیلی', icon: <FileText className="w-5 h-5" /> },
    { key: 'technical-report', label: 'گزارش فنی', icon: <BarChart3 className="w-5 h-5" /> },
  ];

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              مدیریت تولید کاغذ
            </h1>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => onSectionChange(item.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentSection === item.key
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                {currentUser.first_name} {currentUser.last_name}
              </span>
            </div>
            
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              خروج
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200">
        <div className="px-4 py-2">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => onSectionChange(item.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  currentSection === item.key
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};