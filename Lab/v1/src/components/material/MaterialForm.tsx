import React, { useState, useEffect } from 'react';
import { Save, ArrowRight, Trash2 } from 'lucide-react';
import type { Material } from '../../types';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { useToast } from '../common/Toast';
import { useDeleteMaterial } from '../../hooks/useAPI';

interface MaterialFormProps {
  material?: Material;
  onSave: (material: Omit<Material, 'id' | 'created_at' | 'last_updated'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

export const MaterialForm: React.FC<MaterialFormProps> = ({ material, onSave, onCancel, onDelete, readOnly = false }) => {
  const { showToast } = useToast();
  const { deleteMaterial, loading: deleteLoading } = useDeleteMaterial();
  const [deleteDialog, setDeleteDialog] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Material>>({
    material_name: '',
    description: '',
  });

  // Initialize form with existing material data
  useEffect(() => {
    if (material) {
      setFormData(material);
    }
  }, [material]);

  const updateFormData = (field: keyof Material, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.material_name || !formData.material_name.trim()) {
      showToast('error', 'نام ماده الزامی است');
      return;
    }

    const materialData = {
      material_name: formData.material_name.trim(),
      description: formData.description?.trim() || '',
    };

    console.log('Sending material data:', materialData);
    onSave(materialData);
    showToast('success', material ? 'ماده با موفقیت ویرایش شد' : 'ماده جدید ایجاد شد');
  };

  const isEditing = !!material;

  const handleDeleteClick = () => {
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!material) return;

    try {
      await deleteMaterial(material.id.toString());
      showToast('success', 'ماده با موفقیت حذف شد');
      setDeleteDialog(false);
      if (onDelete) {
        onDelete();
      } else {
        onCancel();
      }
    } catch (error) {
      showToast('error', 'خطا در حذف ماده');
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
            {readOnly ? 'مشاهده ماده' : isEditing ? 'ویرایش ماده' : 'افزودن ماده جدید'}
          </h2>
          <p className="text-gray-600 mt-1">
            {readOnly ? 'اطلاعات ماده' : 'اطلاعات ماده مورد استفاده در تولید را وارد کنید'}
          </p>
        </div>
        
        <button onClick={onCancel} className="btn-secondary">
          <ArrowRight className="w-5 h-5 ml-2" />
          بازگشت
        </button>
      </div>

      <div className="">
        <form onSubmit={handleSubmit} className={`space-y-8 ${readOnly ? 'pointer-events-none' : ''}`}>
          {/* Material Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">اطلاعات ماده</h3>
            </div>
            <div className="card-body">
              <div className="space-y-6">
                <div className="form-group">
                  <label className="form-label">
                    نام ماده <span className="text-error-500 mr-1">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.material_name || ''}
                    onChange={(e) => updateFormData('material_name', e.target.value)}
                    className="form-input"
                    placeholder="نام ماده را وارد کنید"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">توضیحات</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    className="form-textarea"
                    placeholder="توضیحات و جزئیات ماده..."
                    rows={4}
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
                <button type="button" onClick={onCancel} className="btn-secondary">
                  انصراف
                </button>
                {isEditing && (
                <button 
                  type="button" 
                  onClick={handleDeleteClick}
                  className="btn-danger"
                >
                  <Trash2 className="w-5 h-5 ml-2" />
                  حذف ماده
                </button>
              )}
                <button type="submit" className="btn-primary">
                  <Save className="w-5 h-5 ml-2" />
                  {isEditing ? 'ذخیره تغییرات' : 'ایجاد ماده'}
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
        title="حذف ماده"
        message={`آیا از حذف ماده "${material?.material_name}" اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        confirmText="حذف"
        cancelText="انصراف"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};