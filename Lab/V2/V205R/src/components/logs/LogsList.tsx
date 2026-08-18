import React, { useState, useCallback, useEffect } from 'react';
import { Activity, Search, Calendar, FileText, Layers, Package, X } from 'lucide-react';
import { useLogs } from '../../hooks/useAPI';
import { formatPersianDate, formatPersianTime } from '../../utils/persianUtils';

export const LogsList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterModel, setFilterModel] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Build API parameters
  const apiParams: Record<string, string> = {};
  if (debouncedSearchTerm) apiParams.search = debouncedSearchTerm;
  if (filterModel) apiParams.model_name = filterModel;
  if (filterAction) apiParams.action_type = filterAction;
  if (dateFrom) apiParams.date_from = dateFrom;
  if (dateTo) apiParams.date_to = dateTo;
  
  const { data: logsData, loading, error, refetch } = useLogs(apiParams);
  
  const logs = logsData?.results || [];
  console.log("==================",logs)
  let i =0;
  for (const item of logs) {
    if(item.details) {
      let result = []
      for(const details of item.details) {
        console.log(details,i)
        result.push(details)
      }
      console.log(result)
      logs[i].details = result;
    }
    i++;
  }
  console.log("=========",logsData);
  const totalCount = logsData?.count || 0;

  // Reset all filters
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setFilterModel('');
    setFilterAction('');
    setDateFrom('');
    setDateTo('');
  }, []);

  // Check if any filters are active
  const hasActiveFilters = searchTerm || filterModel || filterAction || dateFrom || dateTo;

  const getModelIcon = (modelName: string) => {
    switch (modelName) {
      case 'Paper':
        return <FileText className="w-4 h-4 text-primary-600" />;
      case 'Pulp':
        return <Layers className="w-4 h-4 text-secondary-600" />;
      case 'Material':
        return <Package className="w-4 h-4 text-accent-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getModelName = (modelName: string) => {
    switch (modelName) {
      case 'Paper':
        return 'کاغذ';
      case 'Pulp':
        return 'خمیر کاغذ';
      case 'Material':
        return 'ماده';
      default:
        return modelName;
    }
  };

  const getActionName = (actionType: string) => {
    switch (actionType) {
      case 'create':
        return 'ایجاد';
      case 'edit':
        return 'ویرایش';
      default:
        return actionType;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'create':
        return 'bg-success-100 text-success-700';
      case 'edit':
        return 'bg-warning-100 text-warning-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const isSearching = searchTerm !== debouncedSearchTerm;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بارگذاری گزارش‌ها...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <p>خطا در دریافت گزارش‌ها: {error}</p>
        <button onClick={refetch} className="btn-primary mt-4">
          تلاش مجدد
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">گزارش فعالیت‌ها</h2>
          <p className="text-gray-600 mt-1">
            مجموع {formatPersianDate(totalCount.toString())} فعالیت ثبت شده
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="جستجو بر اساس نام کاربر..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pr-10"
              />
            </div>

            {/* Model Filter */}
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="form-select"
            >
              <option value="">همه بخش‌ها</option>
              <option value="Paper">کاغذ</option>
              <option value="Pulp">خمیر کاغذ</option>
              <option value="Material">مواد</option>
            </select>

            {/* Action Filter */}
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="form-select"
            >
              <option value="">همه عملیات</option>
              <option value="create">ایجاد</option>
              <option value="edit">ویرایش</option>
            </select>

            {/* Date From */}
            <div className="relative">
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                placeholder="از تاریخ..."
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="form-input pr-10"
              />
            </div>

            {/* Date To */}
            <div className="relative">
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                placeholder="تا تاریخ..."
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="form-input pr-10"
              />
            </div>
          </div>
          
          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                پاک کردن فیلترها
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Logs List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center gap-2">
            <Activity className="w-5 h-5" />
            فهرست فعالیت‌ها
            {isSearching && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                در حال جستجو...
              </div>
            )}
          </h3>
        </div>
        <div className="card-body p-0">
          {logs.length > 0 ? (
            
            <div className="space-y-0">
              {logs.map(log => (
                <div key={log.id} className="p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className=" mt-1">
                      {getModelIcon(log.modelName)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 gap-6 items-center">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {log.username}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.actionType)}`}>
                          {getActionName(log.actionType)}
                        </span>
                        <span className="text-sm text-gray-600">
                          {getModelName(log.modelName)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        کاربر <strong>{log.username}</strong> یک رکورد {getModelName(log.modelName)} را {getActionName(log.actionType)} کرد
                      </p>

                        
                    </div>
                        <div className="flex-1 text-right">
                        {log.details?.map(d=> (
                          <div className=" text-sm text-gray-600 mb-2">
                            <span>رول شماره {d.roll_number || '-'} {log.actionType=='edit'? (' | فیلد "' + d.name + '" از "' + (d.old||d.new? ((d.old || '-') + '" به "' + (d.new || '-') + '" تغییر کرد'):'')) :''}</span>
                          </div>
                        )
                        )}
                        </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(log.timestamp).toLocaleDateString('fa-IR')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          <span>
                            {formatPersianTime(new Date(log.timestamp).toLocaleTimeString('en-US', { 
                              hour12: false, 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            }))}
                          </span>
                        </div>
                      </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {hasActiveFilters ? (
                  <Search className="w-8 h-8 text-gray-400" />
                ) : (
                  <Activity className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <p className="text-lg font-medium mb-2">
                {hasActiveFilters ? 'نتیجه‌ای یافت نشد' : 'هیچ فعالیتی ثبت نشده است'}
              </p>
              <p>
                {hasActiveFilters 
                  ? 'لطفاً فیلترهای خود را تغییر دهید و مجدداً تلاش کنید.' 
                  : 'هنوز هیچ عملیاتی در سیستم انجام نشده است.'
                }
              </p>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="mt-4 btn-secondary"
                >
                  پاک کردن فیلترها
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      {logs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-success-600 mb-1">
                {formatPersianDate(logs.filter(log => log.actionType === 'create').length.toString())}
              </div>
              <p className="text-sm text-gray-600">ایجاد شده</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-warning-600 mb-1">
                {formatPersianDate(logs.filter(log => log.actionType === 'edit').length.toString())}
              </div>
              <p className="text-sm text-gray-600">ویرایش شده</p>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-primary-600 mb-1">
                {formatPersianDate(new Set(logs.map(log => log.username)).size.toString())}
              </div>
              <p className="text-sm text-gray-600">کاربر فعال</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};