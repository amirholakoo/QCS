import React from 'react';
import { ReportChart } from './ReportChart';

export const ReportPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">گزارش‌ها</h1>
            <p className="text-gray-600 mt-1">مدیریت و مشاهده گزارش‌های سیستم</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <ReportChart />
    </div>
  );
};
