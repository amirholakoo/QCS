import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit, Eye, Trash2, Loader, Download } from 'lucide-react';
import type { Paper, PM_Setting } from '../../types';
import { useInfiniteScroll, useMaterials, useDeletePaper } from '../../hooks/useAPI';
import { paperAPI } from '../../utils/api';
import { formatPersianDate, formatPersianTime, isValidShamsiDate } from '../../utils/persianUtils';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { useToast } from '../common/Toast';
import { getProductionLineColors } from '../../utils/productionLineColors';

interface PaperListProps {
  onEdit: (paper: Paper) => void;
  onView: (paper: Paper) => void;
  onCreate: () => void;
  onRefetch?: () => void;
}

const getPmLineFromTitle = (title?: string | null): number | null => {
  if (!title) return null;
  const match = title.match(/pm\s*([0-9]+)/i);
  if (!match) return null;
  const lineNumber = parseInt(match[1], 10);
  return Number.isNaN(lineNumber) ? null : lineNumber;
};

const filterPmSettingsForPaper = (paper: Paper): PM_Setting[] => {
  if (!paper.pm_settings || paper.pm_settings.length === 0) return [];
  if (!paper.ProductionLine) return paper.pm_settings;

  return paper.pm_settings.filter((setting) => {
    const lineFromTitle = getPmLineFromTitle(setting.production_machine_title);
    if (lineFromTitle != null) {
      return lineFromTitle === paper.ProductionLine;
    }
    return true;
  });
};

