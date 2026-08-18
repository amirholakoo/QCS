import React, { useState } from 'react';
import { Plus, Search, Edit, Eye, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Speed } from '../../types';
import { useSpeeds, useDeleteSpeed } from '../../hooks/useAPI';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { useToast } from '../common/Toast';
import { SPEED_FIELDS } from './speedFields';

interface SpeedListProps {
  onEdit: (speed: Speed) => void;
  onView: (speed: Speed) => void;
  onCreate: () => void;
}

export const SpeedList: React.FC<SpeedListProps> = ({ onEdit, onView, onCreate }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; speed: Speed | null }>({ isOpen: false, speed: null });

  const { showToast } = useToast();
  const { deleteSpeed, loading: deleteLoading } = useDeleteSpeed();

  const apiParams: Record<string, string> = {};
  if (searchTerm) apiParams.search = searchTerm;

  const { data: speedsData, loading, error, refetch } = useSpeeds(apiParams);
  const speeds = speedsData?.results ?? [];
  const totalCount = speedsData?.count ?? 0;

  const handleDeleteClick = (speed: Speed) => {
    setDeleteDialog({ isOpen: true, speed });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.speed) return;
    try {
      await deleteSpeed(deleteDialog.speed.id.toString());
      showToast('success', t('speed.speedDeleteSuccess'));
      setDeleteDialog({ isOpen: false, speed: null });
      setTimeout(() => refetch(), 100);
    } catch {
      showToast('error', t('speed.speedDeleteError'));
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, speed: null });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <p>{t('speed.errorLoading')}: {error}</p>
        <button type="button" onClick={() => refetch()} className="btn-primary mt-4">{t('common.retry')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{t('speed.speedsTitle')}</h2>
          <p className="text-gray-600 mt-1">
            {t('speed.total')} {totalCount} {t('speed.items')}
          </p>
        </div>
        <button type="button" onClick={onCreate} className="btn-primary">
          <Plus className="w-5 h-5 ml-2" />
          {t('speed.addNewSpeed')}
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('speed.searchPlaceholder')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="form-input pr-10"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          {speeds.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('speed.operations')}</th>
                    <th>{t('speed.rollNumber')}</th>
                    {SPEED_FIELDS.map(({ labelKey, speedKey }) => (
                      <th key={String(speedKey)} className="min-w-[80px] text-center" title={String(speedKey)}>{labelKey}</th>
                    ))}
                    <th>{t('speed.date')} - {t('speed.time')}</th>
                    <th>{t('speed.lastUpdated')}</th>
                  </tr>
                </thead>
                <tbody>
                  {speeds.map(speed => (
                    <tr key={speed.id} className="table-row-hover">
                      <td>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => onView(speed)} className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50" title={t('common.view')}>
                            <Eye className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => onEdit(speed)} className="text-primary-600 hover:text-primary-700 p-1 rounded hover:bg-primary-50" title={t('common.edit')}>
                            <Edit className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => handleDeleteClick(speed)} className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50" title={t('common.delete')}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="font-medium">{speed.Roll_Number ?? '-'}</td>
                      {SPEED_FIELDS.map(({ speedKey }) => {
                        const key = speedKey as keyof Speed;
                        return <td key={String(key)} className="text-center">{speed[key] ?? '-'}</td>;
                      })}
                      <td>
                        {new Date(speed.created_at).toLocaleDateString('fa-IR')} <br />
                        {new Date(speed.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        {new Date(speed.last_updated).toLocaleDateString('fa-IR')} <br />
                        {new Date(speed.last_updated).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
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
              <p className="text-lg font-medium mb-2">{t('speed.noResults')}</p>
              <p>{t('speed.noResultsMessage')}</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={t('speed.deleteConfirmTitle')}
        message={t('speed.deleteConfirmMessageSpeed', { drive: deleteDialog.speed?.Roll_Number ?? '' })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};
