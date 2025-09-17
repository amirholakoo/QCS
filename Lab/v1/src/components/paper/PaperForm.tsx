import React, { useState, useEffect } from 'react';
import { Save, ArrowRight, Trash2 } from 'lucide-react';
import type { Paper, Material } from '../../types';
import { DatePicker } from '../common/DatePicker';
import { TimePicker } from '../common/TimePicker';
import { AutoComplete } from '../common/AutoComplete';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { getCurrentShamsiDate, getCurrentTime } from '../../utils/persianUtils';
import { useMaterials, usePaperSuggestions, useDeletePaper } from '../../hooks/useAPI';
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
  
  const materials = materialsData?.results || [];
  const suggestions = {
    responsiblePersonNames: suggestionsData?.responsible_person_names || [],
    materialNames: [],
    materialUsageAmounts: {} as Record<string, number[]>,
    materialUsageSuggestions: suggestionsData?.material_usage_suggestions || {},
    tempBeforePressSuggestions: suggestionsData?.temp_before_press_suggestions || [],
    tempAfterPressSuggestions: suggestionsData?.temp_after_press_suggestions || [],
    machineSpeedSuggestions: suggestionsData?.machine_speed_suggestions || [],
  };
  
  // Form state
  const [formData, setFormData] = useState<Partial<Paper>>({
    user: '',
    date: getCurrentShamsiDate(),
    sampling_start_time: getCurrentTime(),
    sampling_end_time: getCurrentTime(),
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
    burst_test: '',
    tensile_strength_md: undefined,
    tensile_strength_cd: undefined,
    cct1: undefined, cct2: undefined, cct3: undefined, cct4: undefined, cct5: undefined,
    rct1: undefined, rct2: undefined, rct3: undefined, rct4: undefined, rct5: undefined,
    tearing_time: '',
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
    }
  }, [paper]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.date || !formData.sampling_start_time || !formData.sampling_end_time || 
        !formData.roll_number || !formData.responsible_person_name) {
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
    const paperData: Omit<Paper, 'id' | 'created_at' | 'last_updated' | 'user'> = {
      date: cleanedFormData.date,
      sampling_start_time: cleanedFormData.sampling_start_time,
      sampling_end_time: cleanedFormData.sampling_end_time,
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
      calender_applied: cleanedFormData.calender_applied,
      machine_speed: cleanedFormData.machine_speed,
      material_usage: materialUsageString || '',
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {readOnly ? 'مشاهده رکورد کاغذ' : isEditing ? 'ویرایش رکورد کاغذ' : 'ایجاد رکورد جدید کاغذ'}
          </h2>
          <p className="text-gray-600 mt-1">
            {readOnly ? 'اطلاعات رکورد تولید کاغذ' : 'اطلاعات کامل رکورد تولید کاغذ را وارد کنید'}
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
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">مشخصات کاغذ</h3>
          </div>
          <div className="card-body">
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
              
              <div className="form-group">
                <label className="form-label">اندازه کاغذ</label>
                <input
                  type="number"
                  value={formData.paper_size === undefined || formData.paper_size === null ? '' : formData.paper_size}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateFormData('paper_size', undefined);
                    } else {
                      const numValue = parseInt(value);
                      if (isNaN(numValue)) {
                        updateFormData('paper_size', undefined);
                      } else {
                        updateFormData('paper_size', numValue);
                      }
                    }
                  }}
                  className="form-input number-input"
                  placeholder="اندازه به سانتی‌متر"
                />
              </div>
              
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
                <label className="form-label">گراماژ واقعی</label>
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
                <label className="form-label">درصد خاکستر</label>
                <input
                  type="number"
                  step="0.1"
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
                  placeholder="درصد خاکستر"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">کاب</label>
                <input
                  type="number"
                  step="0.1"
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
            </div>
          </div>
        </div>

        {/* Physical Specifications */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">مشخصات فیزیکی</h3>
          </div>
          <div className="card-body">
            <div className="field-grid">
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
              
              <div className="form-group">
                <label className="form-label">شیر غلظت</label>
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
                <label className="form-label">شیر رقیق‌ساز</label>
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
            </div>
          </div>
        </div>

        {/* Resistance Tests */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">تست‌های مقاومت</h3>
          </div>
          <div className="card-body">
            <div className="space-y-6">
              {/* Burst Test */}
              <div className="form-group">
                <label className="form-label">تست ترکیدگی</label>
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
                  <label className="form-label">مقاومت کششی MD</label>
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
                  <label className="form-label">مقاومت کششی CD</label>
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
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">جزئیات تولید</h3>
          </div>
          <div className="card-body">
            <div className="field-grid">
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
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">مصرف مواد</h3>
          </div>
          <div className="card-body">
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
                                  {suggestions.materialUsageSuggestions[material.id].amounts.slice(0, 5).map(suggestedAmount => (
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
                                  {suggestions.materialUsageSuggestions[material.id].brands.slice(0, 5).map(suggestedBrand => (
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