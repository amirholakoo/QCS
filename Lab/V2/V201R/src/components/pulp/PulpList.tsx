import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit, Eye, Trash2, Loader } from 'lucide-react';
import type { Pulp } from '../../types';
import { useInfiniteScroll, useDeletePulp } from '../../hooks/useAPI';
import { pulpAPI } from '../../utils/api';
import { formatPersianDate, formatPersianTime } from '../../utils/persianUtils';
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
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    pulp: Pulp | null;
  }>({ isOpen: false, pulp: null });

  const { showToast } = useToast();
  const { deletePulp, loading: deleteLoading } = useDeletePulp();

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">مدیریت خمیر کاغذ</h2>
          <p className="text-gray-600 mt-1">
            نمایش {formatPersianDate(filteredPulps.length.toString())} از {formatPersianDate(totalCount.toString())} رکورد
            {pageSize !== 'all' && ` (${formatPersianDate(pageSize.toString())} رکورد در هر صفحه)`}
          </p>
        </div>
        
        <button onClick={onCreate} className="btn-primary">
          <Plus className="w-5 h-5 ml-2" />
          افزودن نمونه جدید
        </button>
      </div>

      {/* Search and Page Size */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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