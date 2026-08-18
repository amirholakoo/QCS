import React, { useState } from 'react';
import { Plus, Search, Edit, Eye, Trash2 } from 'lucide-react';
import type { ProductionMachine } from '../../types';
import { useProductionMachines, useDeleteProductionMachine } from '../../hooks/useAPI';
import { formatPersianDate } from '../../utils/persianUtils';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { useToast } from '../common/Toast';

interface ProductionMachineListProps {
  onEdit: (machine: ProductionMachine) => void;
  onView: (machine: ProductionMachine) => void;
  onCreate: () => void;
  onRefetch?: () => void;
}

export const ProductionMachineList: React.FC<ProductionMachineListProps> = ({ onEdit, onView, onCreate, onRefetch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    machine: ProductionMachine | null;
  }>({ isOpen: false, machine: null });

  const { showToast } = useToast();
  const { deleteProductionMachine, loading: deleteLoading } = useDeleteProductionMachine();

  const { data: machinesData, loading, error, refetch } = useProductionMachines();
  // Handle both array and paginated response
  const machines = Array.isArray(machinesData) 
    ? machinesData 
    : (machinesData?.results || []);

  // Filter machines based on search
  const filteredMachines = machines.filter(machine => {
    const searchLower = searchTerm.toLowerCase();
    return machine.title.toLowerCase().includes(searchLower);
  });

  const handleDeleteClick = (machine: ProductionMachine) => {
    setDeleteDialog({ isOpen: true, machine });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.machine) return;

    try {
      await deleteProductionMachine(deleteDialog.machine.id.toString());
      showToast('success', 'ماشین تولید با موفقیت حذف شد');
      setDeleteDialog({ isOpen: false, machine: null });
      
      // Force refresh the data
      setRefreshKey(prev => prev + 1);
      
      setTimeout(() => {
        refetch();
      }, 100);
    } catch (error) {
      showToast('error', 'خطا در حذف ماشین تولید');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, machine: null });
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
          <h2 className="text-2xl font-semibold text-gray-900">مدیریت ماشین‌های تولید</h2>
          <p className="text-gray-600 mt-1">
            مجموع {formatPersianDate(filteredMachines.length.toString())} ماشین تولید
          </p>
        </div>
        
        <button onClick={onCreate} className="btn-primary">
          <Plus className="w-5 h-5 ml-2" />
          افزودن ماشین جدید
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-body">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="جستجو بر اساس عنوان..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pr-10"
            />
          </div>
        </div>
      </div>

      {/* Machines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMachines.length > 0 ? (
          filteredMachines.map(machine => (
            <div key={machine.id} className="card">
              <div className="card-body">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {machine.title}
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onView(machine)}
                      className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                      title="مشاهده"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(machine)}
                      className="text-primary-600 hover:text-primary-700 p-1 rounded hover:bg-primary-50"
                      title="ویرایش"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(machine)}
                      className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 space-y-1">
                  <div>
                    تاریخ ایجاد: {new Date(machine.created_at).toLocaleDateString('fa-IR')}
                  </div>
                  {machine.created_at !== machine.last_updated && (
                    <div>
                      آخرین ویرایش: {new Date(machine.last_updated).toLocaleDateString('fa-IR')}
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
                <p className="text-lg font-medium mb-2 text-gray-900">هیچ ماشین تولیدی یافت نشد</p>
                <p className="text-gray-600">ماشین جدیدی ایجاد کنید یا جستجو را تغییر دهید.</p>
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
        title="حذف ماشین تولید"
        message={`آیا از حذف ماشین تولید "${deleteDialog.machine?.title}" اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        confirmText="حذف"
        cancelText="انصراف"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};

