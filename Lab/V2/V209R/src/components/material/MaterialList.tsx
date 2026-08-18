import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Eye, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Material } from '../../types';
import { useMaterials, useDeleteMaterial } from '../../hooks/useAPI';
import { materialAPI } from '../../utils/api';
import { formatPersianDate } from '../../utils/persianUtils';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { useToast } from '../common/Toast';

interface MaterialListProps {
  onEdit: (material: Material) => void;
  onView: (material: Material) => void;
  onCreate: () => void;
  onRefetch?: () => void;
}

export const MaterialList: React.FC<MaterialListProps> = ({ onEdit, onView, onCreate, onRefetch }) => {
  const { t, i18n } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    material: Material | null;
  }>({ isOpen: false, material: null });
  const [justDeleted, setJustDeleted] = useState<{ id: string; material_name: string } | null>(null);
  const [restoring, setRestoring] = useState(false);

  const { showToast } = useToast();
  const { deleteMaterial, loading: deleteLoading } = useDeleteMaterial();

  useEffect(() => {
    if (!justDeleted) return;
    const timer = setTimeout(() => setJustDeleted(null), 5000);
    return () => clearTimeout(timer);
  }, [justDeleted]);

  // Build API parameters
  const apiParams: Record<string, string> = {};
  if (searchTerm) apiParams.search = searchTerm;
  
  const { data: materialsData, loading, error, refetch } = useMaterials({ ...apiParams, refreshKey: refreshKey.toString() });
  const materials = materialsData?.results || [];
  const totalCount = materialsData?.count || 0;

  // Filter materials based on search
  const filteredMaterials = materials.filter(material => {
    const searchLower = searchTerm.toLowerCase();
    return (
      material.material_name.toLowerCase().includes(searchLower) ||
      (material.en_name && material.en_name.toLowerCase().includes(searchLower)) ||
      (material.description && material.description.toLowerCase().includes(searchLower))
    );
  });

  const handleDeleteClick = (material: Material) => {
    setDeleteDialog({ isOpen: true, material });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.material) return;
    const deleted = deleteDialog.material;
    try {
      await deleteMaterial(deleted.id.toString());
      showToast('success', t('material.deleteSuccess'));
      setDeleteDialog({ isOpen: false, material: null });
      setJustDeleted({ id: String(deleted.id), material_name: deleted.material_name });
      setRefreshKey(prev => prev + 1);
      setTimeout(() => refetch(), 100);
    } catch (error) {
      showToast('error', t('material.deleteError'));
    }
  };

  const handleRestoreMaterial = async () => {
    if (!justDeleted) return;
    setRestoring(true);
    try {
      await materialAPI.restore(justDeleted.id);
      showToast('success', t('material.restoreSuccess'));
      setJustDeleted(null);
      setRefreshKey(prev => prev + 1);
      refetch();
    } catch {
      showToast('error', t('material.restoreError'));
    } finally {
      setRestoring(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, material: null });
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
          <h2 className="text-2xl font-semibold text-gray-900">{t('material.title')}</h2>
          <p className="text-gray-600 mt-1">
            {t('material.total')} {formatPersianDate(totalCount.toString())} {t('material.items')}
          </p>
        </div>
        
        <button onClick={onCreate} className="btn-primary">
          <Plus className="w-5 h-5 ml-2" />
          {t('material.addNew')}
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-body">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('material.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pr-10"
            />
          </div>
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.length > 0 ? (
          filteredMaterials.map(material => (
            <div key={material.id} className="card">
              <div className="card-body">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {material.material_name}
                    </h3>
                    {material.en_name && (
                      <p className="text-sm text-gray-500 mt-1">
                        {material.en_name}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onView(material)}
                      className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                      title={t('common.view')}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(material)}
                      className="text-primary-600 hover:text-primary-700 p-1 rounded hover:bg-primary-50"
                      title={t('common.edit')}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(material)}
                      className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {material.description && (
                  <p className="text-gray-600 text-sm mb-4">
                    {material.description}
                  </p>
                )}
                
                <div className="text-xs text-gray-500 space-y-1">
                  <div>{t('material.creator')}: {material.user || t('material.unknown')}</div>
                  <div>
                    {t('material.createdAt')}: {new Date(material.created_at).toLocaleDateString('fa-IR')}
                  </div>
                  {material.created_at !== material.last_updated && (
                    <div>
                      {t('material.lastUpdated')}: {new Date(material.last_updated).toLocaleDateString('fa-IR')}
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
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-lg font-medium mb-2 text-gray-900">{t('material.noResults')}</p>
                <p className="text-gray-600">{t('material.noResultsMessage')}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {justDeleted && (
        <div className="fixed top-20 sm:top-24 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[100] shadow-xl rounded-lg bg-white border-2 border-primary-200 overflow-hidden">
          <div className="p-3 flex items-center gap-3">
            <span className="flex-1 text-sm text-gray-800">{t('common.undoDeleteMessage')}</span>
            <button type="button" onClick={handleRestoreMaterial} disabled={restoring} className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
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
        title={t('material.deleteConfirmTitle')}
        message={t('material.deleteConfirmMessage', { name: deleteDialog.material?.material_name })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};