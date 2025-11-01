import React, { useState } from 'react';
import { UserPlus, LogIn } from 'lucide-react';
import { useUsers } from '../../hooks/useAPI';

interface LoginPageProps {
  onLogin: (firstName: string, lastName: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showUserList, setShowUserList] = useState(false);
  
  const { data: usersData, loading: usersLoading } = useUsers();
  const existingUsers = usersData?.users || [];

  const handleCreateOrLogin = () => {
    if (!firstName.trim() && !lastName.trim()) {
      return;
    }
    
    onLogin(firstName.trim(), lastName.trim());
  };

  const handleExistingUserLogin = (user: any) => {
    onLogin(user.first_name, user.last_name);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            سیستم مدیریت تولید کاغذ
          </h1>
          <p className="text-gray-600">
            برای ورود، نام و نام خانوادگی خود را وارد کنید
          </p>
        </div>

        {/* Login Form */}
        <div className="card">
          <div className="card-body">
            <div className="space-y-4">
              <div>
                <label className="form-label">نام</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="form-input"
                  placeholder="نام خود را وارد کنید"
                />
              </div>

              <div>
                <label className="form-label">نام خانوادگی</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="form-input"
                  placeholder="نام خانوادگی خود را وارد کنید"
                />
              </div>

              <button
                onClick={handleCreateOrLogin}
                disabled={!firstName.trim() && !lastName.trim()}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogIn className="w-5 h-5 ml-2" />
                ورود / ایجاد حساب
              </button>
            </div>
          </div>
        </div>

        {/* Existing Users */}
        {!usersLoading && existingUsers.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowUserList(!showUserList)}
              className="w-full btn-secondary"
            >
              {showUserList ? 'پنهان کردن' : 'نمایش'} کاربران موجود
            </button>

            {showUserList && (
              <div className="card mt-4">
                <div className="card-header">
                  <h3 className="card-title">کاربران موجود</h3>
                </div>
                <div className="card-body p-0">
                  <div className="space-y-0">
                    {existingUsers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => handleExistingUserLogin(user)}
                        className="w-full p-4 text-right hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          نام کاربری: {user.username}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            اگر حساب کاربری با این نام وجود داشته باشد، وارد آن خواهید شد.
            در غیر این صورت حساب جدیدی ایجاد می‌شود.
          </p>
        </div>
      </div>
    </div>
  );
};