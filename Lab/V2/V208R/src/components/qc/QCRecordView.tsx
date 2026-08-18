import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Package, FileText, Printer, Edit } from 'lucide-react';
import type { QCRecord } from '../../types';
import { qcAPI } from '../../utils/api';
import { useToast } from '../common/Toast';
import { QCPrintPage } from './QCPrintPage';

interface QCViewProps {
  qcRecord: QCRecord;
  onClose?: () => void;
  onEdit?: (qcRecord: QCRecord) => void;
}

interface QCViewData {
  qc_record: {
    id: string;
    customer: {
      name_family: string;
      phone_number: string;
      national_code: string;
      address: string;
      postal_code: string;
    };
    loading_specs: {
      grammage: number;
      width: number;
      humidity: number;
      burst: number;
      cub: number;
      md: number;
      cd: number;
      ash?: number;
      custom: boolean;
    };
    create_time: string;
    print_count: number;
    status: string;
  };
  qr_code: string;
  roll_numbers: string[];
  roll_data: Array<{
    roll_number: string;
    custom_fields: Record<string, any>;
  }>;
  custom_fields_info: Array<{
    field_name: string;
    display_name: string;
  }>;
}

export const QCRecordView: React.FC<QCViewProps> = ({ qcRecord, onClose, onEdit }) => {
  const [viewData, setViewData] = useState<QCViewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPrintPage, setShowPrintPage] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadViewData();
  }, [qcRecord.id]);

  const loadViewData = async () => {
    try {
      setIsLoading(true);
      const response = await qcAPI.getPrintPageData(qcRecord.id);
      if (response.success) {
        setViewData(response);
      } else {
        showToast('error', 'خطا در بارگذاری اطلاعات');
      }
    } catch (error) {
      console.error('Failed to load QC view data:', error);
      showToast('error', 'خطا در بارگذاری اطلاعات');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    setShowPrintPage(true);
  };

  const handleClosePrintPage = () => {
    setShowPrintPage(false);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: 'پیش‌نویس', className: 'bg-gray-100 text-gray-800' },
      completed: { label: 'تکمیل شده', className: 'bg-blue-100 text-blue-800' },
      printed: { label: 'چاپ شده', className: 'bg-green-100 text-green-800' },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.draft;
    
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  if (showPrintPage && viewData) {
    return (
      <QCPrintPage 
        qcRecordId={qcRecord.id} 
        onClose={handleClosePrintPage}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="mr-3 text-gray-600">در حال بارگذاری...</span>
      </div>
    );
  }

  if (!viewData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">خطا در بارگذاری اطلاعات</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            بازگشت
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="flex flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              QC-{viewData.qc_record.id}
            </h1>
          </div>
          <button
              onClick={onClose}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="">بازگشت</span>
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-3 sm:p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

            {/* Loading Specifications */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-center gap-2">
                <Package className="w-5 h-5" />
                مشخصات
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div>
                  <span className="text-lg ">نام مشتری:</span>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{viewData.qc_record.customer.name_family}</p>
                </div>
                <hr />
                <div>
                  <span className="text-lg">عرض:</span>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{viewData.qc_record.loading_specs.width}</p>
                </div>
              </div>
            </div>
          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Roll Numbers */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                شماره رول‌ها ({viewData.roll_numbers.length} رول)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {viewData.roll_numbers.map((rollNumber, index) => (
                  <div 
                    key={index}
                    className="text-2xl font-bold bg-gray-50 px-3 py-2 rounded border text-center"
                  >
                    {rollNumber}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
