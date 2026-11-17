import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Eye, Trash2, FileType, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PaperTypeItem } from '../../types';
import { usePaperTypes, useDeletePaperType, usePermissions } from '../../hooks/useAPI';
import { paperTypeAPI } from '../../utils/api';
import { formatPersianDate } from '../../utils/persianUtils';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { useToast } from '../common/Toast';

interface PaperTypeListProps {
  onEdit: (paperType: PaperTypeItem) => void;
  onView: (paperType: PaperTypeItem) => void;
  onCreate: () => void;
  onRefetch?: () => void;
}

export const PaperTypeList: React.FC<PaperTypeListProps> = ({ onEdit, onView, onCreate, onRefetch }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    paperType: PaperTypeItem | null;
  }>({ isOpen: false, paperType: null });
  const [justDeleted, setJustDeleted] = useState<{ id: string; name: string } | null>(null);
  const [restoring, setRestoring] = useState(false);

  const { showToast } = useToast();
  const { deletePaperType, loading: deleteLoading } = useDeletePaperType();
  const { data: permissionsData } = usePermissions();
  const paperTypePerms = permissionsData?.permissions?.paper_type || { view: false, add: false, change: false, delete: false };

  useEffect(() => {
    if (!justDeleted) return;
    const timer = setTimeout(() => setJustDeleted(null), 5000);
    return () => clearTimeout(timer);
  }, [justDeleted]);

  // Build API parameters
  const apiParams: Record<string, string> = {};
  if (searchTerm) apiParams.search = searchTerm;
  
  const { data: paperTypesData, loading, error, refetch } = usePaperTypes({ ...apiParams, refreshKey: refreshKey.toString() });
  const paperTypes = paperTypesData?.results || [];
  const totalCount = paperTypesData?.count || 0;

  // Filter paper types based on search
  const filteredPaperTypes = paperTypes.filter(paperType => {
    const searchLower = searchTerm.toLowerCase();
    return paperType.name.toLowerCase().includes(searchLower);
  });

  const handleDeleteClick = (paperType: PaperTypeItem) => {
    setDeleteDialog({ isOpen: true, paperType });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.paperType) return;
    const deleted = deleteDialog.paperType;
    try {
      await deletePaperType(deleted.id.toString());
      showToast('success', t('paperType.deleteSuccess'));
      setDeleteDialog({ isOpen: false, paperType: null });
      setJustDeleted({ id: String(deleted.id), name: deleted.name });
      setRefreshKey(prev => prev + 1);
      setTimeout(() => refetch(), 100);
    } catch (error) {
      showToast('error', t('paperType.deleteError'));
    }
  };

  const handleRestorePaperType = async () => {
    if (!justDeleted) return;
    setRestoring(true);
    try {
      await paperTypeAPI.restore(justDeleted.id);
      showToast('success', t('paperType.restoreSuccess'));
      setJustDeleted(null);
      setRefreshKey(prev => prev + 1);
      refetch();
    } catch {
      showToast('error', t('paperType.restoreError'));
    } finally {
      setRestoring(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, paperType: null });
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{t('paperType.title')}</h2>
          <p className="text-gray-600 mt-1">
            {t('paperType.total')} {formatPersianDate(totalCount.toString())} {t('paperType.items')}
          </p>
        </div>
        
        {paperTypePerms.add && (
          <button onClick={onCreate} className="btn-primary">
            <Plus className="w-5 h-5 ml-2" />
            {t('paperType.addNew')}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-body">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('paperType.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pr-10"
            />
          </div>
        </div>
      </div>

      {/* Paper Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPaperTypes.length > 0 ? (
          filteredPaperTypes.map(paperType => (
            <div key={paperType.id} className="card">
              <div className="card-body">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <FileType className="w-5 h-5 text-primary-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {paperType.name}
                    </h3>
                  </div>
                  
                    <div className="flex items-center gap-2">
                      {paperTypePerms.view && (
                        <button
                          onClick={() => onView(paperType)}
                          className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                          title={t('common.view')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {paperTypePerms.change && (
                        <button
                          onClick={() => onEdit(paperType)}
                          className="text-primary-600 hover:text-primary-700 p-1 rounded hover:bg-primary-50"
                          title={t('common.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {paperTypePerms.delete && (
                        <button
                          onClick={() => handleDeleteClick(paperType)}
                          className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                </div>
                
                <div className="text-xs text-gray-500 space-y-1 mt-4">
                  <div>
                    {t('paperType.createdAt')}: {new Date(paperType.created_at).toLocaleDateString('fa-IR')}
                  </div>
                  {paperType.created_at !== paperType.last_updated && (
                    <div>
                      {t('paperType.lastUpdated')}: {new Date(paperType.last_updated).toLocaleDateString('fa-IR')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full">
            <div className="card">
              <div className="card-body text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileType className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-lg font-medium mb-2 text-gray-900">{t('paperType.noResults')}</p>
                <p className="text-gray-600">{t('paperType.noResultsMessage')}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {justDeleted && (
        <div className="fixed top-20 sm:top-24 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[100] shadow-xl rounded-lg bg-white border-2 border-primary-200 overflow-hidden">
          <div className="p-3 flex items-center gap-3">
            <span className="flex-1 text-sm text-gray-800">{t('common.undoDeleteMessage')}</span>
            <button type="button" onClick={handleRestorePaperType} disabled={restoring} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
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
        title={t('paperType.deleteConfirmTitle')}
        message={t('paperType.deleteConfirmMessage', { name: deleteDialog.paperType?.name })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};

