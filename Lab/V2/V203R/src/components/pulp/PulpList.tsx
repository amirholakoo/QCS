import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Edit, Eye, Trash2, Loader, Download } from 'lucide-react';
import type { Pulp } from '../../types';
import { useInfiniteScroll, useDeletePulp } from '../../hooks/useAPI';
import { pulpAPI } from '../../utils/api';
import { formatPersianDate, formatPersianTime, isValidShamsiDate } from '../../utils/persianUtils';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { useToast } from '../common/Toast';
import { getProductionLineColors } from '../../utils/productionLineColors';

interface PulpListProps {
  onEdit: (pulp: Pulp) => void;
  onView: (pulp: Pulp) => void;
  onCreate: () => void;
  onRefetch?: () => void;
}

export const PulpList: React.FC<PulpListProps> = ({ onEdit, onView, onCreate, onRefetch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState<number | 'all'>(50);
  const [exportStartDate, setExportStartDate] = useState<string>('');
  const [exportEndDate, setExportEndDate] = useState<string>('');
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    pulp: Pulp | null;
  }>({ isOpen: false, pulp: null });

  const { showToast } = useToast();
  const { deletePulp, loading: deleteLoading } = useDeletePulp();
  const [exporting, setExporting] = useState(false);
  const [locationNames, setLocationNames] = useState<Array<{ id: number; title: string }>>([]);

  // Fetch location names on component mount
  useEffect(() => {
    const fetchLocationNames = async () => {
      try {
        const names = await pulpAPI.getLocationNames();
        setLocationNames(names);
      } catch (error) {
        console.error('Failed to fetch location names:', error);
      }
    };
    fetchLocationNames();
  }, []);

  // Build API parameters (empty for pulp - no filters)
  const apiParams = useMemo(() => ({}), []);
  
  // Use infinite scroll hook
  const { 
    data: pulps, 
    loading, 
    loadingMore,
    error, 
    hasMore,
    totalCount,
    refetch,
    lastElementRef
  } = useInfiniteScroll<Pulp>(pulpAPI.list, apiParams, pageSize);

  // Filter pulps based on search (client-side filtering)
  const filteredPulps = useMemo(() => {
    return pulps.filter(pulp => {
      const searchLower = searchTerm.toLowerCase();
      return (
        pulp.roll_number?.toString().includes(searchTerm) ||
        pulp.id.toString().includes(searchLower)
      );
    });
  }, [pulps, searchTerm]);

  const handleDeleteClick = (pulp: Pulp) => {
    setDeleteDialog({ isOpen: true, pulp });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.pulp) return;

    try {
      await deletePulp(deleteDialog.pulp.id.toString());
      showToast('success', 'نمونه خمیر با موفقیت حذف شد');
      setDeleteDialog({ isOpen: false, pulp: null });
      
      // Refetch the data
      refetch();
    } catch (error) {
      showToast('error', 'خطا در حذف نمونه خمیر');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, pulp: null });
  };

  const handleExport = async () => {
    // Validate date format
    if (exportStartDate && !isValidShamsiDate(exportStartDate)) {
      showToast('error', 'فرمت تاریخ شروع صحیح نیست. فرمت صحیح: 1404-09-01');
      return;
    }
    if (exportEndDate && !isValidShamsiDate(exportEndDate)) {
      showToast('error', 'فرمت تاریخ پایان صحیح نیست. فرمت صحیح: 1404-09-30');
      return;
    }
    
    setExporting(true);
    try {
      // Build query params from current filters
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (exportStartDate) params.date_from = exportStartDate;
      if (exportEndDate) params.date_to = exportEndDate;
      
      await pulpAPI.exportXlsx(params);
      showToast('success', 'فایل اکسل با موفقیت دانلود شد');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('error', 'خطا در دانلود فایل اکسل');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">مدیریت خمیر کاغذ</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            نمایش {formatPersianDate(filteredPulps.length.toString())} از {formatPersianDate(totalCount.toString())} رکورد
            {pageSize !== 'all' && ` (${formatPersianDate(pageSize.toString())} رکورد در هر صفحه)`}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center flex-wrap">
          {/* Date Range Inputs for Export */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={exportStartDate}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only numbers and dashes
                  if (value === '' || /^[\d-]*$/.test(value)) {
                    setExportStartDate(value);
                  }
                }}
                placeholder="از تاریخ (مثال: 1404-09-01)"
                className="form-input sm:w-40"
                dir="ltr"
              />
              <span className="text-gray-500 text-sm hidden sm:inline">تا</span>
              <input
                type="text"
                value={exportEndDate}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only numbers and dashes
                  if (value === '' || /^[\d-]*$/.test(value)) {
                    setExportEndDate(value);
                  }
                }}
                placeholder="تا تاریخ (مثال: 1404-09-30)"
                className="form-input sm:w-40"
                dir="ltr"
              />
              {(exportStartDate || exportEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setExportStartDate('');
                    setExportEndDate('');
                  }}
                  className="btn-secondary btn-sm"
                  title="پاک کردن"
                >
                  پاک کردن
                </button>
              )}
            </div>
          </div>
          
          <button 
            onClick={handleExport} 
            disabled={exporting}
            className="btn-secondary flex items-center"
          >
            {exporting ? (
              <>
                <Loader className="w-5 h-5 ml-2 animate-spin" />
                در حال دانلود...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 ml-2" />
                خروجی اکسل
              </>
            )}
          </button>
          <button onClick={onCreate} className="btn-primary">
            <Plus className="w-5 h-5 ml-2" />
            افزودن نمونه جدید
          </button>
        </div>
      </div>

      {/* Search and Page Size */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="جستجو بر اساس شماره رول..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pr-10"
              />
            </div>

            {/* Page Size */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="form-select"
            >
              <option value="25">۲۵ رکورد</option>
              <option value="50">۵۰ رکورد</option>
              <option value="100">۱۰۰ رکورد</option>
              <option value="200">۲۰۰ رکورد</option>
            <option value="all">نمایش همه</option>
          </select>
        </div>
      </div>
    </div>

      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">در حال بارگذاری...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="text-center text-red-600 p-8">
          <p>خطا در دریافت اطلاعات: {error}</p>
          <button onClick={refetch} className="btn-primary mt-4">
            تلاش مجدد
          </button>
        </div>
      )}

      {/* Pulps Table */}
      {!loading && !error && (
        <div className="card">
          <div className="card-body p-0">
            {filteredPulps.length > 0 ? (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="table">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr>
                    <th className="bg-gray-50">شماره رول</th>
                    <th className="bg-gray-50">خط تولید</th>
                    <th className="bg-gray-50">زمان نمونه‌گیری</th>
                    <th className="bg-gray-50">کانس خمیر پایین</th>
                    <th className="bg-gray-50">کانس توری پایین</th>
                    <th className="bg-gray-50">فرینس خمیر پایین</th>
                    <th className="bg-gray-50">pH پایین</th>
                    <th className="bg-gray-50">دمای خمیر پایین</th>
                    <th className="bg-gray-50">کانس خمیر بالا</th>
                    <th className="bg-gray-50">کانس توری بالا</th>
                    <th className="bg-gray-50">فرینس خمیر بالا</th>
                    <th className="bg-gray-50">pH بالا</th>
                    <th className="bg-gray-50">دمای خمیر بالا</th>
                    <th className="bg-gray-50">حوض ۸</th>
                    <th className="bg-gray-50">کردان</th>
                    <th className="bg-gray-50">تیکنر</th>
                    {/* Dynamic columns for location names */}
                    {locationNames.map((loc) => (
                      <th key={loc.id} className="bg-gray-50">{loc.title}</th>
                    ))}
                    <th className="bg-gray-50">تاریخ ایجاد</th>
                    <th className="bg-gray-50">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPulps.map((pulp, index) => (
                    <tr 
                      key={pulp.id} 
                      className="table-row-hover"
                      ref={index === filteredPulps.length - 1 && pageSize !== 'all' ? lastElementRef : null}
                    >
                      <td className="font-medium">
                        {pulp.roll_number || '-'}
                      </td>
                      <td>
                        {pulp.ProductionLine !== undefined && pulp.ProductionLine !== null ? (
                          (() => {
                            const colors = getProductionLineColors(pulp.ProductionLine);
                            return (
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
                                {colors.label}
                              </span>
                            );
                          })()
                        ) : '-'}
                      </td>
                      <td>
                        {pulp.lower_sampling_time ? formatPersianTime(pulp.lower_sampling_time) : '-'}
                      </td>
                      <td>{pulp.downpulpcount || '-'}</td>
                      <td>{pulp.lower_water_filter || '-'}</td>
                      <td>{pulp.lower_headbox_freeness || '-'}</td>
                      <td>{pulp.lower_ph || '-'}</td>
                      <td>{pulp.lower_pulp_temperature || '-'}</td>
                      <td>{pulp.upper_headbox_consistency || '-'}</td>
                      <td>{pulp.upper_water_filter || '-'}</td>
                      <td>{pulp.upper_headbox_freeness || '-'}</td>
                      <td>{pulp.upper_ph || '-'}</td>
                      <td>{pulp.upper_pulp_temperature || '-'}</td>
                      <td>{pulp.pond8_consistency || '-'}</td>
                      <td>{pulp.curtain_consistency || '-'}</td>
                      <td>{pulp.thickener_consistency || '-'}</td>
                      {/* Dynamic cells for location values */}
                      {locationNames.map((loc) => {
                        const locationValue = pulp.sampling_locations?.find(
                          sl => sl.title === loc.title
                        );
                        return (
                          <td key={loc.id}>{locationValue?.value || '-'}</td>
                        );
                      })}
                      <td>
                        {new Date(pulp.created_at).toLocaleDateString('fa-IR')}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onView(pulp)}
                            className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                            title="مشاهده"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEdit(pulp)}
                            className="text-primary-600 hover:text-primary-700 p-1 rounded hover:bg-primary-50"
                            title="ویرایش"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(pulp)}
                            className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium mb-2">هیچ رکوردی یافت نشد</p>
              <p>نمونه خمیر جدیدی ایجاد کنید یا جستجو را تغییر دهید.</p>
            </div>
          )}
          
          {/* Loading More Indicator */}
          {loadingMore && (
            <div className="flex justify-center items-center p-4 border-t">
              <Loader className="w-6 h-6 animate-spin text-primary-600 ml-2" />
              <span className="text-gray-600">در حال بارگذاری...</span>
            </div>
          )}
          
          {/* End of List Message */}
          {!loadingMore && !hasMore && filteredPulps.length > 0 && (
            <div className="flex justify-center items-center p-4 border-t text-gray-500">
              <span>همه رکوردها نمایش داده شد</span>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="حذف نمونه خمیر"
        message={`آیا از حذف نمونه خمیر شماره ${deleteDialog.pulp?.roll_number || deleteDialog.pulp?.id} اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        confirmText="حذف"
        cancelText="انصراف"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};