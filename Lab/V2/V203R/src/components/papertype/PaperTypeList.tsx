import React, { useState } from 'react';
import { Plus, Search, Edit, Eye, Trash2, FileType } from 'lucide-react';
import type { PaperTypeItem } from '../../types';
import { usePaperTypes, useDeletePaperType } from '../../hooks/useAPI';
import { formatPersianDate } from '../../utils/persianUtils';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { useToast } from '../common/Toast';

interface PaperTypeListProps {
  onEdit: (paperType: PaperTypeItem) => void;
  onView: (paperType: PaperTypeItem) => void;
  onCreate: () => void;
  onRefetch?: () => void;
}

export const PaperTypeList: React.FC<PaperTypeListProps> = ({ onEdit, onView, onCreate, onRefetch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    paperType: PaperTypeItem | null;
  }>({ isOpen: false, paperType: null });

  const { showToast } = useToast();
  const { deletePaperType, loading: deleteLoading } = useDeletePaperType();

  // Build API parameters
  const apiParams: Record<string, string> = {};
  if (searchTerm) apiParams.search = searchTerm;
  
  const { data: paperTypesData, loading, error, refetch } = usePaperTypes({ ...apiParams, refreshKey: refreshKey.toString() });
  const paperTypes = paperTypesData?.results || [];
  const totalCount = paperTypesData?.count || 0;

  // Filter paper types based on search
  const filteredPaperTypes = paperTypes.filter(paperType => {
    const searchLower = searchTerm.toLowerCase();
    return paperType.name.toLowerCase().includes(searchLower);
  });

  const handleDeleteClick = (paperType: PaperTypeItem) => {
    setDeleteDialog({ isOpen: true, paperType });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.paperType) return;

    try {
      await deletePaperType(deleteDialog.paperType.id.toString());
      showToast('success', 'نوع کاغذ با موفقیت حذف شد');
      setDeleteDialog({ isOpen: false, paperType: null });
      
      // Force refresh the data by updating the refresh key
      setRefreshKey(prev => prev + 1);
      
      // Also call refetch as backup
      setTimeout(() => {
        refetch();
      }, 100);
    } catch (error) {
      showToast('error', 'خطا در حذف نوع کاغذ');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, paperType: null });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <p>خطا در دریافت اطلاعات: {error}</p>
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
          <h2 className="text-2xl font-semibold text-gray-900">مدیریت انواع کاغذ</h2>
          <p className="text-gray-600 mt-1">
            مجموع {formatPersianDate(totalCount.toString())} نوع کاغذ
          </p>
        </div>
        
        <button onClick={onCreate} className="btn-primary">
          <Plus className="w-5 h-5 ml-2" />
          افزودن نوع کاغذ جدید
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-body">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="جستجو بر اساس نام نوع کاغذ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pr-10"
            />
          </div>
        </div>
      </div>

      {/* Paper Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPaperTypes.length > 0 ? (
          filteredPaperTypes.map(paperType => (
            <div key={paperType.id} className="card">
              <div className="card-body">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <FileType className="w-5 h-5 text-primary-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {paperType.name}
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onView(paperType)}
                      className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                      title="مشاهده"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(paperType)}
                      className="text-primary-600 hover:text-primary-700 p-1 rounded hover:bg-primary-50"
                      title="ویرایش"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(paperType)}
                      className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 space-y-1 mt-4">
                  <div>
                    تاریخ ایجاد: {new Date(paperType.created_at).toLocaleDateString('fa-IR')}
                  </div>
                  {paperType.created_at !== paperType.last_updated && (
                    <div>
                      آخرین ویرایش: {new Date(paperType.last_updated).toLocaleDateString('fa-IR')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full">
            <div className="card">
              <div className="card-body text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileType className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-lg font-medium mb-2 text-gray-900">هیچ نوع کاغذی یافت نشد</p>
                <p className="text-gray-600">نوع کاغذ جدیدی ایجاد کنید یا جستجو را تغییر دهید.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="حذف نوع کاغذ"
        message={`آیا از حذف نوع کاغذ "${deleteDialog.paperType?.name}" اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        confirmText="حذف"
        cancelText="انصراف"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};

