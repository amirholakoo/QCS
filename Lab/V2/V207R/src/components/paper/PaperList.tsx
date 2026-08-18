import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, Edit, Eye, Trash2, Loader, Download, Printer, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Paper, PM_Setting, Material } from '../../types';
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
  const { t, i18n } = useTranslation();
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
  const [selectedPapers, setSelectedPapers] = useState<Set<number>>(new Set());
  const [showPrintView, setShowPrintView] = useState(false);
  const printContentRef = useRef<HTMLDivElement>(null);
  
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
  
  // Create a map of material ID to material object for easy lookup
  const materialMapById = materials.reduce((acc, material) => {
    acc[material.id] = material;
    return acc;
  }, {} as Record<string, Material>);
  
  // Function to get material display name based on language
  const getMaterialDisplayName = (materialId: string) => {
    const material = materialMapById[materialId];
    if (!material) return `Material ${materialId}`;
    const isEnglish = i18n.language === 'en';
    return (isEnglish && material.en_name) ? material.en_name : material.material_name;
  };

  // Function to format material usage
  const formatMaterialUsage = (materialUsageJson: string) => {
    if (!materialUsageJson) return '';
    
    try {
      const materialUsage = JSON.parse(materialUsageJson);
      const formattedItems = Object.entries(materialUsage).map(([materialId, data]: [string, any]) => {
        const materialName = getMaterialDisplayName(materialId);
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
      showToast('success', t('paper.deleteSuccess'));
      setDeleteDialog({ isOpen: false, paper: null });
      
      // Refetch the data
      refetch();
    } catch (error) {
      showToast('error', t('paper.deleteError'));
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, paper: null });
  };

  const handleExport = async () => {
    // Validate date format
    if (exportStartDate && !isValidShamsiDate(exportStartDate)) {
      showToast('error', t('paper.invalidStartDate'));
      return;
    }
    if (exportEndDate && !isValidShamsiDate(exportEndDate)) {
      showToast('error', t('paper.invalidEndDate'));
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
      showToast('success', t('paper.exportSuccess'));
    } catch (error) {
      console.error('Export failed:', error);
      showToast('error', t('paper.exportError'));
    } finally {
      setExporting(false);
    }
  };

  const handleSelectPaper = (paperId: number) => {
    setSelectedPapers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paperId)) {
        newSet.delete(paperId);
      } else {
        newSet.add(paperId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedPapers.size === papers.length) {
      setSelectedPapers(new Set());
    } else {
      setSelectedPapers(new Set(papers.map(p => p.id)));
    }
  };

  const handlePrint = () => {
    if (selectedPapers.size === 0) {
      showToast('error', t('paper.noSelection'));
      return;
    }
    setShowPrintView(true);
  };

  const handleClosePrintView = () => {
    setShowPrintView(false);
  };

  const handlePrintExecute = () => {
    window.print();
  };

  const selectedPapersList = papers.filter(p => selectedPapers.has(p.id));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <p>{t('paper.errorLoading')}: {error}</p>
        <button onClick={refetch} className="btn-primary mt-4">
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">{t('paper.title')}</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {t('paper.showing')} {formatPersianDate(papers.length.toString())} {t('common.of')} {formatPersianDate(totalCount.toString())} {t('common.records')}
            {pageSize !== 'all' && ` (${formatPersianDate(pageSize.toString())} ${t('paper.recordsPerPage')})`}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center flex-wrap">
          {selectedPapers.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {t('paper.selectedCount', { count: formatPersianDate(selectedPapers.size.toString()) })}
              </span>
              <button 
                onClick={handlePrint} 
                className="btn-primary flex items-center"
              >
                <Printer className="w-5 h-5 ml-2" />
                {t('paper.printSelected')}
              </button>
              <button 
                onClick={() => setSelectedPapers(new Set())} 
                className="btn-secondary btn-sm flex items-center"
                title={t('common.clear')}
              >
                <X className="w-4 h-4 ml-1" />
              </button>
            </div>
          )}
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
                placeholder={`${t('paper.fromDate')} (${t('paper.dateExample')})`}
                className="form-input sm:w-40"
                dir="ltr"
              />
              <span className="text-gray-500 text-sm hidden sm:inline">{t('paper.toDate')}</span>
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
                placeholder={`${t('paper.toDate')} (${t('paper.dateExample')})`}
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
                  title={t('common.clear')}
                >
                  {t('common.clear')}
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
                {t('common.downloading')}
              </>
            ) : (
              <>
                <Download className="w-5 h-5 ml-2" />
                {t('paper.excelExport')}
              </>
            )}
          </button>
          <button onClick={onCreate} className="btn-primary">
            <Plus className="w-5 h-5 ml-2" />
            {t('paper.addNewRecord')}
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
                  placeholder={t('paper.searchPlaceholder')}
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
              <option value="">{t('paper.allProductionLines')}</option>
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
              <option value="-created_at">{t('paper.dateNewest')}</option>
              <option value="created_at">{t('paper.dateOldest')}</option>
              <option value="roll_number">{t('paper.rollNumberAsc')}</option>
              <option value="-roll_number">{t('paper.rollNumberDesc')}</option>
              <option value="responsible_person_name">{t('paper.responsibleName')}</option>
            </select>

            {/* Page Size */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="form-select"
            >
              <option value="25">25 {t('common.records')}</option>
              <option value="50">50 {t('common.records')}</option>
              <option value="100">100 {t('common.records')}</option>
              <option value="200">200 {t('common.records')}</option>
            <option value="all">{t('paper.showAll')}</option>
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
                    <th className="bg-gray-50" style={{ width: '50px' }}>
                      <input
                        type="checkbox"
                        checked={papers.length > 0 && selectedPapers.size === papers.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                    </th>
                    <th className="bg-gray-50">{t('paper.operations')}</th>
                    <th className="bg-gray-50">{t('paper.rollNumber')}</th>
                    <th className="bg-gray-50">{t('paper.productionLine')}</th>
                    <th className="bg-gray-50">{t('paper.date')} - {t('paper.time')}</th>
                    <th className="bg-gray-50">{t('paper.shift')}</th>
                    <th className="bg-gray-50">{t('paper.paperType')}</th>
                    <th className="bg-gray-50">{t('paper.paperSize')}</th>
                    <th className="bg-gray-50">{t('paper.grammage')}</th>
                    <th className="bg-gray-50">{t('paper.humidity')}</th>
                    <th className="bg-gray-50">{t('paper.ash')}</th>
                    <th className="bg-gray-50">{t('paper.cub')}</th>
                    <th className="bg-gray-50">{t('paper.profile')}</th>
                    <th className="bg-gray-50">جزئیات پروفایل</th>
                    <th className="bg-gray-50">{t('paper.burst')}</th>
                    <th className="bg-gray-50">{t('paper.md')}</th>
                    <th className="bg-gray-50">{t('paper.cd')}</th>
                    <th className="bg-gray-50">{t('paper.cct')}</th>
                    <th className="bg-gray-50">{t('paper.rct')}</th>
                    <th className="bg-gray-50">{t('paper.tear')}</th>
                    <th className="bg-gray-50">{t('paper.calender')}</th>
                    <th className="bg-gray-50">{t('paper.speed')}</th>
                    <th className="bg-gray-50 table-gradient-divider">{t('paper.dilutingValve')}</th>
                    <th className="bg-gray-50">{t('paper.density')}</th>
                    <th className="bg-gray-50">{t('paper.materials')}</th>
                    <th className="bg-gray-50">{t('paper.machineSettings')}</th>
                  </tr>
                </thead>
                <tbody>
                  {papers.map((paper, index) => {
                    const pmSettings = filterPmSettingsForPaper(paper);
                    return (
                    <tr 
                      key={paper.id} 
                      className={`table-row-hover ${selectedPapers.has(paper.id) ? 'bg-primary-50' : ''}`}
                      ref={index === papers.length - 1 && pageSize !== 'all' ? lastElementRef : null}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedPapers.has(paper.id)}
                          onChange={() => handleSelectPaper(paper.id)}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                      </td>
                      <td>
                        <div className=" items-center gap-2">
                          <button
                            onClick={() => onView(paper)}
                            className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                            title={t('common.view')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEdit(paper)}
                            className="text-primary-600 hover:text-primary-700 p-1 rounded hover:bg-primary-50"
                            title={t('common.edit')}
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
                            {paper.shift === 'day' ? t('paper.day') : t('paper.night')}
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
                        {paper.profile_details && (() => {
                          try {
                            const profileDetails = typeof paper.profile_details === 'string' 
                              ? JSON.parse(paper.profile_details) 
                              : paper.profile_details;
                            if (!profileDetails || Object.keys(profileDetails).length === 0) return '-';
                            const items = Object.entries(profileDetails)
                              .filter(([_, value]) => value !== null && value !== undefined)
                              .map(([key, value]) => {
                                const label = key === '1' ? '1 ( سالن )' : key === '24' ? '24 ( دیوار-دیوار )' : key;
                                return `${label}: ${value}`;
                              });
                            if (items.length === 0) return '-';
                            return (
                              <div className="text-xs text-gray-600" dir="rtl" style={{maxWidth: '150px'}}>
                                {items.map((item, index) => (
                                  <div key={index} style={{whiteSpace: 'nowrap'}}>
                                    {item}
                                  </div>
                                ))}
                              </div>
                            );
                          } catch (error) {
                            return '-';
                          }
                        })() || '-'}
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
                            {paper.calender_applied ? t('paper.yes') : t('paper.no')}
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
                                  const materialName = getMaterialDisplayName(materialId);
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
                        <span className="whitespace-nowrap text-right">{t('paper.solubleInWater')}:</span>
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
                              
                              if (setting.bottom) fields.push({ key: t('paper.bottom'), value: setting.bottom });
                              if (setting.top) fields.push({ key: t('paper.top'), value: setting.top });
                              if (setting.cylinder_temperature_before_press != null) {
                                fields.push({ key: t('paper.cylinderTempBeforePress'), value: setting.cylinder_temperature_before_press });
                              }
                              if (setting.cylinder_temperature_after_press != null) {
                                fields.push({ key: t('paper.cylinderTempAfterPress'), value: setting.cylinder_temperature_after_press });
                              }
                              if (setting.paper_temperature_before_starch != null) {
                                fields.push({ key: t('paper.paperTempBeforeStarch'), value: setting.paper_temperature_before_starch });
                              }
                              if (setting.paper_temperature_before_pop_reel != null) {
                                fields.push({ key: t('paper.paperTempBeforePopReel'), value: setting.paper_temperature_before_pop_reel });
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
              <p className="text-lg font-medium mb-2">{t('common.noResults')}</p>
              <p>{t('common.changeFilters')}</p>
            </div>
          )}
          
          {/* Loading More Indicator */}
          {loadingMore && (
            <div className="flex justify-center items-center p-4 border-t">
              <Loader className="w-6 h-6 animate-spin text-primary-600 ml-2" />
              <span className="text-gray-600">{t('common.loading')}</span>
            </div>
          )}
          
          {/* End of List Message */}
          {!loadingMore && !hasMore && papers.length > 0 && (
            <div className="flex justify-center items-center p-4 border-t text-gray-500">
              <span>{t('common.allRecordsShown')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={t('paper.deleteConfirmTitle')}
        message={t('paper.deleteConfirmMessage', { rollNumber: deleteDialog.paper?.roll_number })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        type="danger"
        loading={deleteLoading}
      />

      {/* Print View */}
      {showPrintView && (
        <div className="print-content fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 print:bg-transparent print:bg-opacity-0">
          <div className="print-content bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col print:shadow-none print:rounded-none print:max-h-none print:max-w-none print:fixed print:inset-0 print:bg-white">
            <div className="print:hidden flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{t('paper.printSelected')}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintExecute}
                  className="btn-primary flex items-center"
                >
                  <Printer className="w-5 h-5 ml-2" />
                  {t('paper.print')}
                </button>
                <button
                  onClick={handleClosePrintView}
                  className="btn-secondary flex items-center"
                >
                  <X className="w-5 h-5 ml-2" />
                  {t('common.close')}
                </button>
              </div>
            </div>
            <div className="print-content overflow-auto flex-1 p-4 print:overflow-visible print:p-0">
              <div ref={printContentRef} className="print-content">
                <div className="mb-4 text-center">
                  <h2 className="text-2xl font-bold mb-2">{t('paper.title')}</h2>
                  <p className="text-gray-600">
                    {t('paper.selectedCount', { count: formatPersianDate(selectedPapers.size.toString()) })}
                  </p>
                </div>
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th className="bg-gray-50">{t('paper.rollNumber')}</th>
                      <th className="bg-gray-50">{t('paper.productionLine')}</th>
                      <th className="bg-gray-50">{t('paper.date')} - {t('paper.time')}</th>
                      <th className="bg-gray-50">{t('paper.shift')}</th>
                      <th className="bg-gray-50">{t('paper.paperType')}</th>
                      <th className="bg-gray-50">{t('paper.paperSize')}</th>
                      <th className="bg-gray-50">{t('paper.grammage')}</th>
                      <th className="bg-gray-50">{t('paper.humidity')}</th>
                      <th className="bg-gray-50">{t('paper.ash')}</th>
                      <th className="bg-gray-50">{t('paper.cub')}</th>
                      <th className="bg-gray-50">{t('paper.profile')}</th>
                      <th className="bg-gray-50">جزئیات پروفایل</th>
                      <th className="bg-gray-50">{t('paper.burst')}</th>
                      <th className="bg-gray-50">{t('paper.md')}</th>
                      <th className="bg-gray-50">{t('paper.cd')}</th>
                      <th className="bg-gray-50">{t('paper.cct')}</th>
                      <th className="bg-gray-50">{t('paper.rct')}</th>
                      <th className="bg-gray-50">{t('paper.tear')}</th>
                      <th className="bg-gray-50">{t('paper.calender')}</th>
                      <th className="bg-gray-50">{t('paper.speed')}</th>
                      <th className="bg-gray-50 table-gradient-divider">{t('paper.dilutingValve')}</th>
                      <th className="bg-gray-50">{t('paper.density')}</th>
                      <th className="bg-gray-50">{t('paper.materials')}</th>
                      <th className="bg-gray-50">{t('paper.machineSettings')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPapersList.map((paper) => {
                      const pmSettings = filterPmSettingsForPaper(paper);
                      return (
                        <tr key={paper.id}>
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
                                {paper.shift === 'day' ? t('paper.day') : t('paper.night')}
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
                            {paper.profile_details && (() => {
                              try {
                                const profileDetails = typeof paper.profile_details === 'string' 
                                  ? JSON.parse(paper.profile_details) 
                                  : paper.profile_details;
                                if (!profileDetails || Object.keys(profileDetails).length === 0) return '-';
                                const items = Object.entries(profileDetails)
                                  .filter(([_, value]) => value !== null && value !== undefined)
                                  .map(([key, value]) => {
                                    const label = key === '1' ? '1 ( سالن )' : key === '24' ? '24 ( دیوار-دیوار )' : key;
                                    return `${label}: ${value}`;
                                  });
                                if (items.length === 0) return '-';
                                return (
                                  <div className="text-xs text-gray-600" dir="rtl" style={{maxWidth: '150px'}}>
                                    {items.map((item, index) => (
                                      <div key={index} style={{whiteSpace: 'nowrap'}}>
                                        {item}
                                      </div>
                                    ))}
                                  </div>
                                );
                              } catch (error) {
                                return '-';
                              }
                            })() || '-'}
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
                          <td>
                            {paper.calender_applied !== undefined && (
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                paper.calender_applied 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {paper.calender_applied ? t('paper.yes') : t('paper.no')}
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
                                      const materialName = getMaterialDisplayName(materialId);
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
                                            <span className="whitespace-nowrap text-right">{t('paper.solubleInWater')}:</span>
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
                                  
                                  if (setting.bottom) fields.push({ key: t('paper.bottom'), value: setting.bottom });
                                  if (setting.top) fields.push({ key: t('paper.top'), value: setting.top });
                                  if (setting.cylinder_temperature_before_press != null) {
                                    fields.push({ key: t('paper.cylinderTempBeforePress'), value: setting.cylinder_temperature_before_press });
                                  }
                                  if (setting.cylinder_temperature_after_press != null) {
                                    fields.push({ key: t('paper.cylinderTempAfterPress'), value: setting.cylinder_temperature_after_press });
                                  }
                                  if (setting.paper_temperature_before_starch != null) {
                                    fields.push({ key: t('paper.paperTempBeforeStarch'), value: setting.paper_temperature_before_starch });
                                  }
                                  if (setting.paper_temperature_before_pop_reel != null) {
                                    fields.push({ key: t('paper.paperTempBeforePopReel'), value: setting.paper_temperature_before_pop_reel });
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};