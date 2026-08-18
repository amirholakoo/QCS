import React, { useState, useEffect } from 'react';
import { Save, Trash2, ArrowLeft, Calendar, Factory, FileText, Settings, TestTube, Package, Gauge, Layers } from 'lucide-react';
import type { Paper, ProductionMachine, PM_Setting } from '../../types';
import { DatePicker } from '../common/DatePicker';
import { TimePicker } from '../common/TimePicker';
import { AutoComplete } from '../common/AutoComplete';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { getCurrentShamsiDate, getCurrentTime } from '../../utils/persianUtils';
import { useMaterials, usePaperSuggestions, useDeletePaper, useProductionMachines } from '../../hooks/useAPI';
import { useToast } from '../common/Toast';

interface PaperFormProps {
  paper?: Paper;
  onSave: (paper: Omit<Paper, 'id' | 'created_at' | 'last_updated' | 'user'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

export const PaperForm: React.FC<PaperFormProps> = ({ paper, onSave, onCancel, onDelete, readOnly = false }) => {
  const { showToast } = useToast();
  const { deletePaper, loading: deleteLoading } = useDeletePaper();
  const [deleteDialog, setDeleteDialog] = useState(false);
  
  // API hooks
  const { data: materialsData } = useMaterials();
  const { data: suggestionsData } = usePaperSuggestions();
  const { data: productionMachinesData } = useProductionMachines();
  
  const materials = materialsData?.results || [];
  // Handle both array and paginated response - ensure it's always an array
  const productionMachines: ProductionMachine[] = (() => {
    if (!productionMachinesData) return [];
    if (Array.isArray(productionMachinesData)) {
      return productionMachinesData;
    }
    if (productionMachinesData && typeof productionMachinesData === 'object' && 'results' in productionMachinesData) {
      return Array.isArray(productionMachinesData.results) ? productionMachinesData.results : [];
    }
    return [];
  })();
  const suggestions = {
    responsiblePersonNames: suggestionsData?.responsible_person_names || [],
    materialNames: [],
    materialUsageAmounts: {} as Record<string, number[]>,
    materialUsageSuggestions: suggestionsData?.material_usage_suggestions || {},
    tempBeforePressSuggestions: suggestionsData?.temp_before_press_suggestions || [],
    tempAfterPressSuggestions: suggestionsData?.temp_after_press_suggestions || [],
    machineSpeedSuggestions: suggestionsData?.machine_speed_suggestions || [],
    paperSizeSuggestions: suggestionsData?.paper_size_suggestions || [],
  };
  
  // Form state
  const [formData, setFormData] = useState<Partial<Paper>>({
    user: '',
    date: getCurrentShamsiDate(),
    sampling_start_time: getCurrentTime(),
    sampling_end_time: getCurrentTime(),
    ProductionLine: 2,
    roll_number: '',
    responsible_person_name: '',
    shift: undefined,
    paper_type: undefined,
    paper_size: undefined,
    NumberOfTears: undefined,
    real_grammage: undefined,
    humidity: undefined,
    ash_percentage: undefined,
    cub: undefined,
    cylinder_temperature_before_press: undefined,
    cylinder_temperature_after_press: undefined,
    profile: undefined,
    density_valve: undefined,
    diluting_valve: undefined,
    density_valve2: undefined,
    diluting_valve2: undefined,
    density_valve3: undefined,
    diluting_valve3: undefined,
    density_valve4: undefined,
    diluting_valve4: undefined,
    density_valve5: undefined,
    diluting_valve5: undefined,
    burst_test: '',
    tensile_strength_md: undefined,
    tensile_strength_cd: undefined,
    cct1: undefined, cct2: undefined, cct3: undefined, cct4: undefined, cct5: undefined,
    rct1: undefined, rct2: undefined, rct3: undefined, rct4: undefined, rct5: undefined,
    tearing_time: '',
    ProductionDowntime: '',
    CauseOfTearing: '',
    calender_applied: false,
    machine_speed: undefined,
    material_usage: '',
  });

  // Material selection state with brand and description
  const [selectedMaterials, setSelectedMaterials] = useState<{
    [id: string]: {
      val: number | undefined;
      brand: string;
      text: string;
    }
  }>({});

  // PM Settings state
  const [pmSettings, setPmSettings] = useState<{
    [machineId: string]: {
      bottom: string;
      top: string;
      cylinder_temperature_before_press?: number;
      cylinder_temperature_after_press?: number;
    }
  }>({});

  // Initialize form with existing paper data
  useEffect(() => {
    if (paper) {
      console.log('Initializing form with existing paper data:', paper);
      setFormData(paper);
      
      // Parse material usage
      if (paper.material_usage) {
        try {
          const materialUsageData = JSON.parse(paper.material_usage);
          const materialUsageMap: {[id: string]: {val: number | undefined, brand: string, text: string}} = {};
          Object.entries(materialUsageData).forEach(([materialId, data]: [string, any]) => {
            if (data && typeof data === 'object') {
              materialUsageMap[materialId] = {
                val: data.val !== undefined && data.val !== null ? data.val : 1,
                brand: data.brand || '',
                text: data.text || ''
              };
            }
          });
          setSelectedMaterials(materialUsageMap);
        } catch (e) {
          // Fallback to old format for backward compatibility
          const materialUsageMap: {[id: string]: {val: number | undefined, brand: string, text: string}} = {};
          const pairs = paper.material_usage?.split(',') || [];
          pairs.forEach(pair => {
            const [materialId, amount] = pair.split(':');
            if (materialId && amount) {
              materialUsageMap[materialId] = {
                val: parseFloat(amount),
                brand: '',
                text: ''
              };
            }
          });
          setSelectedMaterials(materialUsageMap);
        }
      }

      // Initialize PM settings - merge existing settings with all machines
      const pmSettingsMap: {[machineId: string]: {bottom: string, top: string, cylinder_temperature_before_press?: number, cylinder_temperature_after_press?: number}} = {};
      
      // First, initialize all machines with empty values
      if (Array.isArray(productionMachines)) {
        productionMachines.forEach((machine: ProductionMachine) => {
          pmSettingsMap[machine.id] = { bottom: '', top: '' };
        });
      }
      
      // Then, override with existing settings from paper
      if (paper.pm_settings && paper.pm_settings.length > 0) {
        paper.pm_settings.forEach((setting: PM_Setting) => {
          if (pmSettingsMap[setting.production_machine]) {
            pmSettingsMap[setting.production_machine] = {
              bottom: setting.bottom || '',
              top: setting.top || '',
              cylinder_temperature_before_press: setting.cylinder_temperature_before_press,
              cylinder_temperature_after_press: setting.cylinder_temperature_after_press
            };
          }
        });
      }
      
      setPmSettings(pmSettingsMap);
    } else {
      // Initialize empty settings for all machines when creating new paper
      const emptySettings: {[machineId: string]: {bottom: string, top: string, cylinder_temperature_before_press?: number, cylinder_temperature_after_press?: number}} = {};
      if (Array.isArray(productionMachines)) {
        productionMachines.forEach((machine: ProductionMachine) => {
          emptySettings[machine.id] = { bottom: '', top: '' };
        });
      }
      setPmSettings(emptySettings);
    }
  }, [paper, productionMachines]);

  const updateFormData = (field: keyof Paper, value: any) => {
    console.log(`Updating field ${field} with value:`, value);
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      console.log(`New form data for ${field}:`, newData);
      return newData;
    });
  };

