import React, { useState, useEffect } from 'react';
import { Save, Trash2, ArrowLeft } from 'lucide-react';
import type { ProductionMachine } from '../../types';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { useToast } from '../common/Toast';
import { useDeleteProductionMachine } from '../../hooks/useAPI';

interface ProductionMachineFormProps {
  machine?: ProductionMachine;
  onSave: (machine: Omit<ProductionMachine, 'id' | 'created_at' | 'last_updated'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

export const ProductionMachineForm: React.FC<ProductionMachineFormProps> = ({ machine, onSave, onCancel, onDelete, readOnly = false }) => {
  const { showToast } = useToast();
  const { deleteProductionMachine, loading: deleteLoading } = useDeleteProductionMachine();
  const [deleteDialog, setDeleteDialog] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<ProductionMachine>>({
    title: '',
  });

  // Initialize form with existing machine data
  useEffect(() => {
    if (machine) {
      setFormData(machine);
    }
  }, [machine]);

  const updateFormData = (field: keyof ProductionMachine, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title || !formData.title.trim()) {
      showToast('error', 'عنوان ماشین الزامی است');
      return;
    }

    const machineData = {
      title: formData.title.trim(),
    };

    console.log('Sending production machine data:', machineData);
    onSave(machineData);
    showToast('success', machine ? 'ماشین تولید با موفقیت ویرایش شد' : 'ماشین تولید جدید ایجاد شد');
  };

  const isEditing = !!machine;

  const handleDeleteClick = () => {
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!machine) return;

    try {
      await deleteProductionMachine(machine.id.toString());
      showToast('success', 'ماشین تولید با موفقیت حذف شد');
      setDeleteDialog(false);
      if (onDelete) {
        onDelete();
      } else {
        onCancel();
      }
    } catch (error) {
      showToast('error', 'خطا در حذف ماشین تولید');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog(false);
  };

  return (
    <div className={`space-y-6 ${readOnly ? 'opacity-75' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {readOnly ? 'مشاهده ماشین تولید' : isEditing ? 'ویرایش ماشین تولید' : 'افزودن ماشین تولید جدید'}
          </h2>
          <p className="text-gray-600 mt-1">
            {readOnly ? 'اطلاعات ماشین تولید' : 'اطلاعات ماشین تولید را وارد کنید'}
          </p>
        </div>
        
        <button onClick={onCancel} className="px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-lg transition-colors inline-flex items-center">
          بازگشت
          <ArrowLeft className="w-5 h-5 mr-2" />
        </button>
      </div>

      <div className="">
        <form onSubmit={handleSubmit} className={`space-y-8 ${readOnly ? 'pointer-events-none' : ''}`}>
          {/* Machine Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">اطلاعات ماشین تولید</h3>
            </div>
            <div className="card-body">
              <div className="space-y-6">
                <div className="form-group">
                  <label className="form-label">
                    عنوان ماشین <span className="text-error-500 mr-1">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title || ''}
                    onChange={(e) => updateFormData('title', e.target.value)}
                    className="form-input"
                    placeholder="عنوان ماشین تولید را وارد کنید"
                    disabled={readOnly}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          {!readOnly && (
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <div className="flex gap-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-lg inline-flex items-center transition-colors">
                  انصراف
                </button>
                {isEditing && (
                <button 
                  type="button" 
                  onClick={handleDeleteClick}
                  className="btn-danger"
                >
                  <Trash2 className="w-5 h-5 ml-2" />
                  حذف ماشین
                </button>
              )}
                <button type="submit" className="btn-primary">
                  <Save className="w-5 h-5 ml-2" />
                  {isEditing ? 'ذخیره تغییرات' : 'ایجاد ماشین'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="حذف ماشین تولید"
        message={`آیا از حذف ماشین تولید "${machine?.title}" اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        confirmText="حذف"
        cancelText="انصراف"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};

