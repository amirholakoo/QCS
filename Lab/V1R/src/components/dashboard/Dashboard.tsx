import React from 'react';
import { FileText, Layers, Package, Activity, TrendingUp, Users, Calendar, Clock } from 'lucide-react';
import { usePapers, usePulps, useMaterials, useLogs } from '../../hooks/useAPI';
import { formatPersianDate, getCurrentShamsiDate } from '../../utils/persianUtils';

export const Dashboard: React.FC = () => {
  const { data: papersData } = usePapers();
  const { data: pulpsData } = usePulps();
  const { data: materialsData } = useMaterials();
  const { data: logsData } = useLogs();
  
  const papers = papersData?.results || [];
  const pulps = pulpsData?.results || [];
  const materials = materialsData?.results || [];
  const logs = logsData?.results || [];

  // Statistics
  const todayPapers = papers.filter(p => p.date === getCurrentShamsiDate()).length;
  const thisWeekPapers = papers.filter(p => {
    // Simple check for this week (last 7 days)
            const paperDate = new Date(p.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return paperDate >= weekAgo;
  }).length;

  const recentActivity = logs.slice(0, 10);

  const stats = [
    {
      title: 'کل رکوردهای کاغذ',
      value: papers.length.toString(),
      icon: <FileText className="w-6 h-6 text-primary-600" />,
      color: 'primary',
    },
    {
      title: 'کل رکوردهای خمیر',
      value: pulps.length.toString(),
      icon: <Layers className="w-6 h-6 text-secondary-600" />,
      color: 'secondary',
    },
    {
      title: 'کل مواد',
      value: materials.length.toString(),
      icon: <Package className="w-6 h-6 text-accent-600" />,
      color: 'accent',
    },
    {
      title: 'تولید امروز',
      value: todayPapers.toString(),
      icon: <Calendar className="w-6 h-6 text-success-600" />,
      color: 'success',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">داشبورد</h2>
        <p className="text-gray-600">نمای کلی از سیستم مدیریت تولید کاغذ</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                    {stat.icon}
                  </div>
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatPersianDate(stat.value)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <Activity className="w-5 h-5" />
              آخرین فعالیت‌ها
            </h3>
          </div>
          <div className="card-body p-0">
            {recentActivity.length > 0 ? (
              <div className="space-y-0">
                {recentActivity.map(log => (
                  <div key={log.id} className="p-4 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        log.actionType === 'create' ? 'bg-success-500' : 'bg-warning-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">{log.username}</span>
                          {' '}
                          {log.actionType === 'create' ? 'ایجاد کرد' : 'ویرایش کرد'}
                          {' '}
                          <span className="font-medium">{log.modelName}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString('fa-IR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>هیچ فعالیتی ثبت نشده است</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Papers */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <FileText className="w-5 h-5" />
              آخرین کاغذهای تولید شده
            </h3>
          </div>
          <div className="card-body p-0">
            {papers.length > 0 ? (
              <div className="space-y-0">
                {papers.slice(-5).reverse().map(paper => (
                  <div key={paper.id} className="p-4 border-b border-gray-100 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          رول شماره: {formatPersianDate(paper.roll_number)}
                        </p>
                        <p className="text-sm text-gray-600">
                          مسئول: {paper.responsible_person_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          تاریخ: {formatPersianDate(paper.date)}
                        </p>
                      </div>
                      <div className="text-left">
                        {paper.shift && (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            paper.shift === 'day' 
                              ? 'bg-warning-100 text-warning-700' 
                              : 'bg-primary-100 text-primary-700'
                          }`}>
                            {paper.shift === 'day' ? 'روزانه' : 'شبانه'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>هیچ رکورد کاغذی ثبت نشده است</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Overview */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            نمای کلی هفتگی
          </h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">
                {formatPersianDate(thisWeekPapers.toString())}
              </p>
              <p className="text-sm text-gray-600">تولید این هفته</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-secondary-600">
                {formatPersianDate(pulps.length.toString())}
              </p>
              <p className="text-sm text-gray-600">کل نمونه‌های خمیر</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success-600">
                {formatPersianDate((papers.filter(p => p.calender_applied).length).toString())}
              </p>
              <p className="text-sm text-gray-600">با کلندر</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};