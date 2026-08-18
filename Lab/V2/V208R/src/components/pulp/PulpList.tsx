import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Edit, Eye, Trash2, Loader, Download, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Pulp } from '../../types';
import { useInfiniteScroll, useDeletePulp } from '../../hooks/useAPI';
import { pulpAPI } from '../../utils/api';
import { formatPersianDate, formatPersianTime, isValidShamsiDate } from '../../utils/persianUtils';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { useToast } from '../common/Toast';
import { getProductionLineColors } from '../../utils/productionLineColors';

interface PulpListProps {
  onEdit: (pulp: Pulp) => void;
  onView: (pulp: Pulp) => void;
  onCreate: () => void;
  onRefetch?: () => void;
}

export const PulpList: React.FC<PulpListProps> = ({ onEdit, onView, onCreate, onRefetch }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [pageSize, setPageSize] = useState<number | 'all'>(50);
  const [exportStartDate, setExportStartDate] = useState<string>('');
  const [exportEndDate, setExportEndDate] = useState<string>('');
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    pulp: Pulp | null;
  }>({ isOpen: false, pulp: null });
  const [justDeleted, setJustDeleted] = useState<{ id: string; roll_number?: number | null } | null>(null);
  const [restoring, setRestoring] = useState(false);

  const { showToast } = useToast();
  const { deletePulp, loading: deleteLoading } = useDeletePulp();
  const [exporting, setExporting] = useState(false);
  const [locationNames, setLocationNames] = useState<Array<{ id: number; title: string }>>([]);

  useEffect(() => {
    if (!justDeleted) return;
    const timer = setTimeout(() => setJustDeleted(null), 5000);
    return () => clearTimeout(timer);
  }, [justDeleted]);

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

  // Build API parameters (server-side search)
  const apiParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (searchTerm) params.search = searchTerm;
    return params;
  }, [searchTerm]);
  
  // Use infinite scroll hook
  const { 
    data: pulps, 
    loading, 
    loadingMore,
    error, 
    hasMore,
    totalCount,
    refetch,
    lastElementRef
  } = useInfiniteScroll<Pulp>(pulpAPI.list, apiParams, pageSize);

  const handleDeleteClick = (pulp: Pulp) => {
    setDeleteDialog({ isOpen: true, pulp });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.pulp) return;
    const deleted = deleteDialog.pulp;
    try {
      await deletePulp(deleted.id.toString());
      showToast('success', t('pulp.deleteSuccess'));
      setDeleteDialog({ isOpen: false, pulp: null });
      setJustDeleted({ id: String(deleted.id), roll_number: deleted.roll_number });
      refetch();
    } catch (error) {
      showToast('error', t('pulp.deleteError'));
    }
  };

  const handleRestorePulp = async () => {
    if (!justDeleted) return;
    setRestoring(true);
    try {
      await pulpAPI.restore(justDeleted.id);
      showToast('success', t('pulp.restoreSuccess'));
      setJustDeleted(null);
      refetch();
    } catch {
      showToast('error', t('pulp.restoreError'));
    } finally {
      setRestoring(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, pulp: null });
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
      if (exportStartDate) params.date_from = exportStartDate;
      if (exportEndDate) params.date_to = exportEndDate;
      
      await pulpAPI.exportXlsx(params);
      showToast('success', t('paper.exportSuccess'));
    } catch (error) {
      console.error('Export failed:', error);
      showToast('error', t('paper.exportError'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">{t('pulp.title')}</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {t('paper.showing')} {formatPersianDate(pulps.length.toString())} {t('common.of')} {formatPersianDate(totalCount.toString())} {t('common.records')}
            {pageSize !== 'all' && ` (${formatPersianDate(pageSize.toString())} ${t('paper.recordsPerPage')})`}
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
            {t('pulp.addNewSample')}
          </button>
        </div>
      </div>

      {/* Search and Page Size */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                  placeholder={t('pulp.searchPlaceholder')}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="form-input pr-10"
                />
              </div>
            </form>

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

      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">{t('common.loading')}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="text-center text-red-600 p-8">
          <p>{t('paper.errorLoading')}: {error}</p>
          <button onClick={refetch} className="btn-primary mt-4">
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Pulps Table */}
      {!loading && !error && (
        <div className="card">
          <div className="card-body p-0">
            {pulps.length > 0 ? (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="table">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr>
                  <th className="bg-gray-50">{t('pulp.operations')}</th>
                    <th className="bg-gray-50">{t('pulp.rollNumber')}</th>
                    <th className="bg-gray-50">{t('pulp.productionLine')}</th>
                    <th className="bg-gray-50">{t('pulp.samplingTime')}</th>
                    <th className="bg-gray-50">{t('pulp.lowerConsistency')}</th>
                    <th className="bg-gray-50">{t('pulp.lowerWaterFilter')}</th>
                    <th className="bg-gray-50">{t('pulp.lowerFreeness')}</th>
                    <th className="bg-gray-50">{t('pulp.lowerPh')}</th>
                    <th className="bg-gray-50">{t('pulp.lowerTemperature')}</th>
                    <th className="bg-gray-50">{t('pulp.upperConsistency')}</th>
                    <th className="bg-gray-50">{t('pulp.upperWaterFilter')}</th>
                    <th className="bg-gray-50">{t('pulp.upperFreeness')}</th>
                    <th className="bg-gray-50">{t('pulp.upperPh')}</th>
                    <th className="bg-gray-50">{t('pulp.upperTemperature')}</th>
                    <th className="bg-gray-50">{t('pulp.pond8')}</th>
                    <th className="bg-gray-50">{t('pulp.curtain')}</th>
                    <th className="bg-gray-50">{t('pulp.thickener')}</th>
                    {/* Dynamic columns for location names */}
                    {locationNames.map((loc) => (
                      <th key={loc.id} className="bg-gray-50">{loc.title}</th>
                    ))}
                    <th className="bg-gray-50">{t('pulp.createdAt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pulps.map((pulp, index) => (
                    <tr 
                      key={pulp.id} 
                      className="table-row-hover"
                      ref={index === pulps.length - 1 && pageSize !== 'all' ? lastElementRef : null}
                    >
                      <td>
                        <div className="items-center gap-2">
                          <button
                            onClick={() => onView(pulp)}
                            className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                            title={t('common.view')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEdit(pulp)}
                            className="text-primary-600 hover:text-primary-700 p-1 rounded hover:bg-primary-50"
                            title={t('common.edit')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="font-medium">
                        {pulp.roll_number || '-'}
                      </td>
                      <td>
                        {pulp.ProductionLine !== undefined && pulp.ProductionLine !== null ? (
                          (() => {
                            const colors = getProductionLineColors(pulp.ProductionLine);
                            return (
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
                                {colors.label}
                              </span>
                            );
                          })()
                        ) : '-'}
                      </td>
                      <td>
                        {pulp.lower_sampling_time ? formatPersianTime(pulp.lower_sampling_time) : '-'}
                      </td>
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
                      <td>
                        {new Date(pulp.created_at).toLocaleDateString('fa-IR')}
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
              <p className="text-lg font-medium mb-2">{t('common.noResults')}</p>
              <p>{t('pulp.noResultsMessage')}</p>
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
          {!loadingMore && !hasMore && pulps.length > 0 && (
            <div className="flex justify-center items-center p-4 border-t text-gray-500">
              <span>{t('common.allRecordsShown')}</span>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Delete Confirmation Dialog */}
      {justDeleted && (
        <div className="fixed top-20 sm:top-24 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[100] shadow-xl rounded-lg bg-white border-2 border-primary-200 overflow-hidden">
          <div className="p-3 flex items-center gap-3">
            <span className="flex-1 text-sm text-gray-800">{t('common.undoDeleteMessage')}</span>
            <button type="button" onClick={handleRestorePulp} disabled={restoring} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              {restoring ? '...' : t('common.return')}
            </button>
            <button type="button" onClick={() => setJustDeleted(null)} className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="h-1 bg-primary-100 rounded-b-lg overflow-hidden">
            <div className="return-alert-progress h-full bg-primary-500 rounded-b" />
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={t('pulp.deleteConfirmTitle')}
        message={t('pulp.deleteConfirmMessage', { rollNumber: deleteDialog.pulp?.roll_number || deleteDialog.pulp?.id })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};