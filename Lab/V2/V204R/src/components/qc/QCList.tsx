import React, { useState, useEffect } from 'react';
import { Plus, Eye, Edit, Trash2, Printer, QrCode, Search, Filter } from 'lucide-react';
import type { QCRecord } from '../../types';
import { qcAPI } from '../../utils/api';
import { useToast } from '../common/Toast';
import { QCPrintPage } from './QCPrintPage';

interface QCListProps {
  onEdit?: (record: QCRecord) => void;
  onView?: (record: QCRecord) => void;
  onCreate?: () => void;
}

export const QCList: React.FC<QCListProps> = ({ onEdit, onView, onCreate }) => {
  const [records, setRecords] = useState<QCRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [printRecordId, setPrintRecordId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadRecords();
  }, [currentPage, statusFilter]);

  const loadRecords = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = {
        page: currentPage.toString(),
      };
      
      if (statusFilter) {
        params.status = statusFilter;
      }
      
      const response = await qcAPI.listRecords(params);
      setRecords(response.results || []);
      setTotalPages(Math.ceil((response.count || 0) / 20));
    } catch (error) {
      console.error('Failed to load QC records:', error);
      showToast('خطا در بارگذاری رکوردهای کنترل کیفی', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این رکورد اطمینان دارید؟')) {
      return;
    }

    try {
      await qcAPI.deleteRecord(id);
      showToast('رکورد با موفقیت حذف شد', 'success');
      loadRecords();
    } catch (error) {
      console.error('Failed to delete QC record:', error);
      showToast('خطا در حذف رکورد', 'error');
    }
  };

  const handleOpenPrintPage = (record: QCRecord) => {
    setPrintRecordId(record.id);
  };

  const handleClosePrintPage = () => {
    setPrintRecordId(null);
  };

  const handleGenerateQR = async (record: QCRecord) => {
    try {
      const response = await qcAPI.generateQR(record.id);
      if (response.success && response.qr_code) {
        // Open QR code in new window or show in modal
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head><title>QR Code - ${record.id}</title></head>
              <body style="text-align: center; padding: 20px;">
                <h2>QR Code for QC Record ${record.id}</h2>
                <img src="${response.qr_code}" alt="QR Code" style="max-width: 300px;" />
                <br><br>
                <button onclick="window.print()">چاپ</button>
              </body>
            </html>
          `);
        }
      }
      showToast('QR کد با موفقیت ایجاد شد', 'success');
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      showToast('خطا در ایجاد QR کد', 'error');
    }
  };

  const filteredRecords = records.filter(record =>
    record.roll_numbers_display?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show print page if a record is selected for printing
  if (printRecordId) {
    return (
      <QCPrintPage 
        qcRecordId={printRecordId} 
        onClose={handleClosePrintPage}
      />
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: 'پیش‌نویس', className: 'bg-gray-100 text-gray-800' },
      completed: { label: 'تکمیل شده', className: 'bg-blue-100 text-blue-800' },
      printed: { label: 'چاپ شده', className: 'bg-green-100 text-green-800' },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.draft;
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="mr-3 text-gray-600">در حال بارگذاری...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">کنترل کیفی</h1>
          <p className="text-gray-600 mt-1">مدیریت رکوردهای کنترل کیفی</p>
        </div>
        
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          ایجاد رکورد جدید
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="جستجو در رکوردها..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="draft">پیش‌نویس</option>
            <option value="completed">تکمیل شده</option>
            <option value="printed">چاپ شده</option>
          </select>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  شناسه
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  شماره رول‌ها
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  مشتری
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عرض
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  کاربر
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  وضعیت
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  تعداد چاپ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  تاریخ ایجاد
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    QC-{record.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{record.roll_numbers_display}</span>
                      {record.roll_numbers_count && record.roll_numbers_count > 1 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {record.roll_numbers_count} رول
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.customer_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.loading_detail?.width || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.user_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(record.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.print_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(record.create_time).toLocaleDateString('fa-IR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onView?.(record)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="مشاهده"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => onEdit?.(record)}
                        className="text-yellow-600 hover:text-yellow-900 p-1 rounded"
                        title="ویرایش"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleGenerateQR(record)}
                        className="text-purple-600 hover:text-purple-900 p-1 rounded"
                        title="تولید QR کد"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleOpenPrintPage(record)}
                        className="text-green-600 hover:text-green-900 p-1 rounded"
                        title="چاپ"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded"
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

        {filteredRecords.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">هیچ رکوردی یافت نشد</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            قبلی
          </button>
          
          <span className="px-4 py-2 text-sm text-gray-700">
            صفحه {currentPage} از {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            بعدی
          </button>
        </div>
      )}
    </div>
  );
};
