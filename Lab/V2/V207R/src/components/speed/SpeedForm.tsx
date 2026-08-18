import React, { useState, useEffect } from 'react';
import { ArrowRight, Trash2, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Speed } from '../../types';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { useToast } from '../common/Toast';
import { useDeleteSpeed } from '../../hooks/useAPI';
import { SPEED_FIELDS } from './speedFields';

interface SpeedFormProps {
  speed?: Speed;
  onSave: (data: Partial<Speed>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

export const SpeedForm: React.FC<SpeedFormProps> = ({ speed, onSave, onCancel, onDelete, readOnly = false }) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { deleteSpeed, loading: deleteLoading } = useDeleteSpeed();
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [formData, setFormData] = useState<Partial<Speed>>({
    Roll_Number: '',
    Speed1: null,
    Speed2: null,
    Speed3: null,
    Speed4: null,
    Speed5: null,
    Speed6: null,
    Speed7: null,
    Speed8: null,
    Speed9: null,
    Speed10: null,
    Speed11: null,
    Speed12: null,
    Speed13: null,
    Speed14: null,
    Speed15: null,
    Speed16: null,
    Speed17: null,
    Speed18: null,
    Speed19: null,
    Speed20: null,
    Speed21: null,
    Speed22: null,
    Speed23: null,
    Speed24: null,
    Speed25: null,
    Speed26: null,
  });

  useEffect(() => {
    if (speed) {
      setFormData({
        Roll_Number: speed.Roll_Number ?? '',
        Speed1: speed.Speed1 ?? null,
        Speed2: speed.Speed2 ?? null,
        Speed3: speed.Speed3 ?? null,
        Speed4: speed.Speed4 ?? null,
        Speed5: speed.Speed5 ?? null,
        Speed6: speed.Speed6 ?? null,
        Speed7: speed.Speed7 ?? null,
        Speed8: speed.Speed8 ?? null,
        Speed9: speed.Speed9 ?? null,
        Speed10: speed.Speed10 ?? null,
        Speed11: speed.Speed11 ?? null,
        Speed12: speed.Speed12 ?? null,
        Speed13: speed.Speed13 ?? null,
        Speed14: speed.Speed14 ?? null,
        Speed15: speed.Speed15 ?? null,
        Speed16: speed.Speed16 ?? null,
        Speed17: speed.Speed17 ?? null,
        Speed18: speed.Speed18 ?? null,
        Speed19: speed.Speed19 ?? null,
        Speed20: speed.Speed20 ?? null,
        Speed21: speed.Speed21 ?? null,
        Speed22: speed.Speed22 ?? null,
        Speed23: speed.Speed23 ?? null,
        Speed24: speed.Speed24 ?? null,
        Speed25: speed.Speed25 ?? null,
        Speed26: speed.Speed26 ?? null,
      });
    }
  }, [speed]);

  const updateFormData = (field: keyof Speed, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<Speed> = {
      Roll_Number: formData.Roll_Number?.toString().trim() || null,
      Speed1: formData.Speed1 ?? null,
      Speed2: formData.Speed2 ?? null,
      Speed3: formData.Speed3 ?? null,
      Speed4: formData.Speed4 ?? null,
      Speed5: formData.Speed5 ?? null,
      Speed6: formData.Speed6 ?? null,
      Speed7: formData.Speed7 ?? null,
      Speed8: formData.Speed8 ?? null,
      Speed9: formData.Speed9 ?? null,
      Speed10: formData.Speed10 ?? null,
      Speed11: formData.Speed11 ?? null,
      Speed12: formData.Speed12 ?? null,
      Speed13: formData.Speed13 ?? null,
      Speed14: formData.Speed14 ?? null,
      Speed15: formData.Speed15 ?? null,
      Speed16: formData.Speed16 ?? null,
      Speed17: formData.Speed17 ?? null,
      Speed18: formData.Speed18 ?? null,
      Speed19: formData.Speed19 ?? null,
      Speed20: formData.Speed20 ?? null,
      Speed21: formData.Speed21 ?? null,
      Speed22: formData.Speed22 ?? null,
      Speed23: formData.Speed23 ?? null,
      Speed24: formData.Speed24 ?? null,
      Speed25: formData.Speed25 ?? null,
      Speed26: formData.Speed26 ?? null,
    };
    onSave(payload);
    showToast('success', speed ? t('speed.speedUpdateSuccess') : t('speed.speedCreateSuccess'));
  };

  const isEditing = !!speed;

  const handleDeleteClick = () => setDeleteDialog(true);
  const handleDeleteCancel = () => setDeleteDialog(false);
  const handleDeleteConfirm = async () => {
    if (!speed) return;
    try {
      await deleteSpeed(speed.id.toString());
      showToast('success', t('speed.speedDeleteSuccess'));
      setDeleteDialog(false);
      onDelete ? onDelete() : onCancel();
    } catch {
      showToast('error', t('speed.speedDeleteError'));
    }
  };

  return (
    <div className={`space-y-6 ${readOnly ? 'opacity-75' : ''}`}>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">
          {readOnly ? t('speed.viewSpeed') : isEditing ? t('speed.editSpeed') : t('speed.createSpeed')}
        </h2>
        <button type="button" onClick={onCancel} className="btn-secondary flex items-center">
          <ArrowLeft className="w-5 h-5 ml-2" />
          {t('common.back')}
        </button>
      </div>

      <form onSubmit={handleSubmit} className={`space-y-8 ${readOnly ? 'pointer-events-none' : ''}`}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{t('speed.speedInfo')}</h3>
          </div>
          <div className="card-body space-y-6">
            <div className="form-group">
              <label className="form-label">{t('speed.rollNumber')}</label>
              <input
                type="text"
                value={formData.Roll_Number ?? ''}
                onChange={e => updateFormData('Roll_Number', e.target.value)}
                className="form-input"
                placeholder={t('speed.rollNumberPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {SPEED_FIELDS.map(({ labelKey, speedKey }) => {
                const key = speedKey as keyof Speed;
                return (
                <div key={key} className="form-group">
                  <label className="form-label text-xl text-center">{labelKey.replace(/_/g, ' ')}</label>
                  <input
                    type="number"
                    value={formData[key] ?? ''}
                    onChange={e => {
                      const v = e.target.value;
                      updateFormData(key, v ? parseInt(v, 10) : null);
                    }}
                    className="form-input"
                    placeholder={t('speed.speedPlaceholder')}
                    style={{ direction: 'ltr', textAlign: 'left' }}
                  />
                </div>
              ); })}
            </div>
          </div>
        </div>

        {!readOnly && (
          <div className="flex justify-between items-center">
            <div>
              {isEditing && (
                <button type="button" onClick={handleDeleteClick} className="btn-danger flex items-center">
                  <Trash2 className="w-5 h-5 ml-2" />
                  {t('common.delete')}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onCancel} className="btn-secondary">
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary flex items-center">
                {t('common.save')}
                <ArrowRight className="w-5 h-5 mr-2" />
              </button>
            </div>
          </div>
        )}
      </form>

      <ConfirmationDialog
        isOpen={deleteDialog}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={t('speed.deleteConfirmTitle')}
        message={t('speed.deleteConfirmMessageSpeed', { drive: speed?.Roll_Number ?? '' })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};
