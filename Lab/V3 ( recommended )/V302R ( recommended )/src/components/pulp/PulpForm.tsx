import React, { useState, useEffect } from 'react';
import { Save, Trash2, ArrowLeft, Plus, X, Calendar, Clock, Factory, TestTube, Droplets, Thermometer, Gauge, MapPin, Beaker } from 'lucide-react';
import type { Pulp } from '../../types';
import { TimePicker } from '../common/TimePicker';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { useToast } from '../common/Toast';
import { useTranslation } from 'react-i18next';
import { useDeletePulp, usePermissions } from '../../hooks/useAPI';
import { pulpAPI } from '../../utils/api';

interface PulpFormData extends Omit<Pulp, 'id' | 'created_at' | 'last_updated'> {
  sampling_location_data?: Array<{ title: string; value: string }>;
}

interface PulpFormProps {
  pulp?: Pulp;
  onSave: (pulp: PulpFormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

export const PulpForm: React.FC<PulpFormProps> = ({ pulp, onSave, onCancel, onDelete, readOnly = false }) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { deletePulp, loading: deleteLoading } = useDeletePulp();
  const { data: permissionsData } = usePermissions();
  const pulpPerms = permissionsData?.permissions?.pulp || { view: false, add: false, change: false, delete: false };
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [justDeleted, setJustDeleted] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Pulp>>({
    roll_number: undefined,
    ProductionLine: undefined,
    lower_sampling_time: '',
    downpulpcount: undefined,
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

  // Sampling location key-value pairs state
  const [samplingLocations, setSamplingLocations] = useState<Array<{ id: string; title: string; value: string; isReadOnly?: boolean }>>([]);
  
  // Location names for suggestions
  const [locationNames, setLocationNames] = useState<Array<{ id: number; title: string }>>([]);
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');

  // Fetch location names on component mount
  useEffect(() => {
    const fetchLocationNames = async () => {
      try {
        const names = await pulpAPI.getLocationNames();
        setLocationNames(names);
      } catch (error) {
        showToast('error','خطا در دریافت محل های نمونه گیری | لطفا از اتصال اینترنت خود مطمئن شوید و دوباره وارد این بخش شوید.');
        console.error('Failed to fetch location names:', error);
      }
    };
    fetchLocationNames();
  }, []);

  // Initialize form with existing pulp data
  useEffect(() => {
    if (pulp) {
      setFormData(pulp);
      // Initialize sampling locations if they exist
      if (pulp.sampling_locations && pulp.sampling_locations.length > 0) {
        setSamplingLocations(
          pulp.sampling_locations.map((loc, index) => ({
            id: loc.id || `temp-${index}`,
            title: loc.title || '',
            value: loc.value || '',
            isReadOnly: false
          }))
        );
      } else {
        setSamplingLocations([]);
      }
    } else {
      setSamplingLocations([]);
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
      ProductionLine: formData.ProductionLine,
      lower_sampling_time: formData.lower_sampling_time,
      downpulpcount: formData.downpulpcount,
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
      sampling_location_data: samplingLocations.map(loc => ({
        title: loc.title,
        value: loc.value
      }))
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
    const deletedId = String(pulp.id);
    try {
      await deletePulp(deletedId);
      showToast('success', t('pulp.deleteSuccess'));
      setDeleteDialog(false);
      setJustDeleted(deletedId);
    } catch (error) {
      showToast('error', t('pulp.deleteError'));
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

  const handleRestorePulp = async () => {
    if (justDeleted == null) return;
    setRestoring(true);
    try {
      await pulpAPI.restore(justDeleted);
      showToast('success', t('pulp.restoreSuccess'));
      setJustDeleted(null);
      onCancel();
    } catch {
      showToast('error', t('pulp.restoreError'));
    } finally {
      setRestoring(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog(false);
  };

  const addSamplingLocation = () => {
    setSamplingLocations([...samplingLocations, { id: `temp-${Date.now()}`, title: '', value: '', isReadOnly: false }]);
  };

  const handleLocationNameSelect = (title: string) => {
    if (!title) return;
    
    // Check if this location is already added
    const exists = samplingLocations.some(loc => loc.title === title);
    if (exists) {
      showToast('warning', 'این موقعیت قبلاً اضافه شده است');
      setSelectedLocationName('');
      return;
    }
    
    // Add the location with read-only title
    setSamplingLocations([
      ...samplingLocations,
      { id: `temp-${Date.now()}`, title: title, value: '', isReadOnly: true }
    ]);
    setSelectedLocationName('');
  };

  const removeSamplingLocation = (id: string) => {
    setSamplingLocations(samplingLocations.filter(loc => loc.id !== id));
  };

  const updateSamplingLocation = (id: string, field: 'title' | 'value', value: string) => {
    setSamplingLocations(
      samplingLocations.map(loc => 
        loc.id === id ? { ...loc, [field]: value } : loc
      )
    );
  };

  return (
    <div className={`space-y-6 ${readOnly ? 'opacity-75' : ''}`}>
      {justDeleted !== null && (
        <div className="fixed top-20 sm:top-24 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[100] shadow-xl rounded-lg bg-white border-2 border-primary-200 overflow-hidden">
          <div className="p-3 flex items-center gap-3">
            <span className="flex-1 text-sm text-gray-800">{t('common.undoDeleteMessage')}</span>
            <button type="button" onClick={handleRestorePulp} disabled={restoring} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-lg">
            <Beaker className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {readOnly ? 'مشاهده نمونه خمیر کاغذ' : isEditing ? 'ویرایش نمونه خمیر کاغذ' : 'ایجاد نمونه جدید خمیر کاغذ'}
            </h2>
            <p className="text-gray-500 mt-1 text-sm">
              {readOnly ? 'اطلاعات نمونه خمیر کاغذ' : 'اطلاعات نمونه‌گیری خمیر کاغذ را وارد کنید'}
            </p>
          </div>
        </div>
        
        <button onClick={onCancel} className="px-4 py-2.5 bg-red-500 text-white font-medium hover:bg-red-600 rounded-lg transition-all duration-200 inline-flex items-center shadow-sm hover:shadow-md">
          <ArrowLeft className="w-4 h-4 ml-2" />
          بازگشت
        </button>
      </div>

      <form onSubmit={handleSubmit} className={`space-y-8 ${readOnly ? 'pointer-events-none' : ''}`}>
        {/* Basic Information */}
        <div className="card border-l-4 border-l-teal-500 shadow-md hover:shadow-lg transition-shadow duration-200">
          <div className="card-header bg-gradient-to-r from-teal-50 to-transparent">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              <h3 className="card-title text-teal-900">اطلاعات پایه</h3>
            </div>
          </div>
          <div className="card-body bg-gray-50/50">
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
              
              <div className="form-group">
                <label className="form-label">خط تولید</label>
                <select
                  value={formData.ProductionLine === undefined || formData.ProductionLine === null ? '' : formData.ProductionLine}
                  onChange={(e) => updateFormData('ProductionLine', e.target.value === '' ? undefined : parseInt(e.target.value))}
                  className="form-select"
                  disabled={readOnly}
                >
                  <option value="">انتخاب کنید</option>
                  <option value={0}>مشترک</option>
                  <option value={2}>PM2-140</option>
                  <option value={3}>PM3-250</option>
                  <option value={4}>PM4-220</option>
                </select>
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
        <div className="card border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow duration-200">
          <div className="card-header bg-gradient-to-r from-blue-50 to-transparent">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-600" />
              <h3 className="card-title text-blue-900">آزمایش‌های بخش پایین</h3>
            </div>
          </div>
          <div className="card-body bg-gray-50/50">
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
        <div className="card border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-shadow duration-200">
          <div className="card-header bg-gradient-to-r from-purple-50 to-transparent">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-purple-600" />
              <h3 className="card-title text-purple-900">آزمایش‌های بخش بالا</h3>
            </div>
          </div>
          <div className="card-body bg-gray-50/50">
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
        <div className="card border-l-4 border-l-amber-500 shadow-md hover:shadow-lg transition-shadow duration-200">
          <div className="card-header bg-gradient-to-r from-amber-50 to-transparent">
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-amber-600" />
              <h3 className="card-title text-amber-900">آزمایش‌های غلظت</h3>
            </div>
          </div>
          <div className="card-body bg-gray-50/50">
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
            
            {/* Location Names Select - Right after تیکنر */}
            {!readOnly && locationNames.length > 0 && (
              <div className="mt-6 pt-6 border-t-2 border-gray-300">
                <div className="form-group">
                  <label className="form-label">انتخاب از موقعیت‌های موجود</label>
                  <select
                    value={selectedLocationName}
                    onChange={(e) => {
                      const selected = e.target.value;
                      if (selected) {
                        handleLocationNameSelect(selected);
                      }
                    }}
                    className="form-select"
                  >
                    <option value="">انتخاب موقعیت...</option>
                    {locationNames.map((loc) => (
                      <option key={loc.id} value={loc.title}>
                        {loc.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            
            {/* Sampling Locations - Right after تیکنر */}
            {samplingLocations.length > 0 && (
              <div className="mt-4 space-y-3">
                {samplingLocations.map((location) => (
                  <div key={location.id} className="flex gap-4 items-center">
                    <div className="form-group flex-1">
                      <label className="form-label">محل نمونه گیری</label>
                      <input
                        type="text"
                        value={location.title}
                        onChange={(e) => updateSamplingLocation(location.id, 'title', e.target.value)}
                        className="form-input"
                        placeholder="نام محل نمونه گیری"
                        disabled={readOnly || location.isReadOnly}
                        readOnly={location.isReadOnly}
                      />
                    </div>
                    <div className="form-group flex-1">
                      <label className="form-label">مقدار</label>
                      <input
                        type="text"
                        value={location.value}
                        onChange={(e) => updateSamplingLocation(location.id, 'value', e.target.value)}
                        className="form-input"
                        placeholder="مقدار"
                        disabled={readOnly}
                      />
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => removeSamplingLocation(location.id)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center mb-0"
                        title="حذف"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {!readOnly && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={addSamplingLocation}
                  className="px-4 py-2 bg-blue-600 text-white font-bold hover:bg-blue-700 rounded-lg transition-colors inline-flex items-center"
                >
                  <Plus className="w-5 h-5 ml-2" />
                  افزودن موقعیت نمونه‌گیری
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Submit Actions */}
        {!readOnly && (
          <div className="flex justify-end pt-6 border-t-2 border-gray-300 bg-white rounded-lg p-4 shadow-sm">
            <div className="flex gap-3">
              <button type="button" onClick={onCancel} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 rounded-lg inline-flex items-center transition-all duration-200 shadow-sm hover:shadow">
                انصراف
              </button>
              {isEditing && pulpPerms.delete && (
                <button 
                  type="button" 
                  onClick={handleDeleteClick}
                  className="px-5 py-2.5 bg-red-500 text-white font-medium hover:bg-red-600 rounded-lg inline-flex items-center transition-all duration-200 shadow-sm hover:shadow"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف رکورد
                </button>
              )}
              {((isEditing && pulpPerms.change) || (!isEditing && pulpPerms.add)) && (
                <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-medium hover:from-teal-700 hover:to-teal-800 rounded-lg inline-flex items-center transition-all duration-200 shadow-md hover:shadow-lg">
                  <Save className="w-4 h-4 ml-2" />
                  {isEditing ? 'ذخیره تغییرات' : 'ایجاد نمونه'}
                </button>
              )}
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