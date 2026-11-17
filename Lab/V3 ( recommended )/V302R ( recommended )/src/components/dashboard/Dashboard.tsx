import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Loader2, Calendar, CalendarDays, CalendarRange, Database, BarChart3, Activity, FileText, Droplets, Layers, Beaker, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDashboardStats } from '../../hooks/useAPI';
import { formatPersianDate } from '../../utils/persianUtils';

interface MetricCardProps {
  label: string;
  highest: number | null;
  lowest: number | null;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, highest, lowest }) => {
  const { t } = useTranslation();
  const average = highest !== null && lowest !== null ? (highest + lowest) / 2 : null;
  
  return (
    <div className="group relative bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-purple-50/0 group-hover:from-blue-50/50 group-hover:to-purple-50/30 transition-all duration-300" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
          <Activity className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
        </div>
        
        {/* Stats */}
        <div className="space-y-3">
          {/* Highest */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-green-50/50 rounded-lg border border-emerald-100/50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-xs font-medium text-gray-600">{t('dashboard.highest')}</span>
            </div>
            <span className="text-sm font-bold text-emerald-700">
              {highest !== null ? formatPersianDate(highest.toFixed(2)) : '-'}
            </span>
          </div>
          
          {/* Lowest */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-lg border border-blue-100/50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingDown className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-gray-600">{t('dashboard.lowest')}</span>
            </div>
            <span className="text-sm font-bold text-blue-700">
              {lowest !== null ? formatPersianDate(lowest.toFixed(2)) : '-'}
            </span>
          </div>
          
          {/* Average - subtle */}
          {average !== null && (
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50/50 rounded-lg">
              <span className="text-xs text-gray-500">{t('dashboard.average')}</span>
              <span className="text-xs font-semibold text-gray-600">
                {formatPersianDate(average.toFixed(2))}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface StatsSectionProps {
  title: string;
  children: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange';
  icon?: React.ReactNode;
}

const StatsSection: React.FC<StatsSectionProps> = ({ title, children, color = 'blue', icon }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-indigo-500',
    green: 'from-emerald-500 to-teal-500',
    purple: 'from-purple-500 to-pink-500',
    orange: 'from-orange-500 to-red-500',
  };

  const bgColorClasses = {
    blue: 'bg-gradient-to-br from-blue-50/50 to-indigo-50/30',
    green: 'bg-gradient-to-br from-emerald-50/50 to-teal-50/30',
    purple: 'bg-gradient-to-br from-purple-50/50 to-pink-50/30',
    orange: 'bg-gradient-to-br from-orange-50/50 to-red-50/30',
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className={`w-1 h-8 rounded-full bg-gradient-to-b ${colorClasses[color]}`} />
        <div className="flex items-center gap-2">
          {icon && (
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-sm`}>
              <div className="text-white">
                {icon}
              </div>
            </div>
          )}
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>
      </div>
      
      {/* Cards Container */}
      <div className={`rounded-2xl ${bgColorClasses[color]} p-6 border border-gray-100/50 backdrop-blur-sm`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {children}
        </div>
      </div>
    </div>
  );
};

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'overall';

interface TabConfig {
  id: PeriodType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const getTabs = (t: (key: string) => string): TabConfig[] => [
  {
    id: 'daily',
    label: t('dashboard.today'),
    icon: <Calendar className="w-4 h-4" />,
    color: 'blue',
  },
  {
    id: 'weekly',
    label: t('dashboard.thisWeek'),
    icon: <CalendarDays className="w-4 h-4" />,
    color: 'green',
  },
  {
    id: 'monthly',
    label: t('dashboard.thisMonth'),
    icon: <CalendarRange className="w-4 h-4" />,
    color: 'purple',
  },
  {
    id: 'overall',
    label: t('dashboard.overall'),
    icon: <Database className="w-4 h-4" />,
    color: 'orange',
  },
];

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [activePeriod, setActivePeriod] = useState<PeriodType>('daily');
  const { data, loading, error } = useDashboardStats();
  const tabs = getTabs(t);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="relative">
            {/* Animated circles */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 border-4 border-blue-200 rounded-full animate-ping" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-blue-500 rounded-full animate-pulse" />
            </div>
            <Loader2 className="relative w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          </div>
          <p className="text-gray-600 font-medium mt-6">{t('dashboard.loadingStats')}</p>
          <p className="text-gray-400 text-sm mt-2">{t('dashboard.pleaseWait')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-12 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('dashboard.errorLoading')}</h3>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const statsData = data?.data;
  const periodData = statsData?.[activePeriod];

  // Get active tab config for styling
  const activeTabConfig = tabs.find(t => t.id === activePeriod);

  return (
    <div className="space-y-8 pb-8">
      {/* Page Header - Modern & Clean */}
      <div className="relative">
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-4 -right-4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {t('dashboard.title')}
            </h1>
          </div>
          <p className="text-gray-500 text-sm sm:text-base md:text-lg mr-5">{t('dashboard.subtitle')}</p>
        </div>
      </div>

      {/* Tabs - Modern Pill Design */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 p-2">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activePeriod === tab.id;
            
            const gradientClasses = {
              blue: 'from-blue-500 to-indigo-500',
              green: 'from-emerald-500 to-teal-500',
              purple: 'from-purple-500 to-pink-500',
              orange: 'from-orange-500 to-red-500',
            }[tab.color];
            
            return (
              <button
                key={tab.id}
                onClick={() => setActivePeriod(tab.id)}
                className={`
                  relative flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-sm
                  transition-all duration-300 whitespace-nowrap overflow-hidden
                  ${isActive 
                    ? `bg-gradient-to-r ${gradientClasses} text-white shadow-lg scale-105` 
                    : 'text-gray-600 hover:bg-gray-50 hover:scale-102'
                  }
                `}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
                )}
                <div className={isActive ? "scale-110 transition-transform" : ""}>
                  {tab.icon}
                </div>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {periodData && (
        <div className="space-y-8">
          {/* Stats Header - Hero Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 shadow-2xl">
            {/* Animated background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
            
            <div className="relative flex items-center justify-between flex-wrap gap-6">
              <div className="flex items-center gap-4">
                {/* Icon with gradient background */}
                <div className={`
                  w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg
                  ${activePeriod === 'daily' ? 'from-blue-500 to-indigo-500' :
                    activePeriod === 'weekly' ? 'from-emerald-500 to-teal-500' :
                    activePeriod === 'monthly' ? 'from-purple-500 to-pink-500' :
                    'from-orange-500 to-red-500'}
                `}>
                  <div className="text-white">
                    {activeTabConfig?.icon}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {t('dashboard.statsFor')} {activeTabConfig?.label}
                  </h3>
                  <p className="text-gray-400 text-sm">{t('dashboard.highestLowestValues')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 flex-wrap">
                <div className="bg-white/10 backdrop-blur-md px-8 py-5 rounded-2xl border border-white/20 shadow-xl">
                  <div className="flex items-center gap-4">
                    <BarChart3 className="w-8 h-8 text-white/80" />
                    <div>
                      <p className="text-xs text-gray-300 mb-1">{t('dashboard.totalProduction')}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">
                          {formatPersianDate(periodData.total_production.toString())}
                        </span>
                        <span className="text-xs text-gray-400">{t('common.records')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-8 py-5 rounded-2xl border border-white/20 shadow-xl">
                  <div className="flex items-center gap-4">
                    <AlertTriangle className="w-8 h-8 text-white/80" />
                    <div>
                      <p className="text-xs text-gray-300 mb-1">{t('dashboard.numberOfTears')}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">
                          {formatPersianDate((periodData.number_of_tears_total ?? 0).toString())}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* آمار کلی - General Statistics */}
          <StatsSection title={t('dashboard.generalStats')} color="blue" icon={<FileText className="w-5 h-5" />}>
            <MetricCard
              label={t('dashboard.grammage')}
              highest={periodData.grammage?.highest}
              lowest={periodData.grammage?.lowest}
            />
            <MetricCard
              label={t('dashboard.humidity')}
              highest={periodData.humidity?.highest}
              lowest={periodData.humidity?.lowest}
            />
            <MetricCard
              label={t('dashboard.burst')}
              highest={periodData.burst?.highest}
              lowest={periodData.burst?.lowest}
            />
            <MetricCard
              label={t('dashboard.cobb')}
              highest={periodData.cobb?.highest}
              lowest={periodData.cobb?.lowest}
            />
            <MetricCard
              label={t('dashboard.md')}
              highest={periodData.md?.highest}
              lowest={periodData.md?.lowest}
            />
            <MetricCard
              label={t('dashboard.cd')}
              highest={periodData.cd?.highest}
              lowest={periodData.cd?.lowest}
            />
            <MetricCard
              label={t('dashboard.rct')}
              highest={periodData.rct?.highest}
              lowest={periodData.rct?.lowest}
            />
          </StatsSection>

          {/* آمار توری پایین - Lower Wire Statistics */}
          <StatsSection title={t('dashboard.lowerWireStats')} color="green" icon={<Droplets className="w-5 h-5" />}>
            <MetricCard
              label={t('dashboard.lowerPulpConsistency')}
              highest={periodData.downpulpcount?.highest}
              lowest={periodData.downpulpcount?.lowest}
            />
            <MetricCard
              label={t('dashboard.lowerWaterFilter')}
              highest={periodData.lower_water_filter?.highest}
              lowest={periodData.lower_water_filter?.lowest}
            />
            <MetricCard
              label={t('dashboard.lowerFreeness')}
              highest={periodData.lower_headbox_freeness?.highest}
              lowest={periodData.lower_headbox_freeness?.lowest}
            />
            <MetricCard
              label={t('dashboard.lowerPh')}
              highest={periodData.lower_ph?.highest}
              lowest={periodData.lower_ph?.lowest}
            />
            <MetricCard
              label={t('dashboard.lowerTemperature')}
              highest={periodData.lower_pulp_temperature?.highest}
              lowest={periodData.lower_pulp_temperature?.lowest}
            />
          </StatsSection>

          {/* آمار توری بالا - Upper Wire Statistics */}
          <StatsSection title={t('dashboard.upperWireStats')} color="purple" icon={<Layers className="w-5 h-5" />}>
            <MetricCard
              label={t('dashboard.upperPulpConsistency')}
              highest={periodData.upper_headbox_consistency?.highest}
              lowest={periodData.upper_headbox_consistency?.lowest}
            />
            <MetricCard
              label={t('dashboard.upperWaterFilter')}
              highest={periodData.upper_water_filter?.highest}
              lowest={periodData.upper_water_filter?.lowest}
            />
            <MetricCard
              label={t('dashboard.upperFreeness')}
              highest={periodData.upper_headbox_freeness?.highest}
              lowest={periodData.upper_headbox_freeness?.lowest}
            />
            <MetricCard
              label={t('dashboard.upperPh')}
              highest={periodData.upper_ph?.highest}
              lowest={periodData.upper_ph?.lowest}
            />
            <MetricCard
              label={t('dashboard.upperTemperature')}
              highest={periodData.upper_pulp_temperature?.highest}
              lowest={periodData.upper_pulp_temperature?.lowest}
            />
          </StatsSection>

          {/* آمار خمیر حوضها - Pulp Pool Statistics */}
          <StatsSection title={t('dashboard.pulpPoolStats')} color="orange" icon={<Beaker className="w-5 h-5" />}>
            <MetricCard
              label={t('dashboard.pond8')}
              highest={periodData.pond8_consistency?.highest}
              lowest={periodData.pond8_consistency?.lowest}
            />
            <MetricCard
              label={t('dashboard.curtain')}
              highest={periodData.curtain_consistency?.highest}
              lowest={periodData.curtain_consistency?.lowest}
            />
            <MetricCard
              label={t('dashboard.thickener')}
              highest={periodData.thickener_consistency?.highest}
              lowest={periodData.thickener_consistency?.lowest}
            />
          </StatsSection>
        </div>
      )}
    </div>
  );
};