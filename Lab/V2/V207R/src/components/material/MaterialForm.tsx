import React, { useState, useEffect } from 'react';
import { Save, ArrowRight, Trash2, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { deleteMaterial, loading: deleteLoading } = useDeleteMaterial();
  const [deleteDialog, setDeleteDialog] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Material>>({
    material_name: '',
    en_name: '',
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
      showToast('error', t('material.nameRequired'));
      return;
    }

    const materialData = {
      material_name: formData.material_name.trim(),
      en_name: formData.en_name?.trim() || '',
      description: formData.description?.trim() || '',
    };

    console.log('Sending material data:', materialData);
    onSave(materialData);
    showToast('success', material ? t('material.updateSuccess') : t('material.createSuccess'));
  };

  const isEditing = !!material;

  const handleDeleteClick = () => {
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!material) return;

    try {
      await deleteMaterial(material.id.toString());
      showToast('success', t('material.deleteSuccess'));
      setDeleteDialog(false);
      if (onDelete) {
        onDelete();
      } else {
        onCancel();
      }
    } catch (error) {
      showToast('error', t('material.deleteError'));
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
            {readOnly ? t('material.viewTitle') : isEditing ? t('material.editTitle') : t('material.createTitle')}
          </h2>
          <p className="text-gray-600 mt-1">
            {readOnly ? t('material.formDescription') : t('material.formDescriptionCreate')}
          </p>
        </div>
        
        <button onClick={onCancel} className="px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-lg transition-colors inline-flex items-center">
          {t('common.close')}
          <ArrowLeft className="w-5 h-5 mr-2" />
        </button>
      </div>

      <div className="">
        <form onSubmit={handleSubmit} className={`space-y-8 ${readOnly ? 'pointer-events-none' : ''}`}>
          {/* Material Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{t('material.materialInfo')}</h3>
            </div>
            <div className="card-body">
              <div className="space-y-6">
                <div className="form-group">
                  <label className="form-label">
                    {t('material.materialName')} <span className="text-error-500 mr-1">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.material_name || ''}
                    onChange={(e) => updateFormData('material_name', e.target.value)}
                    className="form-input"
                    placeholder={t('material.materialNamePlaceholder')}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">{t('material.enName')}</label>
                  <input
                    type="text"
                    value={formData.en_name || ''}
                    onChange={(e) => updateFormData('en_name', e.target.value)}
                    className="form-input"
                    placeholder={t('material.enNamePlaceholder')}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">{t('material.description')}</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    className="form-textarea"
                    placeholder={t('material.descriptionPlaceholder')}
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
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-lg inline-flex items-centertransition-colors">
                  {t('common.cancel')}
                </button>
                {isEditing && (
                <button 
                  type="button" 
                  onClick={handleDeleteClick}
                  className="btn-danger"
                >
                  <Trash2 className="w-5 h-5 ml-2" />
                  {t('material.deleteMaterial')}
                </button>
              )}
                <button type="submit" className="btn-primary">
                  <Save className="w-5 h-5 ml-2" />
                  {isEditing ? t('material.saveChanges') : t('material.createMaterial')}
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
        title={t('material.deleteConfirmTitle')}
        message={t('material.deleteConfirmMessage', { name: material?.material_name })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};