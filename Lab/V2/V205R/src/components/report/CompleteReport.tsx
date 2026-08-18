import React, { useState, useMemo, useEffect } from 'react';
import { Search, Loader, Eye, Edit, Download, RefreshCw, ChevronDown } from 'lucide-react';
import type { Paper, Pulp, PLCKey, RollPLCData, PM_Setting } from '../../types';
import { useInfiniteScroll, useMaterials, useAPI } from '../../hooks/useAPI';
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
  const [searchInput, setSearchInput] = useState('');
  const [filterProductionLine, setFilterProductionLine] = useState<string>('');
  const [sortField, setSortField] = useState<string>('-roll_number');
  const [pageSize, setPageSize] = useState<number | 'all'>(50);
  const [activeHeaderType, setActiveHeaderType] = useState<'paper' | 'pulp'>('paper');
  const [clickedRowId, setClickedRowId] = useState<string | null>(null);
  const [exportStartDate, setExportStartDate] = useState<string>('');
  const [exportEndDate, setExportEndDate] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [syncingPLC, setSyncingPLC] = useState(false);
  const [visiblePlcKeyIds, setVisiblePlcKeyIds] = useState<number[]>([]);
  const [plcAccordionOpen, setPlcAccordionOpen] = useState<boolean>(false);
  
  const { showToast } = useToast();

  // Build API parameters for papers (server-side search & filters)
  const paperApiParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (filterProductionLine) params.ProductionLine = filterProductionLine;
    if (sortField) params.sort_by = sortField;
    if (searchTerm) params.search = searchTerm;
    return params;
  }, [filterProductionLine, sortField, searchTerm]);

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

  const {
    data: plcKeysResponse,
    loading: plcKeysLoading,
    error: plcKeysError,
    refetch: refetchPlcKeys,
  } = useAPI<{ success: boolean; plc_keys: PLCKey[] }>(reportAPI.getPLCKeys, []);
  const plcKeys = plcKeysResponse?.plc_keys || [];

  const {
    data: rollPlcResponse,
    loading: rollPlcLoading,
    error: rollPlcError,
    refetch: refetchRollPlc,
  } = useAPI<{ success: boolean; data: RollPLCData[] }>(() => reportAPI.getRollPLCData(), []);
  const rollPlcData = rollPlcResponse?.data || [];

  const activePlcKeys = useMemo(
    () => plcKeys.filter((key) => visiblePlcKeyIds.includes(key.id)),
    [plcKeys, visiblePlcKeyIds]
  );

  // Group PLC keys into 2 columns (split evenly)
  const groupedPlcKeys = useMemo(() => {
    if (activePlcKeys.length === 0) return [];
    const keysPerColumn = Math.ceil(activePlcKeys.length / 2);
    const firstColumn = activePlcKeys.slice(0, keysPerColumn);
    const secondColumn = activePlcKeys.slice(keysPerColumn);
    return [firstColumn, secondColumn].filter(col => col.length > 0);
  }, [activePlcKeys]);

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

  // Load PLC column visibility preference when keys are loaded
  useEffect(() => {
    const loadPreference = async () => {
      if (plcKeys.length === 0) return;
      try {
        const resp = await reportAPI.getPLCColumnPreference();
        const ids: number[] = Array.isArray(resp.visible_keys) ? resp.visible_keys : [];
        if (ids.length > 0) {
          // Filter out ids that no longer exist
          const validIds = ids.filter((id) => plcKeys.some((k) => k.id === id));
          if (validIds.length > 0) {
            setVisiblePlcKeyIds(validIds);
            return;
          }
        }
        // Default: show all keys
        setVisiblePlcKeyIds(plcKeys.map((key) => key.id));
      } catch (error) {
        console.error('Failed to load PLC column preference:', error);
        if (visiblePlcKeyIds.length === 0) {
          setVisiblePlcKeyIds(plcKeys.map((key) => key.id));
        }
      }
    };

    loadPreference();
  }, [plcKeys]);

  // Sync PLC data once when component mounts
  useEffect(() => {
    const syncOnMount = async () => {
      try {
        setSyncingPLC(true);
        await reportAPI.syncPLCData();
        await Promise.all([refetchPlcKeys(), refetchRollPlc()]);
      } catch (error) {
        console.error('PLC sync on mount failed:', error);
      } finally {
        setSyncingPLC(false);
      }
    };

    syncOnMount();
  }, []);

  const plcDataByRoll = useMemo(() => {
    const map: Record<string, RollPLCData> = {};
    rollPlcData.forEach(item => {
      if (item.roll_number != null) {
        map[item.roll_number.toString()] = item;
      }
    });
    return map;
  }, [rollPlcData]);

  // Match pulps to papers
  const matchedData = useMemo(() => {
    const rows: CombinedRow[] = [];

    papers.forEach(paper => {
      // Add paper row
      rows.push({
        type: 'paper',
        paper,
        id: `paper-${paper.id}`,
      });

      // Find matching pulps
      const matchingPulps = pulps.filter(pulp => {
        // Check roll_number match
        // if (pulp.roll_number?.toString() !== paper.roll_number?.toString()) {
        //   return false;
        // }
        if (pulp.roll_number?.toString() == paper.roll_number?.toString()) {
          return true;
        } else if (pulp.roll_number?.toString() !== paper.roll_number?.toString() && pulp.roll_number) {
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
  }, [papers, pulps]);

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

  const togglePlcKeyVisibility = (id: number) => {
    setVisiblePlcKeyIds((prev) => {
      const next = prev.includes(id) ? prev.filter((keyId) => keyId !== id) : [...prev, id];
      reportAPI
        .savePLCColumnPreference(next)
        .catch((error) => console.error('Failed to save PLC column preference:', error));
      return next;
    });
  };

  const showAllPlcKeys = () => {
    const allIds = plcKeys.map((key) => key.id);
    setVisiblePlcKeyIds(allIds);
    reportAPI
      .savePLCColumnPreference(allIds)
      .catch((error) => console.error('Failed to save PLC column preference:', error));
  };

  const hideAllPlcKeys = () => {
    setVisiblePlcKeyIds([]);
    reportAPI
      .savePLCColumnPreference([])
      .catch((error) => console.error('Failed to save PLC column preference:', error));
  };

  const handleSyncPLC = async () => {
    setSyncingPLC(true);
    try {
      await reportAPI.syncPLCData();
      await Promise.all([refetchPlcKeys(), refetchRollPlc()]);
      showToast('success', 'داده‌های PLC با موفقیت بروزرسانی شد');
    } catch (error) {
      console.error('PLC sync failed:', error);
      showToast('error', 'خطا در بروزرسانی داده‌های PLC');
    } finally {
      setSyncingPLC(false);
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
      if (filterProductionLine) params.ProductionLine = filterProductionLine;
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

  const loading = papersLoading || pulpsLoading || plcKeysLoading || rollPlcLoading;
  const error = papersError || pulpsError || plcKeysError || rollPlcError;

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

  // Paper table header (22 columns)
  const getPaperHeader = () => (
    <thead className="sticky top-0 z-10 bg-gray-50">
      <tr>
        <th className="bg-gray-50 whitespace-nowrap">عملیات</th>
        <th className="bg-gray-50 whitespace-nowrap">شماره رول</th>
        <th className="bg-gray-50 whitespace-nowrap">خط تولید</th>
        <th className="bg-gray-50 whitespace-nowrap">تاریخ - زمان</th>
        <th className="bg-gray-50 whitespace-nowrap">شیفت</th>
        <th className="bg-gray-50 whitespace-nowrap">نوع کاغذ</th>
        <th className="bg-gray-50 whitespace-nowrap">عرض کاغذ</th>
        <th className="bg-gray-50 whitespace-nowrap">گراماژ</th>
        <th className="bg-gray-50 whitespace-nowrap">رطوبت</th>
        <th className="bg-gray-50 whitespace-nowrap">خاکستر</th>
        <th className="bg-gray-50 whitespace-nowrap">کاب</th>
        <th className="bg-gray-50 whitespace-nowrap">پروفایل</th>
        <th className="bg-gray-50 whitespace-nowrap">burst</th>
        <th className="bg-gray-50 whitespace-nowrap">MD</th>
        <th className="bg-gray-50 whitespace-nowrap">CD</th>
        <th className="bg-gray-50 whitespace-nowrap">CCT</th>
        <th className="bg-gray-50 whitespace-nowrap">RCT</th>
        <th className="bg-gray-50 whitespace-nowrap"> پارگی</th>
        <th className="bg-gray-50 whitespace-nowrap table-gradient-divider">مواد</th>
        <th className="bg-gray-50 whitespace-nowrap">غلظت (۱-۵)</th>
        <th className="bg-gray-50 whitespace-nowrap">رقیق‌ساز (۱-۵)</th>
        <th className="bg-gray-50 whitespace-nowrap table-gradient-divider">تنظیمات ماشین</th>
        {groupedPlcKeys.map((_group, groupIndex) => (
          <th key={`plc-group-${groupIndex}`} className="bg-gray-50 whitespace-nowrap table-gradient-divider">
            PLC Data
          </th>
        ))}
      </tr>
    </thead>
  );

  // Pulp table header - includes dynamic location name columns
  const getPulpHeader = () => {
    const baseColumns = 18; // Base pulp columns
    const locationColumns = locationNames.length; // Dynamic location columns
    const totalPulpColumns = baseColumns + locationColumns;
    const paperColumns = 22 + groupedPlcKeys.length; // Paper columns plus grouped PLC columns
    const paddingColumns = Math.max(0, paperColumns - totalPulpColumns);

    return (
      <thead className="sticky top-0 z-10 bg-gray-50">
        <tr>
          <th className="bg-gray-50 whitespace-nowrap">عملیات</th>
          <th className="bg-gray-50 whitespace-nowrap">شماره رول</th>
          <th className="bg-gray-50 whitespace-nowrap">خط تولید</th>
          <th className="bg-gray-50 whitespace-nowrap">زمان نمونه‌گیری</th>
          <th className="bg-gray-50 whitespace-nowrap">کانس خمیر پایین</th>
          <th className="bg-gray-50 whitespace-nowrap">کانس توری پایین</th>
          <th className="bg-gray-50 whitespace-nowrap">فرینس خمیر پایین</th>
          <th className="bg-gray-50 whitespace-nowrap">pH پایین</th>
          <th className="bg-gray-50 whitespace-nowrap">دمای خمیر پایین</th>
          <th className="bg-gray-50 whitespace-nowrap">کانس خمیر بالا</th>
          <th className="bg-gray-50 whitespace-nowrap">کانس توری بالا</th>
          <th className="bg-gray-50 whitespace-nowrap">فرینس خمیر بالا</th>
          <th className="bg-gray-50 whitespace-nowrap">pH بالا</th>
          <th className="bg-gray-50 whitespace-nowrap">دمای خمیر بالا</th>
          <th className="bg-gray-50 whitespace-nowrap">حوض ۸</th>
          <th className="bg-gray-50 whitespace-nowrap">کردان</th>
          <th className="bg-gray-50 whitespace-nowrap">تیکنر</th>
          {/* Dynamic columns for location names */}
          {locationNames.map((loc) => (
            <th key={loc.id} className="bg-gray-50 whitespace-nowrap">{loc.title}</th>
          ))}
          <th className="bg-gray-50 whitespace-nowrap">تاریخ ایجاد</th>
          {/* Padding cells to match paper column count */}
          {Array.from({ length: paddingColumns }).map((_, index) => (
            <th key={`pad-${index}`} className="bg-gray-50 whitespace-nowrap"></th>
          ))}
        </tr>
      </thead>
    );
  };

  // Render paper row (22 columns)
  const renderPaperRow = (paper: Paper, index: number) => {
    const pmSettings = filterPmSettingsForPaper(paper);

    return (
    <tr
      key={`paper-${paper.id}`}
      className="table-row-hover bg-blue-50"
      onClick={() => handleRowClick({ type: 'paper', paper, id: `paper-${paper.id}` })}
      style={{ cursor: 'pointer' }}
    >
      <td>
        <div className=" items-center gap-2">
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
      <td className="table-gradient-divider">
        {paper.material_usage && (
          <div
            style={{textWrap: 'wrap', minWidth: '90px'}}
            className="text-xs text-gray-600 truncate"
            title={formatMaterialUsage(paper.material_usage)}
          >
            {(() => {
              try {
                const materialUsage = JSON.parse(paper.material_usage);
                const formattedItems = Object.entries(materialUsage).map(
                  ([materialId, data]: [string, any]) => {
                    const materialName = materialMap[materialId] || `Material ${materialId}`;
                    const amount = data.val || 0;
                    const solubleInWater = data.Soluble_in_water;
                    return { materialName, amount, solubleInWater };
                  }
                );
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
      <td >
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
      <td className="table-gradient-divider">
        <div style={{maxWidth: '150px', textWrap: 'wrap', minWidth: '120px'}} className="text-xs">
          <div className="mb-2 pb-2 border-b border-gray-200">
            <div className="space-y-0.5">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-[11px]">سرعت:</span>
                <span className="font-medium text-gray-900 text-[11px]">{paper.machine_speed || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-[11px]">کالندر:</span>
                <span className="font-medium text-gray-900 text-[11px]">
                  {paper.calender_applied !== undefined ? (
                    <span
                      className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full ${
                        paper.calender_applied
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {paper.calender_applied ? 'بله' : 'خیر'}
                    </span>
                  ) : '-'}
                </span>
              </div>
            </div>
          </div>
          {pmSettings.length > 0 && pmSettings.map((setting, idx) => (
            <div key={setting.id || idx} className="mb-2 pb-2 border-b border-gray-200 last:border-0">
                {(setting.bottom || setting.top) && (
                  <div className="mt-0.5 space-y-0.5">
                    <div className="text-[12px] font-semibold bg-gray-200 rounded p-1">فشار هدباکس</div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">پایین</span>
                      <span className="font-medium text-gray-900">
                        {setting.bottom || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">بالا</span>
                      <span className="font-medium text-gray-900">
                        {setting.top || '-'}
                      </span>
                    </div>
                  </div>
                )}
                {(setting.cylinder_temperature_before_press != null ||
                  setting.cylinder_temperature_after_press != null) && (
                  <div className="mt-0.5 space-y-0.5">
                    <div className="text-[12px] font-semibold bg-gray-200 rounded p-1">دما سیلندر</div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">قبل پرس</span>
                      <span className="font-medium text-gray-900">
                        {setting.cylinder_temperature_before_press ?? '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">بعد پرس</span>
                      <span className="font-medium text-gray-900">
                        {setting.cylinder_temperature_after_press ?? '-'}
                      </span>
                    </div>
                  </div>
                )}
                {(setting.paper_temperature_before_starch != null ||
                  setting.paper_temperature_before_pop_reel != null) && (
                  <div className="mt-0.5 space-y-0.5">
                    <div className="text-[12px] font-semibold bg-gray-200 rounded p-1">دما کاغذ</div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">قبل نشاسته</span>
                      <span className="font-medium text-gray-900">
                        {setting.paper_temperature_before_starch ?? '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">قبل پاپ ریل</span>
                      <span className="font-medium text-gray-900">
                        {setting.paper_temperature_before_pop_reel ?? '-'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </td>
      {groupedPlcKeys.map((group, groupIndex) => {
        const plcData = plcDataByRoll[paper.roll_number?.toString() || ''];
        
        return (
          <td key={`plc-group-${groupIndex}`} className="table-gradient-divider">
            {group.length > 0 ? (
              <div style={{textWrap: 'nowrap', minWidth: '120px'}} className="text-xs whitespace-nowrap">
                {group.map((key, idx) => {
                  let value: any = undefined;

                  if (plcData) {
                    if (key.key === 'b') {
                      value = plcData.paper_breaks;
                    } else if (key.key === 'me1') {
                      value = plcData.printed_length;
                    } else if (plcData.plc_setting) {
                      value = plcData.plc_setting[key.key as keyof typeof plcData.plc_setting];
                    }
                  }

                  const displayValue = value !== undefined && value !== null && value !== '' ? value : '-';
                  const displayName = key.fa_name || key.name || key.key;

                  return (
                    <div key={key.id} className={idx < group.length - 1 ? "mb-1 pb-1 border-b border-gray-200" : ""}>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-gray-600 text-[11px]">{displayName}:</span>
                        <span className="font-medium text-gray-900 text-[11px]">{displayValue}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : '-'}
          </td>
        );
      })}
    </tr>
    );
  };

  // Render pulp row with full details (includes dynamic location columns, padded to match paper columns)
  const renderPulpRow = (pulp: Pulp) => {
    const baseColumns = 18; // Base pulp columns
    const locationColumns = locationNames.length; // Dynamic location columns
    const totalPulpColumns = baseColumns + locationColumns;
    const paperColumns = 22 + groupedPlcKeys.length; // Paper columns plus grouped PLC columns
    const paddingColumns = Math.max(0, paperColumns - totalPulpColumns);

    return (
      <tr
        key={`pulp-${pulp.id}`}
        className="table-row-hover bg-green-50"
        onClick={() => handleRowClick({ type: 'pulp', pulp, id: `pulp-${pulp.id}` })}
        style={{ cursor: 'pointer' }}
      >
        <td>
          <div className=" items-center gap-2">
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
          <button
            onClick={handleSyncPLC}
            disabled={syncingPLC}
            className="btn-primary flex items-center"
          >
            {syncingPLC ? (
              <>
                <Loader className="w-5 h-5 ml-2 animate-spin" />
                بروزرسانی PLC...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 ml-2" />
                بروزرسانی PLC
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
              <option value="0">مشترک</option>
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
          {/* PLC columns selection - accordion */}
          {plcKeys.length > 0 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setPlcAccordionOpen((open) => !open)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">ستون‌های PLC</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {activePlcKeys.length}/{plcKeys.length}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      plcAccordionOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>
              {plcAccordionOpen && (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      با کلیک روی هر مورد می‌توانید نمایش/مخفی شدن آن ستون را تغییر دهید.
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={showAllPlcKeys}
                        className="btn-secondary btn-xs"
                      >
                        همه
                      </button>
                      <button
                        type="button"
                        onClick={hideAllPlcKeys}
                        className="btn-secondary btn-xs"
                      >
                        هیچ
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {plcKeys.map((key) => {
                      const selected = visiblePlcKeyIds.includes(key.id);
                      return (
                        <button
                          key={key.id}
                          type="button"
                          onClick={() => togglePlcKeyVisibility(key.id)}
                          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                            selected
                              ? 'bg-primary-100 border-primary-400 text-primary-700'
                              : 'bg-white border-gray-300 text-gray-600 hover:border-primary-300'
                          }`}
                        >
                          {key.fa_name || key.name || key.key}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
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

