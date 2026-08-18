import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Package, FileText, Printer, Edit } from 'lucide-react';
import type { QCRecord } from '../../types';
import { qcAPI } from '../../utils/api';
import { useToast } from '../common/Toast';
import { usePermissions } from '../../hooks/useAPI';
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

export const QCView: React.FC<QCViewProps> = ({ qcRecord, onClose, onEdit }) => {
  const [viewData, setViewData] = useState<QCViewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPrintPage, setShowPrintPage] = useState(false);
  const { showToast } = useToast();
  const { data: permissionsData } = usePermissions();
  const qcPerms = permissionsData?.permissions?.qc || { view: false, add: false, change: false, delete: false };

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">بازگشت</span>
            </button>
            <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
            <h1 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900 truncate">
              مشاهده رکورد کنترل کیفی - QC-{viewData.qc_record.id}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {getStatusBadge(viewData.qc_record.status)}
            
            {qcPerms.change && (
              <button
                onClick={() => onEdit?.(qcRecord)}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                ویرایش
              </button>
            )}
            {qcPerms.view && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Printer className="w-4 h-4" />
                چاپ
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-3 sm:p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* QR Code */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                QR کد
              </h2>
              <div className="text-center">
                <img 
                  src={viewData.qr_code} 
                  alt="QR Code" 
                  className="w-48 h-48 mx-auto border border-gray-200 rounded-lg"
                />
                <p className="text-sm text-gray-600 mt-3">
                  اسکن کنید برای مشاهده جزئیات
                </p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Roll Numbers */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                شماره رول‌ها ({viewData.roll_numbers.length} رول)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {viewData.roll_numbers.map((rollNumber, index) => (
                  <div 
                    key={index}
                    className="bg-gray-50 px-3 py-2 rounded border text-center font-medium"
                  >
                    {rollNumber}
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                اطلاعات مشتری
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">نام و نام خانوادگی:</span>
                  <p className="text-gray-900 mt-1">{viewData.qc_record.customer.name_family}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">شماره تلفن:</span>
                  <p className="text-gray-900 mt-1">{viewData.qc_record.customer.phone_number}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">کد ملی:</span>
                  <p className="text-gray-900 mt-1">{viewData.qc_record.customer.national_code}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">کد پستی:</span>
                  <p className="text-gray-900 mt-1">{viewData.qc_record.customer.postal_code}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="text-sm font-medium text-gray-600">آدرس:</span>
                  <p className="text-gray-900 mt-1">{viewData.qc_record.customer.address}</p>
                </div>
              </div>
            </div>

            {/* Loading Specifications */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                مشخصات بارگیری
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">گراماژ:</span>
                  <p className="text-gray-900 mt-1">{viewData.qc_record.loading_specs.grammage}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">عرض:</span>
                  <p className="text-gray-900 mt-1">{viewData.qc_record.loading_specs.width}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">رطوبت:</span>
                  <p className="text-gray-900 mt-1">{viewData.qc_record.loading_specs.humidity}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">ترکیدگی:</span>
                  <p className="text-gray-900 mt-1">{viewData.qc_record.loading_specs.burst}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">کاب:</span>
                  <p className="text-gray-900 mt-1">{viewData.qc_record.loading_specs.cub}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">MD:</span>
                  <p className="text-gray-900 mt-1">{viewData.qc_record.loading_specs.md}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">CD:</span>
                  <p className="text-gray-900 mt-1">{viewData.qc_record.loading_specs.cd}</p>
                </div>
                {viewData.qc_record.loading_specs.ash !== null && viewData.qc_record.loading_specs.ash !== undefined && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">خاکستر:</span>
                    <p className="text-gray-900 mt-1">{viewData.qc_record.loading_specs.ash}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Custom Fields Table */}
        {viewData.custom_fields_info.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              جدول فیلدهای سفارشی
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-right font-semibold">
                      شماره رول
                    </th>
                    {viewData.custom_fields_info.map((field) => (
                      <th 
                        key={field.field_name}
                        className="border border-gray-300 px-4 py-2 text-right font-semibold"
                      >
                        {field.display_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {viewData.roll_data.map((roll, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-4 py-2 font-medium">
                        {roll.roll_number}
                      </td>
                      {viewData.custom_fields_info.map((field) => (
                        <td 
                          key={field.field_name}
                          className="border border-gray-300 px-4 py-2"
                        >
                          {roll.custom_fields[field.field_name] !== null && roll.custom_fields[field.field_name] !== undefined
                            ? roll.custom_fields[field.field_name]
                            : 'N/A'
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <span className="font-medium">تاریخ ایجاد:</span> {new Date(viewData.qc_record.create_time).toLocaleDateString('fa-IR')}
            </div>
            <div>
              <span className="font-medium">تعداد چاپ:</span> {viewData.qc_record.print_count}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
