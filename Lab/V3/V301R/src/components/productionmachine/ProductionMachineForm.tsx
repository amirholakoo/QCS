import React, { useState, useEffect } from 'react';
import { Save, Trash2, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ProductionMachine } from '../../types';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { useToast } from '../common/Toast';
import { useDeleteProductionMachine, usePermissions } from '../../hooks/useAPI';

interface ProductionMachineFormProps {
  machine?: ProductionMachine;
  onSave: (machine: Omit<ProductionMachine, 'id' | 'created_at' | 'last_updated'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

export const ProductionMachineForm: React.FC<ProductionMachineFormProps> = ({ machine, onSave, onCancel, onDelete, readOnly = false }) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { deleteProductionMachine, loading: deleteLoading } = useDeleteProductionMachine();
  const { data: permissionsData } = usePermissions();
  const productionMachinePerms = permissionsData?.permissions?.production_machine || { view: false, add: false, change: false, delete: false };
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
      showToast('error', t('productionMachine.titleRequired'));
      return;
    }

    const machineData = {
      title: formData.title.trim(),
    };

    console.log('Sending production machine data:', machineData);
    onSave(machineData);
    showToast('success', machine ? t('productionMachine.updateSuccess') : t('productionMachine.createSuccess'));
  };

  const isEditing = !!machine;

  const handleDeleteClick = () => {
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!machine) return;

    try {
      await deleteProductionMachine(machine.id.toString());
      showToast('success', t('productionMachine.deleteSuccess'));
      setDeleteDialog(false);
      if (onDelete) {
        onDelete();
      } else {
        onCancel();
      }
    } catch (error) {
      showToast('error', t('productionMachine.deleteError'));
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
            {readOnly ? t('productionMachine.viewTitle') : isEditing ? t('productionMachine.editTitle') : t('productionMachine.createTitle')}
          </h2>
          <p className="text-gray-600 mt-1">
            {readOnly ? t('productionMachine.formDescription') : t('productionMachine.formDescriptionCreate')}
          </p>
        </div>
        
        <button onClick={onCancel} className="px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-lg transition-colors inline-flex items-center">
          {t('common.close')}
          <ArrowLeft className="w-5 h-5 mr-2" />
        </button>
      </div>

      <div className="">
        <form onSubmit={handleSubmit} className={`space-y-8 ${readOnly ? 'pointer-events-none' : ''}`}>
          {/* Machine Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{t('productionMachine.machineInfo')}</h3>
            </div>
            <div className="card-body">
              <div className="space-y-6">
                <div className="form-group">
                  <label className="form-label">
                    {t('productionMachine.machineTitle')} <span className="text-error-500 mr-1">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title || ''}
                    onChange={(e) => updateFormData('title', e.target.value)}
                    className="form-input"
                    placeholder={t('productionMachine.machineTitlePlaceholder')}
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
                  {t('common.cancel')}
                </button>
                {isEditing && productionMachinePerms.delete && (
                  <button 
                    type="button" 
                    onClick={handleDeleteClick}
                    className="btn-danger"
                  >
                    <Trash2 className="w-5 h-5 ml-2" />
                    {t('productionMachine.deleteMachine')}
                  </button>
                )}
                {((isEditing && productionMachinePerms.change) || (!isEditing && productionMachinePerms.add)) && (
                  <button type="submit" className="btn-primary">
                    <Save className="w-5 h-5 ml-2" />
                    {isEditing ? t('productionMachine.saveChanges') : t('productionMachine.createMachine')}
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
        title={t('productionMachine.deleteConfirmTitle')}
        message={t('productionMachine.deleteConfirmMessage', { name: machine?.title })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};

