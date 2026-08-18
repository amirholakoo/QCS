import React, { useState } from 'react';
import { UserPlus, LogIn, User } from 'lucide-react';
import { useUsers } from '../../hooks/useAPI';

interface LoginPageProps {
  onLogin: (firstName: string, lastName: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const { data: usersData, loading: usersLoading } = useUsers();
  const existingUsers = usersData?.users || [];

  const handleCreateOrLogin = () => {
    if (!firstName.trim() || !lastName.trim()) {
      return;
    }
    
    onLogin(firstName.trim(), lastName.trim());
  };

  const handleExistingUserLogin = (user: any) => {
    onLogin(user.first_name, user.last_name);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-3">
      <div className="w-full max-w-6xl">
        {/* Compact Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              سیستم مدیریت تولید کاغذ
            </h1>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Existing Users - Left Side */}
          {!usersLoading && existingUsers.length > 0 && (
            <div className="card shadow-sm">
              <div className="card-header bg-primary-50 border-b border-primary-200 py-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-10 text-primary-600" />
                  <h3 className="card-title text-sm font-semibold mb-0">
                    کاربران موجود ({existingUsers.length})
                  </h3>
                </div>
              </div>
              <div className="card-body p-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {existingUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleExistingUserLogin(user)}
                      className="p-2.5 text-right hover:bg-primary-50 rounded transition-colors group border border-gray-300 hover:border-primary-200"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 group-hover:text-primary-700 truncate">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {user.username}
                          </div>
                        </div>
                        <LogIn className="w-4 h-4 text-gray-400 group-hover:text-primary-600 mr-2 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Login Form - Right Side */}
          <div className="card shadow-sm">
            <div className="card-header bg-gray-50 border-b border-gray-200 py-2">
              <div className="flex items-center gap-4">
                <UserPlus className="w-4 h-10 text-gray-600" />
                <h3 className="card-title text-sm font-semibold mb-0 ">
                  ایجاد حساب جدید / ورود
                </h3>
              </div>
            </div>
            <div className="card-body p-4">
              <div className="space-y-3">
                <div>
                  <label className="form-label text-xs font-medium mb-1">نام</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="form-input text-sm py-4"
                    placeholder="نام"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="form-label text-xs font-medium mb-1">نام خانوادگی</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="form-input text-sm py-4"
                    placeholder="نام خانوادگی"
                  />
                </div>

                <button
                  onClick={handleCreateOrLogin}
                  disabled={!firstName.trim() || !lastName.trim()}
                  className="w-full btn-primary text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-10" />
                  ورود / ایجاد حساب
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Info */}
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-600">
            اگر حساب کاربری با این نام وجود داشته باشد، وارد آن خواهید شد. در غیر این صورت حساب جدیدی ایجاد می‌شود.
          </p>
        </div>
      </div>
    </div>
  );
};