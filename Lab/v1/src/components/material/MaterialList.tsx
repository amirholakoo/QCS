import React, { useState } from 'react';
import { Plus, Search, Edit, Eye, Trash2 } from 'lucide-react';
import type { Material } from '../../types';
import { useMaterials, useDeleteMaterial } from '../../hooks/useAPI';
import { formatPersianDate } from '../../utils/persianUtils';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { useToast } from '../common/Toast';

interface MaterialListProps {
  onEdit: (material: Material) => void;
  onView: (material: Material) => void;
  onCreate: () => void;
  onRefetch?: () => void;
}

export const MaterialList: React.FC<MaterialListProps> = ({ onEdit, onView, onCreate, onRefetch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    material: Material | null;
  }>({ isOpen: false, material: null });

  const { showToast } = useToast();
  const { deleteMaterial, loading: deleteLoading } = useDeleteMaterial();

  // Build API parameters
  const apiParams: Record<string, string> = {};
  if (searchTerm) apiParams.search = searchTerm;
  
  const { data: materialsData, loading, error, refetch } = useMaterials({ ...apiParams, refreshKey: refreshKey.toString() });
  const materials = materialsData?.results || [];
  const totalCount = materialsData?.count || 0;

  // Filter materials based on search
  const filteredMaterials = materials.filter(material => {
    const searchLower = searchTerm.toLowerCase();
    return (
      material.material_name.toLowerCase().includes(searchLower) ||
      (material.description && material.description.toLowerCase().includes(searchLower))
    );
  });

  const handleDeleteClick = (material: Material) => {
    setDeleteDialog({ isOpen: true, material });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.material) return;

    try {
      await deleteMaterial(deleteDialog.material.id.toString());
      showToast('success', 'ماده با موفقیت حذف شد');
      setDeleteDialog({ isOpen: false, material: null });
      
      // Force refresh the data by updating the refresh key
      setRefreshKey(prev => prev + 1);
      
      // Also call refetch as backup
      setTimeout(() => {
        refetch();
      }, 100);
    } catch (error) {
      showToast('error', 'خطا در حذف ماده');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, material: null });
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
          <h2 className="text-2xl font-semibold text-gray-900">مدیریت مواد</h2>
          <p className="text-gray-600 mt-1">
            مجموع {formatPersianDate(totalCount.toString())} ماده
          </p>
        </div>
        
        <button onClick={onCreate} className="btn-primary">
          <Plus className="w-5 h-5 ml-2" />
          افزودن ماده جدید
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-body">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="جستجو بر اساس نام ماده یا توضیحات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pr-10"
            />
          </div>
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.length > 0 ? (
          filteredMaterials.map(material => (
            <div key={material.id} className="card">
              <div className="card-body">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {material.material_name}
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onView(material)}
                      className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                      title="مشاهده"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(material)}
                      className="text-primary-600 hover:text-primary-700 p-1 rounded hover:bg-primary-50"
                      title="ویرایش"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(material)}
                      className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {material.description && (
                  <p className="text-gray-600 text-sm mb-4">
                    {material.description}
                  </p>
                )}
                
                <div className="text-xs text-gray-500 space-y-1">
                  <div>ایجادکننده: {material.user || 'نامشخص'}</div>
                  <div>
                    تاریخ ایجاد: {new Date(material.created_at).toLocaleDateString('fa-IR')}
                  </div>
                  {material.created_at !== material.last_updated && (
                    <div>
                      آخرین ویرایش: {new Date(material.last_updated).toLocaleDateString('fa-IR')}
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
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-lg font-medium mb-2 text-gray-900">هیچ ماده‌ای یافت نشد</p>
                <p className="text-gray-600">ماده جدیدی ایجاد کنید یا جستجو را تغییر دهید.</p>
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
        title="حذف ماده"
        message={`آیا از حذف ماده "${deleteDialog.material?.material_name}" اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        confirmText="حذف"
        cancelText="انصراف"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};