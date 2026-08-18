import React, { useState, useEffect } from 'react';
import { Save, ArrowRight, Trash2, ArrowLeft, FileType } from 'lucide-react';
import type { PaperTypeItem } from '../../types';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { useToast } from '../common/Toast';
import { useDeletePaperType } from '../../hooks/useAPI';

interface PaperTypeFormProps {
  paperType?: PaperTypeItem;
  onSave: (paperType: Omit<PaperTypeItem, 'id' | 'created_at' | 'last_updated'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

export const PaperTypeForm: React.FC<PaperTypeFormProps> = ({ paperType, onSave, onCancel, onDelete, readOnly = false }) => {
  const { showToast } = useToast();
  const { deletePaperType, loading: deleteLoading } = useDeletePaperType();
  const [deleteDialog, setDeleteDialog] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<PaperTypeItem>>({
    name: '',
  });

  // Initialize form with existing paper type data
  useEffect(() => {
    if (paperType) {
      setFormData(paperType);
    }
  }, [paperType]);

  const updateFormData = (field: keyof PaperTypeItem, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.name.trim()) {
      showToast('error', 'نام نوع کاغذ الزامی است');
      return;
    }

    const paperTypeData = {
      name: formData.name.trim(),
    };

    onSave(paperTypeData);
    showToast('success', paperType ? 'نوع کاغذ با موفقیت ویرایش شد' : 'نوع کاغذ جدید ایجاد شد');
  };

  const isEditing = !!paperType;

  const handleDeleteClick = () => {
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!paperType) return;

    try {
      await deletePaperType(paperType.id.toString());
      showToast('success', 'نوع کاغذ با موفقیت حذف شد');
      setDeleteDialog(false);
      if (onDelete) {
        onDelete();
      } else {
        onCancel();
      }
    } catch (error) {
      showToast('error', 'خطا در حذف نوع کاغذ');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog(false);
  };

  return (
    <div className={`space-y-6 ${readOnly ? 'opacity-75' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <FileType className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {readOnly ? 'مشاهده نوع کاغذ' : isEditing ? 'ویرایش نوع کاغذ' : 'افزودن نوع کاغذ جدید'}
            </h2>
            <p className="text-gray-600 mt-1">
              {readOnly ? 'اطلاعات نوع کاغذ' : 'اطلاعات نوع کاغذ را وارد کنید'}
            </p>
          </div>
        </div>
        
        <button onClick={onCancel} className="px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-lg transition-colors inline-flex items-center">
          بازگشت
          <ArrowLeft className="w-5 h-5 mr-2" />
        </button>
      </div>

      <div className="">
        <form onSubmit={handleSubmit} className={`space-y-8 ${readOnly ? 'pointer-events-none' : ''}`}>
          {/* Paper Type Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">اطلاعات نوع کاغذ</h3>
            </div>
            <div className="card-body">
              <div className="space-y-6">
                <div className="form-group">
                  <label className="form-label">
                    نام نوع کاغذ <span className="text-error-500 mr-1">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    className="form-input"
                    placeholder="نام نوع کاغذ را وارد کنید"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          {!readOnly && (
            <div className="flex justify-end pt-6 border-t border-gray-200">
              {/* Delete button - only show when editing */}
              {/* Save and Cancel buttons */}
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
                  حذف نوع کاغذ
                </button>
              )}
                <button type="submit" className="btn-primary">
                  <Save className="w-5 h-5 ml-2" />
                  {isEditing ? 'ذخیره تغییرات' : 'ایجاد نوع کاغذ'}
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
        title="حذف نوع کاغذ"
        message={`آیا از حذف نوع کاغذ "${paperType?.name}" اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        confirmText="حذف"
        cancelText="انصراف"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};