export const PaperList: React.FC<PaperListProps> = ({ onEdit, onView, onCreate, onRefetch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterProductionLine, setFilterProductionLine] = useState<string>('');
  const [sortField, setSortField] = useState<string>('-roll_number');
  const [pageSize, setPageSize] = useState<number | 'all'>(50);
  const [exportStartDate, setExportStartDate] = useState<string>('');
  const [exportEndDate, setExportEndDate] = useState<string>('');
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    paper: Paper | null;
  }>({ isOpen: false, paper: null });

  const { showToast } = useToast();
  const { deletePaper, loading: deleteLoading } = useDeletePaper();
  const [exporting, setExporting] = useState(false);
  
  // Build API parameters (server-side search & filters)
  const apiParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (filterProductionLine) params.ProductionLine = filterProductionLine;
    if (sortField) params.sort_by = sortField;
    if (searchTerm) params.search = searchTerm;
    return params;
  }, [filterProductionLine, sortField, searchTerm]);
  
  // Use infinite scroll hook
  const { 
    data: papers, 
    loading, 
    loadingMore,
    error, 
    hasMore,
    totalCount,
    refetch,
    lastElementRef
  } = useInfiniteScroll<Paper>(paperAPI.list, apiParams, pageSize);
  
  const { data: materialsData } = useMaterials();
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
        const solubleInWater = data.Soluble_in_water;
        let item = `${materialName}: ${amount}`;
        if (solubleInWater !== undefined && solubleInWater !== null) {
          item += ` (محلول در آب: ${solubleInWater})`;
        }
        return item;
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
      
      // Refetch the data
      refetch();
    } catch (error) {
      showToast('error', 'خطا در حذف رکورد کاغذ');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, paper: null });
  };

  const handleExport = async () => {
    // Validate date format
    if (exportStartDate && !isValidShamsiDate(exportStartDate)) {
      showToast('error', 'فرمت تاریخ شروع صحیح نیست. فرمت صحیح: 1404-09-01');
      return;
    }
    if (exportEndDate && !isValidShamsiDate(exportEndDate)) {
      showToast('error', 'فرمت تاریخ پایان صحیح نیست. فرمت صحیح: 1404-09-30');
      return;
    }
    
    setExporting(true);
    try {
      // Build query params from current filters
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (filterProductionLine) params.ProductionLine = filterProductionLine;
      if (sortField) params.sort_by = sortField;
      if (exportStartDate) params.date_from = exportStartDate;
      if (exportEndDate) params.date_to = exportEndDate;
      
      await paperAPI.exportXlsx(params);
      showToast('success', 'فایل اکسل با موفقیت دانلود شد');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('error', 'خطا در دانلود فایل اکسل');
    } finally {
      setExporting(false);
    }
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">مدیریت کاغذ</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            نمایش {formatPersianDate(papers.length.toString())} از {formatPersianDate(totalCount.toString())} رکورد
            {pageSize !== 'all' && ` (${formatPersianDate(pageSize.toString())} رکورد در هر صفحه)`}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center flex-wrap">
          {/* Date Range Inputs for Export */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={exportStartDate}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only numbers and dashes
                  if (value === '' || /^[\d-]*$/.test(value)) {
                    setExportStartDate(value);
                  }
                }}
                placeholder="از تاریخ (مثال: 1404-09-01)"
                className="form-input sm:w-40"
                dir="ltr"
              />
              <span className="text-gray-500 text-sm hidden sm:inline">تا</span>
              <input
                type="text"
                value={exportEndDate}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only numbers and dashes
                  if (value === '' || /^[\d-]*$/.test(value)) {
                    setExportEndDate(value);
                  }
                }}
                placeholder="تا تاریخ (مثال: 1404-09-30)"
                className="form-input sm:w-40"
                dir="ltr"
              />
              {(exportStartDate || exportEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setExportStartDate('');
                    setExportEndDate('');
                  }}
                  className="btn-secondary btn-sm"
                  title="پاک کردن"
                >
                  پاک کردن
                </button>
              )}
            </div>
          </div>
          
          <button 
            onClick={handleExport} 
            disabled={exporting}
            className="btn-secondary flex items-center"
          >
            {exporting ? (
              <>
                <Loader className="w-5 h-5 ml-2 animate-spin" />
                در حال دانلود...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 ml-2" />
                خروجی اکسل
              </>
            )}
          </button>
          <button onClick={onCreate} className="btn-primary">
            <Plus className="w-5 h-5 ml-2" />
            افزودن رکورد جدید
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSearchTerm(searchInput);
              }}
            >
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="جستجو بر اساس شماره رول، مسئول یا تاریخ..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="form-input pr-10"
                />
              </div>
            </form>

            {/* Production Line Filter */}
            <select
              value={filterProductionLine}
              onChange={(e) => setFilterProductionLine(e.target.value)}
              className="form-select"
            >
              <option value="">همه خطوط تولید</option>
              <option value="2">PM2</option>
              <option value="3">PM3</option>
              <option value="4">PM4</option>
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

            {/* Page Size */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="form-select"
            >
              <option value="25">۲۵ رکورد</option>
              <option value="50">۵۰ رکورد</option>
              <option value="100">۱۰۰ رکورد</option>
              <option value="200">۲۰۰ رکورد</option>
            <option value="all">نمایش همه</option>
          </select>
        </div>
      </div>
    </div>

      {/* Papers Table */}
      <div className="card">
        <div className="card-body p-0">
          {papers.length > 0 ? (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="table">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr>
                    <th className="bg-gray-50">عملیات</th>
                    <th className="bg-gray-50">شماره رول</th>
                    <th className="bg-gray-50">خط تولید</th>
                    <th className="bg-gray-50">تاریخ - زمان</th>
                    <th className="bg-gray-50">شیفت</th>
                    <th className="bg-gray-50">نوع کاغذ</th>
                    <th className="bg-gray-50">عرض کاغذ</th>
                    <th className="bg-gray-50">گراماژ</th>
                    <th className="bg-gray-50">رطوبت</th>
                    <th className="bg-gray-50">خاکستر</th>
                    <th className="bg-gray-50">کاب</th>
                    <th className="bg-gray-50">پروفایل</th>
                    <th className="bg-gray-50">burst</th>
                    <th className="bg-gray-50">MD</th>
                    <th className="bg-gray-50">CD</th>
                    <th className="bg-gray-50">CCT</th>
                    <th className="bg-gray-50">RCT</th>
                    <th className="bg-gray-50"> پارگی</th>
                    <th className="bg-gray-50">کالندر</th>
                    <th className="bg-gray-50">سرعت</th>
                    <th className="bg-gray-50 table-gradient-divider">رقیق‌ساز (۱-۵)</th>
                    <th className="bg-gray-50">غلظت (۱-۵)</th>
                    <th className="bg-gray-50">مواد</th>
                    <th className="bg-gray-50">تنظیمات ماشین</th>
                  </tr>
                </thead>
                <tbody>
                  {papers.map((paper, index) => {
                    const pmSettings = filterPmSettingsForPaper(paper);
                    return (
                    <tr 
                      key={paper.id} 
                      className="table-row-hover"
                      ref={index === papers.length - 1 && pageSize !== 'all' ? lastElementRef : null}
                    >
                      <td>
                        <div className=" items-center gap-2">
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
                          {/* <button
                            onClick={() => handleDeleteClick(paper)}
                            className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button> */}
                        </div>
                      </td>
                      <td className="font-medium">
                        {paper.roll_number}
                      </td>
                      <td>
                        {paper.ProductionLine !== undefined && paper.ProductionLine !== null ? (
                          (() => {
                            const colors = getProductionLineColors(paper.ProductionLine);
                            return (
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
                                {colors.label}
                              </span>
                            );
                          })()
                        ) : '-'}
                      </td>
                      <td>{formatPersianDate(paper.date)} <br />{formatPersianTime(paper.sampling_start_time)} - {formatPersianTime(paper.sampling_end_time)}</td>
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
                        {paper.PaperType_name ? (
                          <span className="text-sm text-gray-600">
                            {paper.PaperType_name}
                          </span>
                        ) : '-'}
                      </td>
                      <td>{paper.paper_size || '-'}</td>
                      <td>{paper.real_grammage || '-'}</td>
                      <td>{paper.humidity || '-'}</td>
                      <td>{paper.ash_percentage || '-'}</td>
                      <td>{paper.cub || '-'}</td>
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
                              .map((val, index, array) => (
                                <React.Fragment key={index}>
                                  {val}
                                  {index < array.length - 1 && <br />}
                                </React.Fragment>
                              ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td>
                        {paper.rct1 || paper.rct2 || paper.rct3 || paper.rct4 || paper.rct5 ? (
                          <div style={{maxWidth: '55px', textWrap: 'wrap', minWidth: '55px'}} className="text-xs">
                            {[paper.rct1, paper.rct2, paper.rct3, paper.rct4, paper.rct5]
                              .filter(val => val !== null && val !== undefined)
                              .map((val, index, array) => (
                                <React.Fragment key={index}>
                                  {val}
                                  {index < array.length - 1 && <br />}
                                </React.Fragment>
                              ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td>{paper.NumberOfTears || ''}</td>
                      {/* - {paper.tearing_time || ''} */}
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
                      <td className="table-gradient-divider">
                        {paper.diluting_valve || paper.diluting_valve2 || paper.diluting_valve3 || paper.diluting_valve4 || paper.diluting_valve5 ? (
                          <div style={{maxWidth: '60px', textWrap: 'wrap', minWidth: '60px'}} className="text-xs">
                            {[paper.diluting_valve, paper.diluting_valve2, paper.diluting_valve3, paper.diluting_valve4, paper.diluting_valve5]
                              .map((val, index) => val !== null && val !== undefined ? `${index + 1}: ${val}` : null)
                              .filter(Boolean)
                              .map((item, idx, arr) => (
                                <React.Fragment key={idx}>
                                  {item}
                                  {idx < arr.length - 1 && <br />}
                                </React.Fragment>
                              ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td>
                        {paper.density_valve || paper.density_valve2 || paper.density_valve3 || paper.density_valve4 || paper.density_valve5 ? (
                          <div style={{maxWidth: '60px', textWrap: 'wrap', minWidth: '60px'}} className="text-xs">
                            {[paper.density_valve, paper.density_valve2, paper.density_valve3, paper.density_valve4, paper.density_valve5]
                              .map((val, index) => val !== null && val !== undefined ? `${index + 1}: ${val}` : null)
                              .filter(Boolean)
                              .map((item, idx, arr) => (
                                <React.Fragment key={idx}>
                                  {item}
                                  {idx < arr.length - 1 && <br />}
                                </React.Fragment>
                              ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="table-gradient-divider">
                        {paper.material_usage && (
                          <div 
                          style={{textWrap: 'wrap', minWidth: '90px'}}
                          className="text-xs text-gray-600 truncate" title={formatMaterialUsage(paper.material_usage)}>
                            {(() => {
                              try {
                                const materialUsage = JSON.parse(paper.material_usage);
                                const formattedItems = Object.entries(materialUsage).map(([materialId, data]: [string, any]) => {
                                  const materialName = materialMap[materialId] || `Material ${materialId}`;
                                  const amount = data.val || 0;
                                  const solubleInWater = data.Soluble_in_water;
                  return { materialName, amount, solubleInWater };
                                });
                return formattedItems.map(({ materialName, amount, solubleInWater }, index) => (
                  <div
                    key={index}
                    className="mb-1 pb-1 border-b border-gray-200 last:border-0"
                    dir="rtl"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="whitespace-nowrap text-right font-medium">{materialName}</span>
                      <span className="whitespace-nowrap">{amount}</span>
                    </div>
                    {solubleInWater !== undefined && solubleInWater !== null && (
                      <div className="flex items-center justify-between gap-1 mt-0.5 text-[10px] text-gray-500">
                        <span className="whitespace-nowrap text-right">محلول در آب:</span>
                        <span className="whitespace-nowrap">{solubleInWater}</span>
                      </div>
                    )}
                  </div>
                ));
                              } catch (error) {
                                return paper.material_usage;
                              }
                            })()}
                          </div>
                        )}
                      </td>
                      <td className="table-gradient-divider">
                        {pmSettings.length > 0 ? (
                          <div style={{maxWidth: '150px', textWrap: 'wrap', minWidth: '120px'}} className="text-xs">
                            {pmSettings.map((setting, idx) => {
                              const fields: Array<{ key: string; value: any }> = [];
                              
                              if (setting.bottom) fields.push({ key: 'پایین', value: setting.bottom });
                              if (setting.top) fields.push({ key: 'بالا', value: setting.top });
                              if (setting.cylinder_temperature_before_press != null) {
                                fields.push({ key: 'دما سیلندر قبل پرس', value: setting.cylinder_temperature_before_press });
                              }
                              if (setting.cylinder_temperature_after_press != null) {
                                fields.push({ key: 'دما سیلندر بعد پرس', value: setting.cylinder_temperature_after_press });
                              }
                              if (setting.paper_temperature_before_starch != null) {
                                fields.push({ key: 'دما کاغذ قبل نشاسته', value: setting.paper_temperature_before_starch });
                              }
                              if (setting.paper_temperature_before_pop_reel != null) {
                                fields.push({ key: 'دما کاغذ قبل پاپ ریل', value: setting.paper_temperature_before_pop_reel });
                              }

                              return (
                                <div key={setting.id || idx} className={idx < pmSettings.length - 1 ? "mb-2 pb-2 border-b border-gray-200" : ""}>
                                  {fields.map((field, fieldIdx) => (
                                    <div key={fieldIdx} className={fieldIdx < fields.length - 1 ? "mb-1 pb-1 border-b border-gray-200" : ""}>
                                      <div className="flex justify-between items-center gap-2">
                                        <span className="text-gray-600 text-[11px]">{field.key}:</span>
                                        <span className="font-medium text-gray-900 text-[11px]">{field.value}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                    );
                  })}
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
          
          {/* Loading More Indicator */}
          {loadingMore && (
            <div className="flex justify-center items-center p-4 border-t">
              <Loader className="w-6 h-6 animate-spin text-primary-600 ml-2" />
              <span className="text-gray-600">در حال بارگذاری...</span>
            </div>
          )}
          
          {/* End of List Message */}
          {!loadingMore && !hasMore && papers.length > 0 && (
            <div className="flex justify-center items-center p-4 border-t text-gray-500">
              <span>همه رکوردها نمایش داده شد</span>
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