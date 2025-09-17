import React, { useState } from 'react';
import { Plus, Search, Edit, Eye, Trash2 } from 'lucide-react';
import type { Paper } from '../../types';
import { usePapers, useMaterials, useDeletePaper } from '../../hooks/useAPI';
import { formatPersianDate, formatPersianTime } from '../../utils/persianUtils';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { useToast } from '../common/Toast';

interface PaperListProps {
  onEdit: (paper: Paper) => void;
  onView: (paper: Paper) => void;
  onCreate: () => void;
  onRefetch?: () => void;
}

export const PaperList: React.FC<PaperListProps> = ({ onEdit, onView, onCreate, onRefetch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShift, setFilterShift] = useState<string>('');
  const [sortField, setSortField] = useState<string>('-created_at');
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    paper: Paper | null;
  }>({ isOpen: false, paper: null });

  const { showToast } = useToast();
  const { deletePaper, loading: deleteLoading } = useDeletePaper();
  
  // Build API parameters
  const apiParams: Record<string, string> = {};
  if (searchTerm) apiParams.search = searchTerm;
  if (filterShift) apiParams.shift = filterShift;
  if (sortField) apiParams.sort_by = sortField;
  
  const { data: papersData, loading, error, refetch } = usePapers({ ...apiParams, refreshKey: refreshKey.toString() });
  const { data: materialsData } = useMaterials();
  
  // Expose refetch function to parent component
  const papers = papersData?.results || [];
  const totalCount = papersData?.count || 0;
  const materials = materialsData?.results || [];
  
  // Create a map of material ID to material name
  const materialMap = materials.reduce((acc, material) => {
    acc[material.id] = material.material_name;
    return acc;
  }, {} as Record<string, string>);
  
  // Function to format material usage
  const formatMaterialUsage = (materialUsageJson: string) => {
    if (!materialUsageJson) return '';
    
    try {
      const materialUsage = JSON.parse(materialUsageJson);
      const formattedItems = Object.entries(materialUsage).map(([materialId, data]: [string, any]) => {
        const materialName = materialMap[materialId] || `Material ${materialId}`;
        const amount = data.val || 0;
        return `${materialName}: ${amount}`;
      });
      return formattedItems.join(', ');
    } catch (error) {
      return materialUsageJson; // Fallback to raw string if JSON parsing fails
    }
  };

  const handleSortChange = (value: string) => {
    setSortField(value);
  };

  const handleDeleteClick = (paper: Paper) => {
    setDeleteDialog({ isOpen: true, paper });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.paper) return;

    try {
      await deletePaper(deleteDialog.paper.id.toString());
      showToast('success', 'رکورد کاغذ با موفقیت حذف شد');
      setDeleteDialog({ isOpen: false, paper: null });
      
      // Force refresh the data by updating the refresh key
      setRefreshKey(prev => prev + 1);
      
      // Also call refetch as backup
      setTimeout(() => {
        refetch();
      }, 100);
    } catch (error) {
      showToast('error', 'خطا در حذف رکورد کاغذ');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, paper: null });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <p>خطا در دریافت اطلاعات: {error}</p>
        <button onClick={refetch} className="btn-primary mt-4">
          تلاش مجدد
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">مدیریت کاغذ</h2>
          <p className="text-gray-600 mt-1">
            مجموع {formatPersianDate(totalCount.toString())} رکورد
          </p>
        </div>
        
        <button onClick={onCreate} className="btn-primary">
          <Plus className="w-5 h-5 ml-2" />
          افزودن رکورد جدید
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="جستجو بر اساس شماره رول، مسئول یا تاریخ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pr-10"
              />
            </div>

            {/* Shift Filter */}
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              className="form-select"
            >
              <option value="">همه شیفت‌ها</option>
              <option value="day">روزانه</option>
              <option value="night">شبانه</option>
            </select>

            {/* Sort */}
            <select
              value={sortField}
              onChange={(e) => handleSortChange(e.target.value)}
              className="form-select"
            >
              <option value="-created_at">تاریخ (جدیدترین)</option>
              <option value="created_at">تاریخ (قدیمی‌ترین)</option>
              <option value="roll_number">شماره رول (صعودی)</option>
              <option value="-roll_number">شماره رول (نزولی)</option>
              <option value="responsible_person_name">نام مسئول (الفبایی)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Papers Table */}
      <div className="card">
        <div className="card-body p-0">
          {papers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>شماره رول</th>
                    <th>تاریخ - زمان</th>
                    <th>مسئول</th>
                    <th>شیفت</th>
                    <th>نوع کاغذ</th>
                    <th>اندازه کاغذ</th>
                    <th>گراماژ</th>
                    <th>رطوبت</th>
                    <th>خاکستر</th>
                    <th>کاب</th>
                    <th>دمای سیلندر (قبل/بعد)</th>
                    <th>پروفایل</th>
                    <th>شیر غلظت</th>
                    <th>شیر رقیق‌ساز</th>
                    <th>تست ترکیدگی</th>
                    <th>MD</th>
                    <th>CD</th>
                    <th>CCT</th>
                    <th>RCT</th>
                    <th> پارگی ( تعداد - زمان )</th>
                    <th>کالندر</th>
                    <th>سرعت ماشین</th>
                    <th>مواد</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {papers.map(paper => (
                    <tr key={paper.id} className="table-row-hover">
                      <td className="font-medium">
                        {paper.roll_number}
                      </td>
                      <td>{formatPersianDate(paper.date)} <br />{formatPersianTime(paper.sampling_start_time)} - {formatPersianTime(paper.sampling_end_time)}</td>
                      <td>{paper.responsible_person_name}</td>
                      <td>
                        {paper.shift && (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            paper.shift === 'day' 
                              ? 'bg-warning-100 text-warning-700' 
                              : 'bg-primary-100 text-primary-700'
                          }`}>
                            {paper.shift === 'day' ? 'روزانه' : 'شبانه'}
                          </span>
                        )}
                      </td>
                      <td>
                        {paper.paper_type && (
                          <span className="text-sm text-gray-600">
                            {paper.paper_type === 'test_liner' ? 'تست لاینر' :
                             paper.paper_type === 'float' ? 'فلوت' :
                             paper.paper_type === 'white_top_test_liner' ? 'تست لاینر سفید' : ''}
                          </span>
                        )}
                      </td>
                      <td>{paper.paper_size || '-'}</td>
                      <td>{paper.real_grammage || '-'}</td>
                      <td>{paper.humidity || '-'}</td>
                      <td>{paper.ash_percentage || '-'}</td>
                      <td>{paper.cub || '-'}</td>
                      <td>{paper.cylinder_temperature_before_press || '-'} - {paper.cylinder_temperature_after_press || '-'}</td>
                      <td>
                        {paper.profile && (
                          <span className="text-sm">
                            {paper.profile === '+1g' ? '+۱g-' :
                             paper.profile === '+2g' ? '+۲g-' :
                             paper.profile === '+3g' ? '+۳g-' :
                             paper.profile === '+4g' ? '+۴g-' :
                             paper.profile === '>5g' ? 'بیشتر از 5 گرم' : paper.profile}
                          </span>
                        )}
                      </td>
                      <td>{paper.density_valve || '-'}</td>
                      <td>{paper.diluting_valve || '-'}</td>
                      <td>
                        {paper.burst_test && (
                          <span className="text-sm text-gray-600">
                            {paper.burst_test}
                          </span>
                        )}
                      </td>
                      <td>{paper.tensile_strength_md || '-'}</td>
                      <td>{paper.tensile_strength_cd || '-'}</td>
                      <td>
                        {paper.cct1 || paper.cct2 || paper.cct3 || paper.cct4 || paper.cct5 ? (
                          <div style={{maxWidth: '55px', textWrap: 'wrap', minWidth: '55px'}} className="text-xs">
                            {[paper.cct1, paper.cct2, paper.cct3, paper.cct4, paper.cct5]
                              .filter(val => val !== null && val !== undefined)
                              .join(', ')}
                          </div>
                        ) : '-'}
                      </td>
                      <td>
                        {paper.rct1 || paper.rct2 || paper.rct3 || paper.rct4 || paper.rct5 ? (
                          <div style={{maxWidth: '55px', textWrap: 'wrap', minWidth: '55px'}} className="text-xs">
                            {[paper.rct1, paper.rct2, paper.rct3, paper.rct4, paper.rct5]
                              .filter(val => val !== null && val !== undefined)
                              .join(', ')}
                          </div>
                        ) : '-'}
                      </td>
                      <td>{paper.NumberOfTears || ''} - {paper.tearing_time || ''}</td>
                      <td>
                        {paper.calender_applied !== undefined && (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            paper.calender_applied 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {paper.calender_applied ? 'بله' : 'خیر'}
                          </span>
                        )}
                      </td>
                      <td>{paper.machine_speed || '-'}</td>
                      <td>
                        {paper.material_usage && (
                          <div 
                          style={{maxWidth: '90px', textWrap: 'wrap', minWidth: '90px'}}
                          className="text-xs text-gray-600 max-w-xs truncate" title={formatMaterialUsage(paper.material_usage)}>
                            {(() => {
                              const formatted = formatMaterialUsage(paper.material_usage);
                              return formatted.length > 100 
                                ? formatted.substring(0, 100) + '...' 
                                : formatted;
                            })()}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onView(paper)}
                            className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                            title="مشاهده"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEdit(paper)}
                            className="text-primary-600 hover:text-primary-700 p-1 rounded hover:bg-primary-50"
                            title="ویرایش"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(paper)}
                            className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium mb-2">هیچ رکوردی یافت نشد</p>
              <p>فیلترها را تغییر دهید یا رکورد جدیدی ایجاد کنید.</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="حذف رکورد کاغذ"
        message={`آیا از حذف رکورد کاغذ شماره ${deleteDialog.paper?.roll_number} اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        confirmText="حذف"
        cancelText="انصراف"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};