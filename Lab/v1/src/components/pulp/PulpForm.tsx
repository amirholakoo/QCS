import React, { useState, useEffect } from 'react';
import { Save, ArrowRight, Trash2 } from 'lucide-react';
import type { Pulp } from '../../types';
import { TimePicker } from '../common/TimePicker';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { useToast } from '../common/Toast';
import { useDeletePulp } from '../../hooks/useAPI';

interface PulpFormProps {
  pulp?: Pulp;
  onSave: (pulp: Omit<Pulp, 'id' | 'created_at' | 'last_updated'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

export const PulpForm: React.FC<PulpFormProps> = ({ pulp, onSave, onCancel, onDelete, readOnly = false }) => {
  const { showToast } = useToast();
  const { deletePulp, loading: deleteLoading } = useDeletePulp();
  const [deleteDialog, setDeleteDialog] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Pulp>>({
    roll_number: undefined,
    lower_sampling_time: '',
    downpulpcount: undefined,
    downpulpfreenes: undefined,
    lower_headbox_freeness: undefined,
    lower_ph: undefined,
    lower_pulp_temperature: undefined,
    lower_water_filter: undefined,
    upper_headbox_consistency: undefined,
    upper_headbox_freeness: undefined,
    upper_ph: undefined,
    upper_pulp_temperature: undefined,
    upper_water_filter: undefined,
    pond8_consistency: undefined,
    curtain_consistency: undefined,
    thickener_consistency: undefined,
  });

  // Initialize form with existing pulp data
  useEffect(() => {
    if (pulp) {
      setFormData(pulp);
    }
  }, [pulp]);

  const updateFormData = (field: keyof Pulp, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate numeric fields
    const numericFields = [
      'downpulpcount',
      'lower_headbox_freeness', 
      'lower_ph',
      'lower_pulp_temperature',
      'lower_water_filter',
      'upper_headbox_consistency',
      'upper_headbox_freeness',
      'upper_ph',
      'upper_pulp_temperature',
      'upper_water_filter',
      'pond8_consistency',
      'curtain_consistency',
      'thickener_consistency'
    ];

    for (const field of numericFields) {
      const value = formData[field as keyof Pulp];
      if (value !== undefined && value !== null && value !== '') {
        const numValue = parseFloat(value.toString());
        if (isNaN(numValue)) {
          showToast('error', `فیلد ${field} باید عدد معتبر باشد`);
          return;
        }
      }
    }
    
    const pulpData = {
      roll_number: formData.roll_number,
      lower_sampling_time: formData.lower_sampling_time,
      downpulpcount: formData.downpulpcount,
      downpulpfreenes: formData.downpulpfreenes,
      lower_headbox_freeness: formData.lower_headbox_freeness,
      lower_ph: formData.lower_ph,
      lower_pulp_temperature: formData.lower_pulp_temperature,
      lower_water_filter: formData.lower_water_filter,
      upper_headbox_consistency: formData.upper_headbox_consistency,
      upper_headbox_freeness: formData.upper_headbox_freeness,
      upper_ph: formData.upper_ph,
      upper_pulp_temperature: formData.upper_pulp_temperature,
      upper_water_filter: formData.upper_water_filter,
      pond8_consistency: formData.pond8_consistency,
      curtain_consistency: formData.curtain_consistency,
      thickener_consistency: formData.thickener_consistency,
    };

    onSave(pulpData);
    showToast('success', pulp ? 'نمونه خمیر با موفقیت ویرایش شد' : 'نمونه خمیر جدید ایجاد شد');
  };

  const isEditing = !!pulp;

  const handleDeleteClick = () => {
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!pulp) return;

    try {
      await deletePulp(pulp.id.toString());
      showToast('success', 'نمونه خمیر با موفقیت حذف شد');
      setDeleteDialog(false);
      if (onDelete) {
        onDelete();
      } else {
        onCancel();
      }
    } catch (error) {
      showToast('error', 'خطا در حذف نمونه خمیر');
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
            {readOnly ? 'مشاهده نمونه خمیر کاغذ' : isEditing ? 'ویرایش نمونه خمیر کاغذ' : 'ایجاد نمونه جدید خمیر کاغذ'}
          </h2>
          <p className="text-gray-600 mt-1">
            {readOnly ? 'اطلاعات نمونه خمیر کاغذ' : 'اطلاعات نمونه‌گیری خمیر کاغذ را وارد کنید'}
          </p>
        </div>
        
        <button onClick={onCancel} className="btn-secondary">
          <ArrowRight className="w-5 h-5 ml-2" />
          بازگشت
        </button>
      </div>

      <form onSubmit={handleSubmit} className={`space-y-8 ${readOnly ? 'pointer-events-none' : ''}`}>
        {/* Basic Information */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">اطلاعات پایه</h3>
          </div>
          <div className="card-body">
            <div className="field-grid-wide">
              <div className="form-group">
                <label className="form-label">شماره رول</label>
                <input
                  type="text"
                  value={formData.roll_number === undefined || formData.roll_number === null ? '' : formData.roll_number}
                  onChange={(e) => updateFormData('roll_number', e.target.value)}
                  className="form-input"
                  placeholder="شماره رول مرتبط (اختیاری)"
                />
              </div>
              
              <TimePicker
                label="زمان نمونه‌گیری"
                value={formData.lower_sampling_time || ''}
                onChange={(value) => updateFormData('lower_sampling_time', value)}
              />
            </div>
          </div>
        </div>

        {/* Lower Section Tests */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">آزمایش‌های بخش پایین</h3>
          </div>
          <div className="card-body">
            <div className="field-grid">
              <div className="form-group">
                <label className="form-label">کانس خمیر پایین</label>
                <input
                  type="text"
                  value={formData.downpulpcount === undefined || formData.downpulpcount === null ? '' : formData.downpulpcount}
                  onChange={(e) => updateFormData('downpulpcount', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">فرینس خمیر پایین</label>
                <input
                  type="text"
                  value={formData.lower_headbox_freeness === undefined || formData.lower_headbox_freeness === null ? '' : formData.lower_headbox_freeness}
                  onChange={(e) => updateFormData('lower_headbox_freeness', e.target.value)}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">pH خمیر پایین</label>
                <input
                  type="text"
                  value={formData.lower_ph === undefined || formData.lower_ph === null ? '' : formData.lower_ph}
                  onChange={(e) => updateFormData('lower_ph', e.target.value)}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">دمای خمیر پایین</label>
                <input
                  type="text"
                  value={formData.lower_pulp_temperature === undefined || formData.lower_pulp_temperature === null ? '' : formData.lower_pulp_temperature}
                  onChange={(e) => updateFormData('lower_pulp_temperature', e.target.value)}
                  className="form-input"
                  placeholder="درجه سانتی‌گراد"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">آب توری پایین</label>
                <input
                  type="text"
                  value={formData.lower_water_filter === undefined || formData.lower_water_filter === null ? '' : formData.lower_water_filter}
                  onChange={(e) => updateFormData('lower_water_filter', e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Upper Section Tests */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">آزمایش‌های بخش بالا</h3>
          </div>
          <div className="card-body">
            <div className="field-grid">
              <div className="form-group">
                <label className="form-label">کانس خمیر بالا</label>
                <input
                  type="text"
                  value={formData.upper_headbox_consistency === undefined || formData.upper_headbox_consistency === null ? '' : formData.upper_headbox_consistency}
                  onChange={(e) => updateFormData('upper_headbox_consistency', e.target.value)}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">فرینس خمیر بالا</label>
                <input
                  type="text"
                  value={formData.upper_headbox_freeness === undefined || formData.upper_headbox_freeness === null ? '' : formData.upper_headbox_freeness}
                  onChange={(e) => updateFormData('upper_headbox_freeness', e.target.value)}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">pH خمیر بالا</label>
                <input
                  type="text"
                  value={formData.upper_ph === undefined || formData.upper_ph === null ? '' : formData.upper_ph}
                  onChange={(e) => updateFormData('upper_ph', e.target.value)}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">دمای خمیر بالا</label>
                <input
                  type="text"
                  value={formData.upper_pulp_temperature === undefined || formData.upper_pulp_temperature === null ? '' : formData.upper_pulp_temperature}
                  onChange={(e) => updateFormData('upper_pulp_temperature', e.target.value)}
                  className="form-input"
                  placeholder="درجه سانتی‌گراد"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">آب توری بالا</label>
                <input
                  type="text"
                  value={formData.upper_water_filter === undefined || formData.upper_water_filter === null ? '' : formData.upper_water_filter}
                  onChange={(e) => updateFormData('upper_water_filter', e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Other Consistency Tests */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">آزمایش‌های غلظت</h3>
          </div>
          <div className="card-body">
            <div className="field-grid">
              <div className="form-group">
                <label className="form-label">count حوض ۸</label>
                <input
                  type="text"
                  value={formData.pond8_consistency === undefined || formData.pond8_consistency === null ? '' : formData.pond8_consistency}
                  onChange={(e) => updateFormData('pond8_consistency', e.target.value)}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">کردان</label>
                <input
                  type="text"
                  value={formData.curtain_consistency === undefined || formData.curtain_consistency === null ? '' : formData.curtain_consistency}
                  onChange={(e) => updateFormData('curtain_consistency', e.target.value)}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">تیکنر</label>
                <input
                  type="text"
                  value={formData.thickener_consistency === undefined || formData.thickener_consistency === null ? '' : formData.thickener_consistency}
                  onChange={(e) => updateFormData('thickener_consistency', e.target.value)}
                  className="form-input"
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
                حذف رکورد
              </button>
            )}
              <button type="submit" className="btn-primary">
                <Save className="w-5 h-5 ml-2" />
                {isEditing ? 'ذخیره تغییرات' : 'ایجاد نمونه'}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="حذف نمونه خمیر"
        message={`آیا از حذف نمونه خمیر شماره ${pulp?.roll_number || pulp?.id} اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        confirmText="حذف"
        cancelText="انصراف"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};