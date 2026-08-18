import React, { useState, useMemo, useEffect } from 'react';
import { Search, Loader, Eye, Edit, Download } from 'lucide-react';
import type { Paper, Pulp } from '../../types';
import { useInfiniteScroll, useMaterials } from '../../hooks/useAPI';
import { paperAPI, pulpAPI, reportAPI } from '../../utils/api';
import { formatPersianDate, formatPersianTime, persianToEnglishNumbers, isValidShamsiDate } from '../../utils/persianUtils';
import { getProductionLineColors } from '../../utils/productionLineColors';
import { useToast } from '../common/Toast';

interface CompleteReportProps {
  onEditPaper?: (paper: Paper) => void;
  onViewPaper?: (paper: Paper) => void;
  onEditPulp?: (pulp: Pulp) => void;
  onViewPulp?: (pulp: Pulp) => void;
}

type RowType = 'paper' | 'pulp';

interface CombinedRow {
  type: RowType;
  paper?: Paper;
  pulp?: Pulp;
  id: string;
}

/**
 * Convert time string (HH:MM) to minutes for comparison
 * Handles both Persian and English numerals
 */
const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const englishTime = persianToEnglishNumbers(timeStr);
  const [hours, minutes] = englishTime.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

/**
 * Check if a time is between two times (inclusive)
 */
const isTimeBetween = (time: string, startTime: string, endTime: string): boolean => {
  const timeMinutes = timeToMinutes(time);
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
};

/**
 * Extract date from created_at string (YYYY-MM-DD format)
 */
const extractDate = (dateTimeStr: string): string => {
  if (!dateTimeStr) return '';
  // Handle both ISO format and simple date format
  const datePart = dateTimeStr.split('T')[0].split(' ')[0];
  return datePart;
};

