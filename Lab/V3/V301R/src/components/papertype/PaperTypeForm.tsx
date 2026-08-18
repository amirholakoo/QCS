import React, { useState, useEffect } from 'react';
import { Save, ArrowRight, Trash2, ArrowLeft, FileType, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PaperTypeItem } from '../../types';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { useToast } from '../common/Toast';
import { useDeletePaperType, usePermissions } from '../../hooks/useAPI';
import { paperTypeAPI } from '../../utils/api';

interface PaperTypeFormProps {
  paperType?: PaperTypeItem;
  onSave: (paperType: Omit<PaperTypeItem, 'id' | 'created_at' | 'last_updated'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

export const PaperTypeForm: React.FC<PaperTypeFormProps> = ({ paperType, onSave, onCancel, onDelete, readOnly = false }) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { deletePaperType, loading: deleteLoading } = useDeletePaperType();
  const { data: permissionsData } = usePermissions();
  const paperTypePerms = permissionsData?.permissions?.paper_type || { view: false, add: false, change: false, delete: false };
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [justDeleted, setJustDeleted] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  
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
      showToast('error', t('paperType.nameRequired'));
      return;
    }

    const paperTypeData = {
      name: formData.name.trim(),
    };

    onSave(paperTypeData);
    showToast('success', paperType ? t('paperType.updateSuccess') : t('paperType.createSuccess'));
  };

  const isEditing = !!paperType;

  const handleDeleteClick = () => {
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!paperType) return;
    const deletedId = String(paperType.id);
    try {
      await deletePaperType(deletedId);
      showToast('success', t('paperType.deleteSuccess'));
      setDeleteDialog(false);
      setJustDeleted(deletedId);
    } catch (error) {
      showToast('error', t('paperType.deleteError'));
    }
  };

  useEffect(() => {
    if (justDeleted == null) return;
    const timer = setTimeout(() => {
      setJustDeleted(null);
      onCancel();
    }, 5000);
    return () => clearTimeout(timer);
  }, [justDeleted, onCancel]);

  const handleRestorePaperType = async () => {
    if (justDeleted == null) return;
    setRestoring(true);
    try {
      await paperTypeAPI.restore(justDeleted);
      showToast('success', t('paperType.restoreSuccess'));
      setJustDeleted(null);
      onCancel();
    } catch {
      showToast('error', t('paperType.restoreError'));
    } finally {
      setRestoring(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog(false);
  };

  return (
    <div className={`space-y-6 ${readOnly ? 'opacity-75' : ''}`}>
      {justDeleted !== null && (
        <div className="fixed top-20 sm:top-24 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[100] shadow-xl rounded-lg bg-white border-2 border-primary-200 overflow-hidden">
          <div className="p-3 flex items-center gap-3">
            <span className="flex-1 text-sm text-gray-800">{t('common.undoDeleteMessage')}</span>
            <button type="button" onClick={handleRestorePaperType} disabled={restoring} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              {restoring ? '...' : t('common.return')}
            </button>
            <button type="button" onClick={() => { setJustDeleted(null); onCancel(); }} className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="h-1 bg-primary-100 rounded-b-lg overflow-hidden">
            <div className="return-alert-progress h-full bg-primary-500 rounded-b" />
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <FileType className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {readOnly ? t('paperType.viewTitle') : isEditing ? t('paperType.editTitle') : t('paperType.createTitle')}
            </h2>
            <p className="text-gray-600 mt-1">
              {readOnly ? t('paperType.formDescription') : t('paperType.formDescriptionCreate')}
            </p>
          </div>
        </div>
        
        <button onClick={onCancel} className="px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-lg transition-colors inline-flex items-center">
          {t('common.close')}
          <ArrowLeft className="w-5 h-5 mr-2" />
        </button>
      </div>

      <div className="">
        <form onSubmit={handleSubmit} className={`space-y-8 ${readOnly ? 'pointer-events-none' : ''}`}>
          {/* Paper Type Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{t('paperType.paperTypeInfo')}</h3>
            </div>
            <div className="card-body">
              <div className="space-y-6">
                <div className="form-group">
                  <label className="form-label">
                    {t('paperType.paperTypeName')} <span className="text-error-500 mr-1">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    className="form-input"
                    placeholder={t('paperType.paperTypeNamePlaceholder')}
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
                  {t('common.cancel')}
                </button>
                {isEditing && paperTypePerms.delete && (
                  <button 
                    type="button" 
                    onClick={handleDeleteClick}
                    className="btn-danger"
                  >
                    <Trash2 className="w-5 h-5 ml-2" />
                    {t('paperType.deletePaperType')}
                  </button>
                )}
                {((isEditing && paperTypePerms.change) || (!isEditing && paperTypePerms.add)) && (
                  <button type="submit" className="btn-primary">
                    <Save className="w-5 h-5 ml-2" />
                    {isEditing ? t('paperType.saveChanges') : t('paperType.createPaperType')}
                  </button>
                )}
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
        title={t('paperType.deleteConfirmTitle')}
        message={t('paperType.deleteConfirmMessage', { name: paperType?.name })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};