  const handleMaterialToggle = (materialId: string) => {
    setSelectedMaterials(prev => {
      const newSelection = { ...prev };
      if (newSelection[materialId]) {
        delete newSelection[materialId];
      } else {
        // Get suggested amount or default to 1
        const suggestedAmounts = suggestions.materialUsageAmounts[materialId];
        const defaultAmount = suggestedAmounts?.length ? suggestedAmounts[0] : 1;
        newSelection[materialId] = {
          val: defaultAmount,
          brand: '',
          text: ''
        };
      }
      return newSelection;
    });
  };

  const handleMaterialAmountChange = (materialId: string, amount: number | undefined) => {
    setSelectedMaterials(prev => ({
      ...prev,
      [materialId]: {
        ...prev[materialId],
        val: amount
      }
    }));
  };

  const handleMaterialBrandChange = (materialId: string, brand: string) => {
    setSelectedMaterials(prev => ({
      ...prev,
      [materialId]: {
        ...prev[materialId],
        brand
      }
    }));
  };

  const handleMaterialDescriptionChange = (materialId: string, text: string) => {
    setSelectedMaterials(prev => ({
      ...prev,
      [materialId]: {
        ...prev[materialId],
        text
      }
    }));
  };

  const handlePMSettingChange = (machineId: string, field: 'bottom' | 'top' | 'cylinder_temperature_before_press' | 'cylinder_temperature_after_press', value: string | number | undefined) => {
    setPmSettings(prev => ({
      ...prev,
      [machineId]: {
        ...prev[machineId] || { bottom: '', top: '' },
        [field]: value
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.date || !formData.sampling_start_time || !formData.sampling_end_time || 
        !formData.ProductionLine ||
        !formData.roll_number || !formData.responsible_person_name || 
        formData.ash_percentage === undefined || formData.ash_percentage === null ||
        formData.cub === undefined || formData.cub === null) {
      showToast('error', 'لطفاً فیلدهای اجباری را تکمیل کنید');
      return;
    }

    // Build material usage JSON string
    const materialUsageData = Object.entries(selectedMaterials).reduce((acc, [id, data]) => {
      // Only include materials with valid values
      if (data.val !== undefined && data.val !== null) {
        acc[id] = {
          val: data.val,
          brand: data.brand,
          text: data.text
        };
      }
      return acc;
    }, {} as {[id: string]: {val: number, brand: string, text: string}});
    
    const materialUsageString = JSON.stringify(materialUsageData);

    // Build PM settings array
    const pmSettingsArray = Object.entries(pmSettings).map(([machineId, setting]) => ({
      production_machine: machineId,
      bottom: setting.bottom || '',
      top: setting.top || '',
      cylinder_temperature_before_press: setting.cylinder_temperature_before_press,
      cylinder_temperature_after_press: setting.cylinder_temperature_after_press
    }));

    // Clean form data - convert empty strings to undefined for numeric fields
    const cleanFormData = (data: any) => {
      const cleaned: any = {};
      Object.keys(data).forEach(key => {
        const value = data[key];
        
        // Don't convert values to undefined - preserve the actual form state
        if (value === undefined || value === null) {
          // Keep undefined/null as is
          cleaned[key] = value;
        } else if (typeof value === 'string') {
          // For strings, keep empty strings as empty strings
          cleaned[key] = value;
        } else if (typeof value === 'number') {
          // For numbers, keep as is (including 0)
          cleaned[key] = value;
        } else if (typeof value === 'boolean') {
          // For booleans, keep as is
          cleaned[key] = value;
        } else {
          cleaned[key] = value;
        }
      });
      return cleaned;
    };

    const cleanedFormData = cleanFormData(formData);
    console.log('Original form data:', formData);
    console.log('Cleaned form data:', cleanedFormData);

    // Create paper data with proper typing
    const paperData: any = {
      date: cleanedFormData.date,
      sampling_start_time: cleanedFormData.sampling_start_time,
      sampling_end_time: cleanedFormData.sampling_end_time,
      ProductionLine: cleanedFormData.ProductionLine,
      roll_number: cleanedFormData.roll_number,
      responsible_person_name: cleanedFormData.responsible_person_name,
      shift: cleanedFormData.shift,
      paper_type: cleanedFormData.paper_type,
      paper_size: cleanedFormData.paper_size,
      NumberOfTears: cleanedFormData.NumberOfTears,
      real_grammage: cleanedFormData.real_grammage,
      humidity: cleanedFormData.humidity,
      ash_percentage: cleanedFormData.ash_percentage,
      cub: cleanedFormData.cub,
      cylinder_temperature_before_press: cleanedFormData.cylinder_temperature_before_press,
      cylinder_temperature_after_press: cleanedFormData.cylinder_temperature_after_press,
      profile: cleanedFormData.profile,
      density_valve: cleanedFormData.density_valve,
      diluting_valve: cleanedFormData.diluting_valve,
      density_valve2: cleanedFormData.density_valve2,
      diluting_valve2: cleanedFormData.diluting_valve2,
      density_valve3: cleanedFormData.density_valve3,
      diluting_valve3: cleanedFormData.diluting_valve3,
      density_valve4: cleanedFormData.density_valve4,
      diluting_valve4: cleanedFormData.diluting_valve4,
      density_valve5: cleanedFormData.density_valve5,
      diluting_valve5: cleanedFormData.diluting_valve5,
      burst_test: cleanedFormData.burst_test,
      tensile_strength_md: cleanedFormData.tensile_strength_md,
      tensile_strength_cd: cleanedFormData.tensile_strength_cd,
      cct1: cleanedFormData.cct1,
      cct2: cleanedFormData.cct2,
      cct3: cleanedFormData.cct3,
      cct4: cleanedFormData.cct4,
      cct5: cleanedFormData.cct5,
      rct1: cleanedFormData.rct1,
      rct2: cleanedFormData.rct2,
      rct3: cleanedFormData.rct3,
      rct4: cleanedFormData.rct4,
      rct5: cleanedFormData.rct5,
      tearing_time: cleanedFormData.tearing_time,
      ProductionDowntime: cleanedFormData.ProductionDowntime,
      CauseOfTearing: cleanedFormData.CauseOfTearing,
      calender_applied: cleanedFormData.calender_applied,
      machine_speed: cleanedFormData.machine_speed,
      material_usage: materialUsageString || '',
      pm_settings: pmSettingsArray,
    };

    console.log('Final paper data being sent:', paperData);
    onSave(paperData);
    showToast('success', paper ? 'رکورد با موفقیت ویرایش شد' : 'رکورد جدید ایجاد شد');
  };

  const isEditing = !!paper;

  const handleDeleteClick = () => {
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!paper) return;

    try {
      await deletePaper(paper.id.toString());
      showToast('success', 'رکورد کاغذ با موفقیت حذف شد');
      setDeleteDialog(false);
      if (onDelete) {
        onDelete();
      } else {
        onCancel();
      }
    } catch (error) {
      showToast('error', 'خطا در حذف رکورد کاغذ');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog(false);
  };

  return (
    <div className={`space-y-6 ${readOnly ? 'opacity-75' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {readOnly ? 'مشاهده رکورد کاغذ' : isEditing ? 'ویرایش رکورد کاغذ' : 'ایجاد رکورد جدید کاغذ'}
            </h2>
            <p className="text-gray-500 mt-1 text-sm">
              {readOnly ? 'اطلاعات رکورد تولید کاغذ' : 'اطلاعات کامل رکورد تولید کاغذ را وارد کنید'}
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
        <div className="card border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow duration-200">
          <div className="card-header bg-gradient-to-r from-blue-50 to-transparent">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="card-title text-blue-900">اطلاعات پایه</h3>
            </div>
          </div>
          <div className="card-body bg-gray-50/50">
            <div className="field-grid">
              <DatePicker
                label="تاریخ"
                required
                value={formData.date || ''}
                onChange={(value) => updateFormData('date', value)}
              />
              
              <TimePicker
                label="زمان شروع رول"
                required
                value={formData.sampling_start_time || ''}
                onChange={(value) => updateFormData('sampling_start_time', value)}
              />
              
              <TimePicker
                label="زمان خروج رول"
                required
                value={formData.sampling_end_time || ''}
                onChange={(value) => updateFormData('sampling_end_time', value)}
              />
              
              <div className="form-group">
                <label className="form-label">
                  خط تولید <span className="text-error-500 mr-1">*</span>
                </label>
                <select
                  required
                  value={formData.ProductionLine || 2}
                  onChange={(e) => updateFormData('ProductionLine', parseInt(e.target.value))}
                  className="form-select"
                  disabled={readOnly}
                >
                  <option value={2}>PM2-140</option>
                  <option value={3}>PM3-250</option>
                  <option value={4}>PM4-220</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  شماره رول <span className="text-error-500 mr-1">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.roll_number || ''}
                  onChange={(e) => updateFormData('roll_number', e.target.value)}
                  className="form-input"
                  placeholder="شماره رول را وارد کنید"
                  disabled={readOnly}
                />
              </div>
              
              <AutoComplete
                label="نام مسئول"
                required
                value={formData.responsible_person_name || ''}
                onChange={(value) => updateFormData('responsible_person_name', value)}
                suggestions={suggestions.responsiblePersonNames}
                placeholder="نام مسئول تولید"
              />
              
              <div className="form-group">
                <label className="form-label">شیفت</label>
                <select
                  value={formData.shift || ''}
                  onChange={(e) => updateFormData('shift', e.target.value || undefined)}
                  className="form-select"
                  disabled={readOnly}
                >
                  <option value="">انتخاب کنید</option>
                  <option value="day">روزانه</option>
                  <option value="night">شبانه</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Paper Specifications */}
        <div className="card border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-shadow duration-200">
          <div className="card-header bg-gradient-to-r from-purple-50 to-transparent">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              <h3 className="card-title text-purple-900">مشخصات کاغذ</h3>
            </div>
          </div>
          <div className="card-body bg-gray-50/50">
            <div className="field-grid">
              <div className="form-group">
                <label className="form-label">نوع کاغذ</label>
                <select
                  value={formData.paper_type || ''}
                  onChange={(e) => updateFormData('paper_type', e.target.value || undefined)}
                  className="form-select"
                >
                  <option value="">انتخاب کنید</option>
                  <option value="test_liner">تست لاینر</option>
                  <option value="float">فلوت</option>
                  <option value="white_top_test_liner">تست لاینر سفید</option>
                </select>
              </div>
              
              <AutoComplete
                label="عرض کاغذ"
                value={formData.paper_size === undefined || formData.paper_size === null ? '' : formData.paper_size.toString()}
                onChange={(value) => updateFormData('paper_size', value ? parseInt(value) : undefined)}
                suggestions={suggestions.paperSizeSuggestions.map((s: number) => s.toString())}
                placeholder="اندازه به سانتی‌متر"
              />
              
              <div className="form-group">
                <label className="form-label">گراماژ</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.real_grammage === undefined || formData.real_grammage === null ? '' : formData.real_grammage}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateFormData('real_grammage', undefined);
                    } else {
                      const numValue = parseFloat(value);
                      if (isNaN(numValue)) {
                        updateFormData('real_grammage', undefined);
                      } else {
                        updateFormData('real_grammage', numValue);
                      }
                    }
                  }}
                  className="form-input number-input"
                  placeholder="گرم بر متر مربع"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">رطوبت</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.humidity === undefined || formData.humidity === null ? '' : formData.humidity}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateFormData('humidity', undefined);
                    } else {
                      const numValue = parseFloat(value);
                      if (isNaN(numValue)) {
                        updateFormData('humidity', undefined);
                      } else {
                        updateFormData('humidity', numValue);
                      }
                    }
                  }}
                  className="form-input number-input"
                  placeholder="درصد رطوبت"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  ash <span className="text-red-500 mr-1">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.ash_percentage === undefined || formData.ash_percentage === null ? '' : formData.ash_percentage}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateFormData('ash_percentage', undefined);
                    } else {
                      const numValue = parseFloat(value);
                      if (isNaN(numValue)) {
                        updateFormData('ash_percentage', undefined);
                      } else {
                        updateFormData('ash_percentage', numValue);
                      }
                    }
                  }}
                  className="form-input number-input"
                  placeholder="ash"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  کاب <span className="text-red-500 mr-1">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.cub === undefined || formData.cub === null ? '' : formData.cub.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateFormData('cub', undefined);
                    } else {
                      const numValue = parseFloat(value);
                      if (isNaN(numValue)) {
                        updateFormData('cub', undefined);
                      } else {
                        updateFormData('cub', numValue);
                      }
                    }
                  }}
                  className="form-input number-input"
                  placeholder="کاب"
                />
              </div>
              
              <AutoComplete
                label="دمای سیلندر قبل از سایز پرس"
                value={formData.cylinder_temperature_before_press === undefined || formData.cylinder_temperature_before_press === null ? '' : formData.cylinder_temperature_before_press.toString()}
                onChange={(value) => updateFormData('cylinder_temperature_before_press', value ? parseFloat(value) : undefined)}
                suggestions={suggestions.tempBeforePressSuggestions.map(s => s.toString())}
                placeholder="درجه سانتی‌گراد"
              />
              
              <AutoComplete
                label="دمای سیلندر بعد از سایز پرس"
                value={formData.cylinder_temperature_after_press === undefined || formData.cylinder_temperature_after_press === null ? '' : formData.cylinder_temperature_after_press.toString()}
                onChange={(value) => updateFormData('cylinder_temperature_after_press', value ? parseFloat(value) : undefined)}
                suggestions={suggestions.tempAfterPressSuggestions.map(s => s.toString())}
                placeholder="درجه سانتی‌گراد"
              />
              <div className="form-group">
                <label className="form-label">پروفایل</label>
                <select
                  value={formData.profile || ''}
                  onChange={(e) => updateFormData('profile', e.target.value || undefined)}
                  className="form-select"
                >
                  <option value="">انتخاب کنید</option>
                  <option value="1">+۱g-</option>
                  <option value="2">+۲g-</option>
                  <option value="3">+۳g-</option>
                  <option value="4">+۴g-</option>
                  <option value="5">بیشتر از 5 گرم نوسان سر تا سر کاغذ</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Physical Specifications */}
        <div className="card border-l-4 border-l-amber-500 shadow-md hover:shadow-lg transition-shadow duration-200">
          <div className="card-header bg-gradient-to-r from-amber-50 to-transparent">
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-amber-600" />
              <h3 className="card-title text-amber-900">تنظیمات غلظت سنج</h3>
            </div>
          </div>
          <div className="card-body bg-gray-50/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="form-group">
                <label className="form-label">غلظت سنج 1 ( حوض 8 )</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.density_valve === undefined || formData.density_valve === null ? '' : formData.density_valve}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateFormData('density_valve', undefined);
                    } else {
                      const numValue = parseFloat(value);
                      if (isNaN(numValue)) {
                        updateFormData('density_valve', undefined);
                      } else {
                        updateFormData('density_valve', numValue);
                      }
                    }
                  }}
                  className="form-input number-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">رقیق کننده غلظت سنج 1 ( حوض 8 )</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.diluting_valve === undefined || formData.diluting_valve === null ? '' : formData.diluting_valve}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateFormData('diluting_valve', undefined);
                    } else {
                      const numValue = parseFloat(value);
                      if (isNaN(numValue)) {
                        updateFormData('diluting_valve', undefined);
                      } else {
                        updateFormData('diluting_valve', numValue);
                      }
                    }
                  }}
                  className="form-input number-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">غلظت سنج 2</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.density_valve2 === undefined || formData.density_valve2 === null ? '' : formData.density_valve2}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateFormData('density_valve2', undefined);
                    } else {
                      const numValue = parseFloat(value);
                      if (isNaN(numValue)) {
                        updateFormData('density_valve2', undefined);
                      } else {
                        updateFormData('density_valve2', numValue);
                      }
                    }
                  }}
                  className="form-input number-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">رقیق کننده غلظت سنج 2</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.diluting_valve2 === undefined || formData.diluting_valve2 === null ? '' : formData.diluting_valve2}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateFormData('diluting_valve2', undefined);
                    } else {
                      const numValue = parseFloat(value);
                      if (isNaN(numValue)) {
                        updateFormData('diluting_valve2', undefined);
                      } else {
                        updateFormData('diluting_valve2', numValue);
                      }
                    }
                  }}
                  className="form-input number-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">غلظت سنج 3</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.density_valve3 === undefined || formData.density_valve3 === null ? '' : formData.density_valve3}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateFormData('density_valve3', undefined);
                    } else {
                      const numValue = parseFloat(value);
                      if (isNaN(numValue)) {
                        updateFormData('density_valve3', undefined);
                      } else {
                        updateFormData('density_valve3', numValue);
                      }
                    }
                  }}
                  className="form-input number-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">رقیق کننده غلظت سنج 3</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.diluting_valve3 === undefined || formData.diluting_valve3 === null ? '' : formData.diluting_valve3}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateFormData('diluting_valve3', undefined);
                    } else {
                      const numValue = parseFloat(value);
                      if (isNaN(numValue)) {
                        updateFormData('diluting_valve3', undefined);
                      } else {
                        updateFormData('diluting_valve3', numValue);
                      }
                    }
                  }}
                  className="form-input number-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">غلظت سنج 4</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.density_valve4 === undefined || formData.density_valve4 === null ? '' : formData.density_valve4}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateFormData('density_valve4', undefined);
                    } else {
                      const numValue = parseFloat(value);
                      if (isNaN(numValue)) {
                        updateFormData('density_valve4', undefined);
                      } else {
                        updateFormData('density_valve4', numValue);
                      }
                    }
                  }}
                  className="form-input number-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">رقیق کننده غلظت سنج 4</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.diluting_valve4 === undefined || formData.diluting_valve4 === null ? '' : formData.diluting_valve4}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateFormData('diluting_valve4', undefined);
                    } else {
                      const numValue = parseFloat(value);
                      if (isNaN(numValue)) {
                        updateFormData('diluting_valve4', undefined);
                      } else {
                        updateFormData('diluting_valve4', numValue);
                      }
                    }
                  }}
                  className="form-input number-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">غلظت سنج 5</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.density_valve5 === undefined || formData.density_valve5 === null ? '' : formData.density_valve5}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateFormData('density_valve5', undefined);
                    } else {
                      const numValue = parseFloat(value);
                      if (isNaN(numValue)) {
                        updateFormData('density_valve5', undefined);
                      } else {
                        updateFormData('density_valve5', numValue);
                      }
                    }
                  }}
                  className="form-input number-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">رقیق کننده غلظت سنج 5</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.diluting_valve5 === undefined || formData.diluting_valve5 === null ? '' : formData.diluting_valve5}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateFormData('diluting_valve5', undefined);
                    } else {
                      const numValue = parseFloat(value);
                      if (isNaN(numValue)) {
                        updateFormData('diluting_valve5', undefined);
                      } else {
                        updateFormData('diluting_valve5', numValue);
                      }
                    }
                  }}
                  className="form-input number-input"
                />
              </div>
            </div>

            {/* PM Settings for each Production Machine */}
            {Array.isArray(productionMachines) && productionMachines.length > 0 && (
              <div className="mt-6 pt-6 border-t-2 border-gray-300">
                <div className="flex items-center gap-2 mb-4">
                  <Factory className="w-5 h-5 text-amber-600" />
                  <h4 className="text-lg font-semibold text-gray-900">تنظیمات ماشین‌های تولید</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                  {productionMachines.map((machine: ProductionMachine) => {
                    const setting = pmSettings[machine.id] || { bottom: '', top: '' };
                    return (
                      <React.Fragment key={machine.id}>
                        <div className="form-group">
                          <label className="form-label">
                            شیر خمیر هدباکس پایین {machine.title}
                          </label>
                          <input
                            type="text"
                            value={setting.bottom}
                            onChange={(e) => handlePMSettingChange(machine.id, 'bottom', e.target.value)}
                            className="form-input"
                            placeholder="شیر خمیر هدباکس پایین"
                            disabled={readOnly}
                          />
                        </div>
                        
                        <div className="form-group">
                          <label className="form-label">
                            شیر خمیر هدباکس بالا {machine.title}
                          </label>
                          <input
                            type="text"
                            value={setting.top}
                            onChange={(e) => handlePMSettingChange(machine.id, 'top', e.target.value)}
                            className="form-input"
                            placeholder="شیر خمیر هدباکس بالا"
                            disabled={readOnly}
                          />
                        </div>
                        
                        <div className="form-group">
                          <label className="form-label">
                            دمای سیلندر قبل از سایز پرس {machine.title}
                          </label>
                          <input
                            type="text"
                            value={setting.cylinder_temperature_before_press === undefined || setting.cylinder_temperature_before_press === null ? '' : setting.cylinder_temperature_before_press}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '') {
                                handlePMSettingChange(machine.id, 'cylinder_temperature_before_press', undefined);
                              } else {
                                const numValue = parseFloat(value);
                                if (isNaN(numValue)) {
                                  handlePMSettingChange(machine.id, 'cylinder_temperature_before_press', undefined);
                                } else {
                                  handlePMSettingChange(machine.id, 'cylinder_temperature_before_press', numValue);
                                }
                              }
                            }}
                            className="form-input"
                            placeholder="دمای سیلندر قبل از سایز پرس"
                            disabled={readOnly}
                          />
                        </div>
                        
                        <div className="form-group">
                          <label className="form-label">
                            دمای سیلندر بعد از سایز پرس {machine.title}
                          </label>
                          <input
                            type="text"
                            value={setting.cylinder_temperature_after_press === undefined || setting.cylinder_temperature_after_press === null ? '' : setting.cylinder_temperature_after_press}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '') {
                                handlePMSettingChange(machine.id, 'cylinder_temperature_after_press', undefined);
                              } else {
                                const numValue = parseFloat(value);
                                if (isNaN(numValue)) {
                                  handlePMSettingChange(machine.id, 'cylinder_temperature_after_press', undefined);
                                } else {
                                  handlePMSettingChange(machine.id, 'cylinder_temperature_after_press', numValue);
                                }
                              }
                            }}
                            className="form-input"
                            placeholder="دمای سیلندر بعد از سایز پرس"
                            disabled={readOnly}
                          />
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resistance Tests */}
        <div className="card border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow duration-200">
          <div className="card-header bg-gradient-to-r from-green-50 to-transparent">
            <div className="flex items-center gap-2">
              <TestTube className="w-5 h-5 text-green-600" />
              <h3 className="card-title text-green-900">تست‌های مقاومت</h3>
            </div>
          </div>
          <div className="card-body bg-gray-50/50">
            <div className="space-y-6">
              {/* Burst Test */}
              <div className="form-group">
                <label className="form-label">burst</label>
                <input
                  type="text"
                  value={formData.burst_test || ''}
                  onChange={(e) => updateFormData('burst_test', e.target.value)}
                  className="form-input"
                  placeholder="نتیجه تست یا 'دستگاه خراب'"
                />
              </div>
              
              {/* Tensile Strength */}
              <div className="field-grid-wide">
                <div className="form-group">
                  <label className="form-label">MD</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.tensile_strength_md === undefined || formData.tensile_strength_md === null ? '' : formData.tensile_strength_md}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        updateFormData('tensile_strength_md', undefined);
                      } else {
                        const numValue = parseFloat(value);
                        if (isNaN(numValue)) {
                          updateFormData('tensile_strength_md', undefined);
                        } else {
                          updateFormData('tensile_strength_md', numValue);
                        }
                      }
                    }}
                    className="form-input number-input"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">CD</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.tensile_strength_cd === undefined || formData.tensile_strength_cd === null ? '' : formData.tensile_strength_cd}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        updateFormData('tensile_strength_cd', undefined);
                      } else {
                        const numValue = parseFloat(value);
                        if (isNaN(numValue)) {
                          updateFormData('tensile_strength_cd', undefined);
                        } else {
                          updateFormData('tensile_strength_cd', numValue);
                        }
                      }
                    }}
                    className="form-input number-input"
                  />
                </div>
              </div>
              
              {/* CCT Tests */}
              <div>
                <label className="form-label">تست‌های CCT</label>
                <div className="cct-rct-grid">
                  {[1, 2, 3, 4, 5].map(num => (
                    <div key={`cct${num}`} className="form-group">
                      <label className="form-label text-xs">CCT {num}</label>
                      <input
                        type="number"
                        step="0.1"
                        value={(formData as any)[`cct${num}`] === undefined || (formData as any)[`cct${num}`] === null ? '' : (formData as any)[`cct${num}`]}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            updateFormData(`cct${num}` as keyof Paper, undefined);
                          } else {
                            const numValue = parseFloat(value);
                            if (isNaN(numValue)) {
                              updateFormData(`cct${num}` as keyof Paper, undefined);
                            } else {
                              updateFormData(`cct${num}` as keyof Paper, numValue);
                            }
                          }
                        }}
                        className="form-input number-input text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* RCT Tests */}
              <div>
                <label className="form-label">تست‌های RCT</label>
                <div className="cct-rct-grid">
                  {[1, 2, 3, 4, 5].map(num => (
                    <div key={`rct${num}`} className="form-group">
                      <label className="form-label text-xs">RCT {num}</label>
                      <input
                        type="number"
                        step="0.1"
                        value={(formData as any)[`rct${num}`] === undefined || (formData as any)[`rct${num}`] === null ? '' : (formData as any)[`rct${num}`]}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            updateFormData(`rct${num}` as keyof Paper, undefined);
                          } else {
                            const numValue = parseFloat(value);
                            if (isNaN(numValue)) {
                              updateFormData(`rct${num}` as keyof Paper, undefined);
                            } else {
                              updateFormData(`rct${num}` as keyof Paper, numValue);
                            }
                          }
                        }}
                        className="form-input number-input text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Production Details */}
        <div className="card border-l-4 border-l-orange-500 shadow-md hover:shadow-lg transition-shadow duration-200">
          <div className="card-header bg-gradient-to-r from-orange-50 to-transparent">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-orange-600" />
              <h3 className="card-title text-orange-900">جزئیات تولید</h3>
            </div>
          </div>
          <div className="card-body bg-gray-50/50">
            <div className="field-grid">
            <div className="form-group">
                <label className="form-label">تعداد پارگی</label>
                <input
                  type="number"
                  value={formData.NumberOfTears === undefined || formData.NumberOfTears === null ? '' : formData.NumberOfTears}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateFormData('NumberOfTears', undefined);
                    } else {
                      const numValue = parseInt(value);
                      if (isNaN(numValue)) {
                        updateFormData('NumberOfTears', undefined);
                      } else {
                        updateFormData('NumberOfTears', numValue);
                      }
                    }
                  }}
                  className="form-input number-input"
                  placeholder="تعداد پارگی"
                />
              </div>
              <div className="form-group">
                <label className="form-label">زمان پارگی</label>
                <input
                  type="text"
                  value={formData.tearing_time || ''}
                  onChange={(e) => updateFormData('tearing_time', e.target.value)}
                  className="form-input"
                  placeholder="زمان پارگی"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">زمان وقفه در تولید ( دقیقه )</label>
                <input
                  type="text"
                  value={formData.ProductionDowntime || ''}
                  onChange={(e) => updateFormData('ProductionDowntime', e.target.value)}
                  className="form-input"
                  placeholder="دقیقه"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">علت پارگی/توقف</label>
                <input
                  type="text"
                  value={formData.CauseOfTearing || ''}
                  onChange={(e) => updateFormData('CauseOfTearing', e.target.value)}
                  className="form-input"
                  placeholder="علت پارگی/توقف"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">کلندر اعمال شده</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="calender"
                      checked={formData.calender_applied === true}
                      onChange={() => updateFormData('calender_applied', true)}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="text-sm">بله</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="calender"
                      checked={formData.calender_applied === false}
                      onChange={() => updateFormData('calender_applied', false)}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="text-sm">خیر</span>
                  </label>
                </div>
              </div>
              
              <AutoComplete
                label="سرعت دستگاه"
                value={formData.machine_speed === undefined || formData.machine_speed === null ? '' : formData.machine_speed.toString()}
                onChange={(value) => updateFormData('machine_speed', value ? parseFloat(value) : undefined)}
                suggestions={suggestions.machineSpeedSuggestions.map(s => s.toString())}
                placeholder="متر در دقیقه"
              />
            </div>
          </div>
        </div>

        {/* Material Usage */}
        <div className="card border-l-4 border-l-indigo-500 shadow-md hover:shadow-lg transition-shadow duration-200">
          <div className="card-header bg-gradient-to-r from-indigo-50 to-transparent">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              <h3 className="card-title text-indigo-900">مصرف مواد</h3>
            </div>
          </div>
          <div className="card-body bg-gray-50/50">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">مواد استفاده شده و مقدار هر یک را انتخاب کنید:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {materials.map(material => {
                  const isSelected = selectedMaterials[material.id] !== undefined;
                  const materialData = selectedMaterials[material.id] || { val: 1, brand: '', text: '' };
                  
                  return (
                    <div
                      key={material.id}
                      className={`material-selector ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleMaterialToggle(material.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{material.material_name}</h4>
                          {material.description && (
                            <p className="text-sm text-gray-600 mt-1">{material.description}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleMaterialToggle(material.id)}
                            className="w-4 h-4 text-primary-600"
                          />
                        </div>
                      </div>
                      
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              مقدار
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={materialData.val === undefined || materialData.val === null ? '' : materialData.val}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                  handleMaterialAmountChange(material.id, undefined);
                                } else {
                                  const numValue = parseFloat(value);
                                  if (isNaN(numValue)) {
                                    handleMaterialAmountChange(material.id, undefined);
                                  } else {
                                    handleMaterialAmountChange(material.id, numValue);
                                  }
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="form-input w-full number-input"
                              placeholder="مقدار"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              برند
                            </label>
                            <input
                              type="text"
                              value={materialData.brand}
                              onChange={(e) => handleMaterialBrandChange(material.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="form-input w-full"
                              placeholder="نام برند"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              توضیحات
                            </label>
                            <textarea
                              value={materialData.text}
                              onChange={(e) => handleMaterialDescriptionChange(material.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="form-input w-full"
                              placeholder="توضیحات اضافی"
                              rows={2}
                            />
                          </div>
                          
                          {/* Suggestions for this material */}
                          <div className="mt-2 space-y-2">
                            {/* Amount suggestions */}
                            {suggestions.materialUsageSuggestions[material.id]?.amounts && suggestions.materialUsageSuggestions[material.id].amounts.length > 0 && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">مقادیر پیشنهادی:</p>
                                <div className="flex flex-wrap gap-1">
                                  {suggestions.materialUsageSuggestions[material.id].amounts.map(suggestedAmount => (
                                    <button
                                      key={suggestedAmount}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMaterialAmountChange(material.id, suggestedAmount);
                                      }}
                                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                    >
                                      {suggestedAmount}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Brand suggestions */}
                            {suggestions.materialUsageSuggestions[material.id]?.brands && suggestions.materialUsageSuggestions[material.id].brands.length > 0 && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">برندهای پیشنهادی:</p>
                                <div className="flex flex-wrap gap-1">
                                  {suggestions.materialUsageSuggestions[material.id].brands.map(suggestedBrand => (
                                    <button
                                      key={suggestedBrand}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMaterialBrandChange(material.id, suggestedBrand);
                                      }}
                                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                    >
                                      {suggestedBrand}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {materials.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>هیچ ماده‌ای در سیستم ثبت نشده است.</p>
                  <p className="text-sm">ابتدا از بخش "مواد" مواد مورد نیاز را اضافه کنید.</p>
                </div>
              )}
            </div>
          </div>
        </div>



        {/* Submit Actions */}
        {!readOnly && (
          <div className="flex justify-end pt-6 border-t-2 border-gray-300 bg-white rounded-lg p-4 shadow-sm">
            <div className="flex gap-3">
              <button type="button" onClick={onCancel} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 rounded-lg inline-flex items-center transition-all duration-200 shadow-sm hover:shadow">
                انصراف
              </button>
              {isEditing && (
                <button 
                  type="button" 
                  onClick={handleDeleteClick}
                  className="px-5 py-2.5 bg-red-500 text-white font-medium hover:bg-red-600 rounded-lg inline-flex items-center transition-all duration-200 shadow-sm hover:shadow"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف رکورد
                </button>
              )}
              <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 rounded-lg inline-flex items-center transition-all duration-200 shadow-md hover:shadow-lg">
                <Save className="w-4 h-4 ml-2" />
                {isEditing ? 'ذخیره تغییرات' : 'ایجاد رکورد'}
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
        title="حذف رکورد کاغذ"
        message={`آیا از حذف رکورد کاغذ شماره ${paper?.roll_number} اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        confirmText="حذف"
        cancelText="انصراف"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};