export const CompleteReport: React.FC<CompleteReportProps> = ({
  onEditPaper,
  onViewPaper,
  onEditPulp,
  onViewPulp,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShift, setFilterShift] = useState<string>('');
  const [sortField, setSortField] = useState<string>('-created_at');
  const [pageSize, setPageSize] = useState<number | 'all'>(50);
  const [activeHeaderType, setActiveHeaderType] = useState<'paper' | 'pulp'>('paper');
  const [clickedRowId, setClickedRowId] = useState<string | null>(null);
  const [exportStartDate, setExportStartDate] = useState<string>('');
  const [exportEndDate, setExportEndDate] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  
  const { showToast } = useToast();

  // Build API parameters for papers
  const paperApiParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (filterShift) params.shift = filterShift;
    if (sortField) params.sort_by = sortField;
    return params;
  }, [filterShift, sortField]);

  // Fetch papers
  const {
    data: papers,
    loading: papersLoading,
    loadingMore: papersLoadingMore,
    error: papersError,
    hasMore: papersHasMore,
    totalCount: papersTotalCount,
    refetch: refetchPapers,
    lastElementRef: papersLastElementRef,
  } = useInfiniteScroll<Paper>(paperAPI.list, paperApiParams, pageSize);

  // Fetch pulps (all, no filters)
  const {
    data: pulps,
    loading: pulpsLoading,
    loadingMore: pulpsLoadingMore,
    error: pulpsError,
    hasMore: pulpsHasMore,
    totalCount: pulpsTotalCount,
    refetch: refetchPulps,
  } = useInfiniteScroll<Pulp>(pulpAPI.list, {}, 'all');

  const { data: materialsData } = useMaterials();
  const materials = materialsData?.results || [];
  const [locationNames, setLocationNames] = useState<Array<{ id: number; title: string }>>([]);

  // Fetch location names on component mount
  useEffect(() => {
    const fetchLocationNames = async () => {
      try {
        const names = await pulpAPI.getLocationNames();
        setLocationNames(names);
      } catch (error) {
        console.error('Failed to fetch location names:', error);
      }
    };
    fetchLocationNames();
  }, []);

  // Filter papers based on search (client-side filtering)
  const filteredPapers = useMemo(() => {
    return papers.filter(paper => {
      const searchLower = searchTerm.toLowerCase();
      return (
        paper.roll_number?.toString().includes(searchTerm) ||
        paper.responsible_person_name?.toLowerCase().includes(searchLower) ||
        paper.date?.includes(searchTerm) ||
        paper.id.toString().includes(searchLower)
      );
    });
  }, [papers, searchTerm]);

  // Match pulps to papers
  const matchedData = useMemo(() => {
    const rows: CombinedRow[] = [];

    filteredPapers.forEach(paper => {
      // Add paper row
      rows.push({
        type: 'paper',
        paper,
        id: `paper-${paper.id}`,
      });

      // Find matching pulps
      const matchingPulps = pulps.filter(pulp => {
        // Check roll_number match
        if (pulp.roll_number?.toString() !== paper.roll_number?.toString()) {
          return false;
        }

        // Check date match (same created_at date)
        const paperDate = extractDate(paper.created_at);
        const pulpDate = extractDate(pulp.created_at);
        if (paperDate !== pulpDate) {
          return false;
        }

        // Check time range (pulp.lower_sampling_time between paper.sampling_start_time and paper.sampling_end_time)
        if (
          pulp.lower_sampling_time &&
          paper.sampling_start_time &&
          paper.sampling_end_time
        ) {
          return isTimeBetween(
            pulp.lower_sampling_time,
            paper.sampling_start_time,
            paper.sampling_end_time
          );
        }

        return false;
      });

      // Add matching pulp rows
      matchingPulps.forEach(pulp => {
        rows.push({
          type: 'pulp',
          pulp,
          paper, // Keep reference to parent paper
          id: `pulp-${pulp.id}`,
        });
      });
    });

    return rows;
  }, [filteredPapers, pulps]);

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
      return materialUsageJson;
    }
  };

  const handleSortChange = (value: string) => {
    setSortField(value);
  };

  const handleRowClick = (row: CombinedRow) => {
    if (row.type === 'pulp') {
      setActiveHeaderType('pulp');
      setClickedRowId(row.id);
    } else {
      setActiveHeaderType('paper');
      setClickedRowId(row.id);
    }
  };

  const handleExport = async () => {
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
      const params: Record<string, string> = {};
      if (filterShift) params.shift = filterShift;
      if (sortField) params.sort_by = sortField;
      if (exportStartDate) params.date_from = exportStartDate;
      if (exportEndDate) params.date_to = exportEndDate;
      
      await reportAPI.exportCompleteReportXlsx(params);
      showToast('success', 'فایل اکسل با موفقیت دانلود شد');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('error', 'خطا در دانلود فایل اکسل');
    } finally {
      setExporting(false);
    }
  };

  const loading = papersLoading || pulpsLoading;
  const error = papersError || pulpsError;

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
        <button onClick={() => { refetchPapers(); refetchPulps(); }} className="btn-primary mt-4">
          تلاش مجدد
        </button>
      </div>
    );
  }

  // Paper table header (25 columns)
  const getPaperHeader = () => (
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
        <th className="bg-gray-50">مواد</th>
        <th className="bg-gray-50">دمای سیلندر (قبل/بعد)</th>
        <th className="bg-gray-50">غلظت (۱-۵)</th>
        <th className="bg-gray-50">رقیق‌ساز (۱-۵)</th>
        <th className="bg-gray-50">تنظیمات ماشین</th>
      </tr>
    </thead>
  );

  // Pulp table header - includes dynamic location name columns
  const getPulpHeader = () => {
    const baseColumns = 18; // Base pulp columns
    const locationColumns = locationNames.length; // Dynamic location columns
    const totalPulpColumns = baseColumns + locationColumns;
    const paperColumns = 25; // Paper has 25 columns
    const paddingColumns = Math.max(0, paperColumns - totalPulpColumns);

    return (
      <thead className="sticky top-0 z-10 bg-gray-50">
        <tr>
          <th className="bg-gray-50">عملیات</th>
          <th className="bg-gray-50">شماره رول</th>
          <th className="bg-gray-50">خط تولید</th>
          <th className="bg-gray-50">زمان نمونه‌گیری</th>
          <th className="bg-gray-50">کانس خمیر پایین</th>
          <th className="bg-gray-50">کانس توری پایین</th>
          <th className="bg-gray-50">فرینس خمیر پایین</th>
          <th className="bg-gray-50">pH پایین</th>
          <th className="bg-gray-50">دمای خمیر پایین</th>
          <th className="bg-gray-50">کانس خمیر بالا</th>
          <th className="bg-gray-50">کانس توری بالا</th>
          <th className="bg-gray-50">فرینس خمیر بالا</th>
          <th className="bg-gray-50">pH بالا</th>
          <th className="bg-gray-50">دمای خمیر بالا</th>
          <th className="bg-gray-50">حوض ۸</th>
          <th className="bg-gray-50">کردان</th>
          <th className="bg-gray-50">تیکنر</th>
          {/* Dynamic columns for location names */}
          {locationNames.map((loc) => (
            <th key={loc.id} className="bg-gray-50">{loc.title}</th>
          ))}
          <th className="bg-gray-50">تاریخ ایجاد</th>
          {/* Padding cells to match paper column count */}
          {Array.from({ length: paddingColumns }).map((_, index) => (
            <th key={`pad-${index}`} className="bg-gray-50"></th>
          ))}
        </tr>
      </thead>
    );
  };

  // Render paper row (25 columns)
  const renderPaperRow = (paper: Paper, index: number) => (
    <tr
      key={`paper-${paper.id}`}
      className="table-row-hover bg-blue-50"
      onClick={() => handleRowClick({ type: 'paper', paper, id: `paper-${paper.id}` })}
      style={{ cursor: 'pointer' }}
    >
      <td>
        <div className="flex items-center gap-2">
          {onViewPaper && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewPaper(paper);
              }}
              className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
              title="مشاهده"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          {onEditPaper && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditPaper(paper);
              }}
              className="text-primary-600 hover:text-primary-700 p-1 rounded hover:bg-primary-50"
              title="ویرایش"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
      <td className="font-medium">{paper.roll_number}</td>
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
      <td>
        {formatPersianDate(paper.date)} <br />
        {formatPersianTime(paper.sampling_start_time)} - {formatPersianTime(paper.sampling_end_time)}
      </td>
      <td>
        {paper.shift && (
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              paper.shift === 'day'
                ? 'bg-warning-100 text-warning-700'
                : 'bg-primary-100 text-primary-700'
            }`}
          >
            {paper.shift === 'day' ? 'روزانه' : 'شبانه'}
          </span>
        )}
      </td>
      <td>
        {paper.paper_type && (
          <span className="text-sm text-gray-600">
            {paper.paper_type === 'test_liner'
              ? 'تست لاینر'
              : paper.paper_type === 'float'
              ? 'فلوت'
              : paper.paper_type === 'white_top_test_liner'
              ? 'تست لاینر سفید'
              : ''}
          </span>
        )}
      </td>
      <td>{paper.paper_size || '-'}</td>
      <td>{paper.real_grammage || '-'}</td>
      <td>{paper.humidity || '-'}</td>
      <td>{paper.ash_percentage || '-'}</td>
      <td>{paper.cub || '-'}</td>
      <td>
        {paper.profile && (
          <span className="text-sm">
            {paper.profile === '+1g'
              ? '+۱g-'
              : paper.profile === '+2g'
              ? '+۲g-'
              : paper.profile === '+3g'
              ? '+۳g-'
              : paper.profile === '+4g'
              ? '+۴g-'
              : paper.profile === '>5g'
              ? 'بیشتر از 5 گرم'
              : paper.profile}
          </span>
        )}
      </td>
      <td>
        {paper.burst_test && <span className="text-sm text-gray-600">{paper.burst_test}</span>}
      </td>
      <td>{paper.tensile_strength_md || '-'}</td>
      <td>{paper.tensile_strength_cd || '-'}</td>
      <td>
        {paper.cct1 || paper.cct2 || paper.cct3 || paper.cct4 || paper.cct5 ? (
          <div
            style={{ maxWidth: '55px', textWrap: 'wrap', minWidth: '55px' }}
            className="text-xs"
          >
            {[paper.cct1, paper.cct2, paper.cct3, paper.cct4, paper.cct5]
              .filter((val) => val !== null && val !== undefined)
              .map((val, index, array) => (
                <React.Fragment key={index}>
                  {val}
                  {index < array.length - 1 && <br />}
                </React.Fragment>
              ))}
          </div>
        ) : (
          '-'
        )}
      </td>
      <td>
        {paper.rct1 || paper.rct2 || paper.rct3 || paper.rct4 || paper.rct5 ? (
          <div
            style={{ maxWidth: '55px', textWrap: 'wrap', minWidth: '55px' }}
            className="text-xs"
          >
            {[paper.rct1, paper.rct2, paper.rct3, paper.rct4, paper.rct5]
              .filter((val) => val !== null && val !== undefined)
              .map((val, index, array) => (
                <React.Fragment key={index}>
                  {val}
                  {index < array.length - 1 && <br />}
                </React.Fragment>
              ))}
          </div>
        ) : (
          '-'
        )}
      </td>
      <td>{paper.NumberOfTears || ''}</td>
      <td>
        {paper.calender_applied !== undefined && (
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              paper.calender_applied
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {paper.calender_applied ? 'بله' : 'خیر'}
          </span>
        )}
      </td>
      <td>{paper.machine_speed || '-'}</td>
      <td>
        {paper.material_usage && (
          <div
            style={{ maxWidth: '90px', textWrap: 'wrap', minWidth: '90px' }}
            className="text-xs text-gray-600 max-w-xs truncate"
            title={formatMaterialUsage(paper.material_usage)}
          >
            {(() => {
              try {
                const materialUsage = JSON.parse(paper.material_usage);
                const formattedItems = Object.entries(materialUsage).map(
                  ([materialId, data]: [string, any]) => {
                    const materialName = materialMap[materialId] || `Material ${materialId}`;
                    const amount = data.val || 0;
                    return `${materialName}: ${amount}`;
                  }
                );
                return formattedItems.map((item, index, array) => (
                  <React.Fragment key={index}>
                    {item}
                    {index < array.length - 1 && <br />}
                  </React.Fragment>
                ));
              } catch (error) {
                return paper.material_usage;
              }
            })()}
          </div>
        )}
      </td>
      <td>
        {paper.cylinder_temperature_before_press || '-'} -{' '}
        {paper.cylinder_temperature_after_press || '-'}
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
      <td>
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
        {paper.pm_settings && paper.pm_settings.length > 0 ? (
          <div style={{maxWidth: '120px', textWrap: 'wrap', minWidth: '100px'}} className="text-xs">
            {paper.pm_settings.map((setting, idx) => (
              <div key={setting.id || idx} className="mb-1 pb-1 border-b border-gray-200 last:border-0">
                <span className="font-medium">{setting.production_machine_title || `ماشین ${idx + 1}`}</span>
                {(setting.bottom || setting.top) && (
                  <div>پایین: {setting.bottom || '-'} | بالا: {setting.top || '-'}</div>
                )}
                {(setting.cylinder_temperature_before_press || setting.cylinder_temperature_after_press) && (
                  <div>دما: {setting.cylinder_temperature_before_press || '-'}/{setting.cylinder_temperature_after_press || '-'}</div>
                )}
              </div>
            ))}
          </div>
        ) : '-'}
      </td>
    </tr>
  );

  // Render pulp row with full details (includes dynamic location columns, padded to match paper columns)
  const renderPulpRow = (pulp: Pulp) => {
    const baseColumns = 18; // Base pulp columns
    const locationColumns = locationNames.length; // Dynamic location columns
    const totalPulpColumns = baseColumns + locationColumns;
    const paperColumns = 25; // Paper has 25 columns
    const paddingColumns = Math.max(0, paperColumns - totalPulpColumns);

    return (
      <tr
        key={`pulp-${pulp.id}`}
        className="table-row-hover bg-green-50"
        onClick={() => handleRowClick({ type: 'pulp', pulp, id: `pulp-${pulp.id}` })}
        style={{ cursor: 'pointer' }}
      >
        <td>
          <div className="flex items-center gap-2">
            {onViewPulp && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewPulp(pulp);
                }}
                className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                title="مشاهده"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            {onEditPulp && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditPulp(pulp);
                }}
                className="text-primary-600 hover:text-primary-700 p-1 rounded hover:bg-primary-50"
                title="ویرایش"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
          </div>
        </td>
        <td className="font-medium">{pulp.roll_number || '-'}</td>
        <td>
          {pulp.ProductionLine !== undefined && pulp.ProductionLine !== null ? (
            (() => {
              const colors = getProductionLineColors(pulp.ProductionLine);
              return (
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}
                >
                  {colors.label}
                </span>
              );
            })()
          ) : (
            '-'
          )}
        </td>
        <td>{pulp.lower_sampling_time ? formatPersianTime(pulp.lower_sampling_time) : '-'}</td>
        <td>{pulp.downpulpcount || '-'}</td>
        <td>{pulp.lower_water_filter || '-'}</td>
        <td>{pulp.lower_headbox_freeness || '-'}</td>
        <td>{pulp.lower_ph || '-'}</td>
        <td>{pulp.lower_pulp_temperature || '-'}</td>
        <td>{pulp.upper_headbox_consistency || '-'}</td>
        <td>{pulp.upper_water_filter || '-'}</td>
        <td>{pulp.upper_headbox_freeness || '-'}</td>
        <td>{pulp.upper_ph || '-'}</td>
        <td>{pulp.upper_pulp_temperature || '-'}</td>
        <td>{pulp.pond8_consistency || '-'}</td>
        <td>{pulp.curtain_consistency || '-'}</td>
        <td>{pulp.thickener_consistency || '-'}</td>
        {/* Dynamic cells for location values */}
        {locationNames.map((loc) => {
          const locationValue = pulp.sampling_locations?.find(
            sl => sl.title === loc.title
          );
          return (
            <td key={loc.id}>{locationValue?.value || '-'}</td>
          );
        })}
        <td>{new Date(pulp.created_at).toLocaleDateString('fa-IR')}</td>
        {/* Padding cells to match paper column count */}
        {Array.from({ length: paddingColumns }).map((_, index) => (
          <td key={`pad-${index}`}></td>
        ))}
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">گزارش کامل</h2>
          <p className="text-gray-600 mt-1">
            نمایش {formatPersianDate(matchedData.length.toString())} رکورد
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
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

      {/* Combined Table */}
      <div className="card">
        <div className="card-body p-0">
          {matchedData.length > 0 ? (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="table">
                {activeHeaderType === 'paper' ? getPaperHeader() : getPulpHeader()}
                <tbody>
                  {matchedData.map((row, index) => {
                    if (row.type === 'paper' && row.paper) {
                      // Always show paper row with full paper data, regardless of header
                      return renderPaperRow(row.paper, index);
                    } else if (row.type === 'pulp' && row.pulp) {
                      // Always show pulp row with full pulp data, regardless of header
                      return renderPulpRow(row.pulp);
                    }
                    return null;
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
              <p>فیلترها را تغییر دهید.</p>
            </div>
          )}

          {/* Loading More Indicator */}
          {papersLoadingMore && (
            <div className="flex justify-center items-center p-4 border-t">
              <Loader className="w-6 h-6 animate-spin text-primary-600 ml-2" />
              <span className="text-gray-600">در حال بارگذاری...</span>
            </div>
          )}

          {/* End of List Message */}
          {!papersLoadingMore && !papersHasMore && matchedData.length > 0 && (
            <div className="flex justify-center items-center p-4 border-t text-gray-500">
              <span>همه رکوردها نمایش داده شد</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

