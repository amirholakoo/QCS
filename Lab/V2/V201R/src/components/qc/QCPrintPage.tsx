import React, { useState, useEffect } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import { qcAPI } from '../../utils/api';
import { useToast } from '../common/Toast';

interface QCPrintPageProps {
  qcRecordId: string;
  onClose?: () => void;
}

interface PrintPageData {
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

export const QCPrintPage: React.FC<QCPrintPageProps> = ({ qcRecordId, onClose }) => {
  const [printData, setPrintData] = useState<PrintPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    loadPrintData();
  }, [qcRecordId]);

  const loadPrintData = async () => {
    try {
      setIsLoading(true);
      const response = await qcAPI.getPrintPageData(qcRecordId);
      if (response.success) {
        setPrintData(response);
      } else {
        showToast('error', 'خطا در بارگذاری داده‌های چاپ');
      }
    } catch (error) {
      console.error('Failed to load print data:', error);
      showToast('error', 'خطا در بارگذاری داده‌های چاپ');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="mr-3 text-gray-600">در حال بارگذاری...</span>
      </div>
    );
  }

  if (!printData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">خطا در بارگذاری داده‌های چاپ</p>
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
    <div className="min-h-screen bg-white">
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              بازگشت
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-xl font-bold text-gray-900">
              صفحه چاپ - QC-{printData.qc_record.id}
            </h1>
          </div>
          
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            چاپ
          </button>
        </div>
      </div>

      {/* Print Content */}
      <div className="p-4 max-w-full w-full print-content">
        {/* Header with Title, Date, and QC Number */}
        <div className="mt-2 flex items-center w-full justify-between w-full items-center text-center border-b border-gray-200 pb-2 mb-2">
          <div className="flex flex-col justify-center items-center">
            <h6 className="text-1xl font-bold text-gray-900">
              گزارش کنترل کیفی
            </h6>
            <div className="flex mr-4 justify-center items-center gap-4 print:gap-2 text-sm mt-2 text-gray-700">
              (
              <span>QC-{printData.qc_record.id}</span>
              <span>|</span>
              <span>{new Date(printData.qc_record.create_time).toLocaleDateString('fa-IR')}</span>
              )
            </div>
          </div>
          <div className="h-20 mt-3 print:h-16 flex items-center justify-center">
            <img className=' max-h-20 ml-4' src="src/assets/images/logo.jpg" alt="logo" />
          </div>
        </div>

        {/* Main Content Row: QR Code (Left) and Customer Details + Roll Numbers (Right) */}
        <div className="flex w-full justify-between items-center gap-8 print:gap-4 mb-8 print:mb-6">
          {/* Customer Details and Roll Numbers - Right Side */}
          <div className="space-y-3" style={{width: '75%'}}>
            {/* Customer Information */}
            <div>
              <h2 className="text-xl print:text-lg font-semibold text-gray-900 mb-3 print:mb-2">
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-2 gap-4 gap-2">
                    <div className="text-sm">
                      <span className="font-medium text-gray-600">نام و نام خانوادگی:</span>
                      <span className="text-gray-900 mr-2">{printData.qc_record.customer.name_family}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-600">شماره تلفن:</span>
                      <span className="text-gray-900 mr-2">{printData.qc_record.customer.phone_number}</span>
                    </div>
                  </div>
                  <div className="grid gap-4 print:gap-2">
                    <div className="print:text-sm">
                      <span className="font-medium text-gray-600">آدرس:</span>
                      <span className="text-gray-900 mr-2">{printData.qc_record.customer.address}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Roll Numbers */}
            <div>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="grid grid-cols-9 gap-1">
                  {printData.roll_numbers.map((rollNumber, index) => (
                    <div
                      key={index}
                      className="bg-white px-1 py-1 rounded border text-center font-medium print:text-lg"
                    >
                      {rollNumber}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* QR Code - Left Side */}
          <div className="flex flex-col items-center justify-start" style={{width: '25%'}}>
            <h2 className="text-xl print:text-lg font-semibold text-gray-900 mb-4 print:mb-2 print:hidden">
              QR کد
            </h2>
            <div className="flex justify-center">
              <img 
                src={printData.qr_code} 
                alt="QR Code" 
                className="w-48 h-48 print:w-40 print:h-40 border border-gray-200 print:border-gray-400 rounded-lg print:rounded"
              />
            </div>
            <p className="text-sm text-gray-600 mt-2 print:hidden">
              اسکن کنید برای مشاهده جزئیات
            </p>
          </div>
        </div>

        {/* Additional Information - Hidden in print, shown only on screen */}
        <div className="print:hidden space-y-6">

          {/* Loading Specifications - Hidden in print */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              مشخصات بارگیری
            </h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">گراماژ:</span>
                  <p className="text-gray-900">{printData.qc_record.loading_specs.grammage}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">عرض:</span>
                  <p className="text-gray-900">{printData.qc_record.loading_specs.width}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">رطوبت:</span>
                  <p className="text-gray-900">{printData.qc_record.loading_specs.humidity}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">ترکیدگی:</span>
                  <p className="text-gray-900">{printData.qc_record.loading_specs.burst}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">کاب:</span>
                  <p className="text-gray-900">{printData.qc_record.loading_specs.cub}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">MD:</span>
                  <p className="text-gray-900">{printData.qc_record.loading_specs.md}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">CD:</span>
                  <p className="text-gray-900">{printData.qc_record.loading_specs.cd}</p>
                </div>
                {printData.qc_record.loading_specs.ash !== null && printData.qc_record.loading_specs.ash !== undefined && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">خاکستر (Ash):</span>
                    <p className="text-gray-900">{printData.qc_record.loading_specs.ash}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Custom Fields Table */}
        {printData.custom_fields_info.length > 0 && (
          <div className="mt-8 print:mt-3">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 print:text-xs" style={{fontSize: '12px'}}>
                <thead>
                  <tr className="bg-gray-50 print:bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-right font-semibold" style={{fontSize: '12px'}}>
                      شماره رول
                    </th>
                    {printData.custom_fields_info.map((field) => (
                      <th 
                        key={field.field_name}
                        className="border border-gray-300 px-4 py-2 print:px-1 text-right font-semibold" style={{fontSize: '12px'}}
                      >
                        {field.display_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {printData.roll_data.map((roll, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50 print:bg-gray-100'}>
                      <td className="border border-gray-300 px-4 py-2 print:px-1 print:py-0.5 font-medium" style={{fontSize: '12px'}}>
                        {roll.roll_number}
                      </td>
                      {printData.custom_fields_info.map((field) => (
                        <td 
                          key={field.field_name}
                          className="border border-gray-300 px-4 py-2 print:px-1 print:py-0.5" style={{fontSize: '12px'}}
                        >
                          {roll.custom_fields[field.field_name] !== null && roll.custom_fields[field.field_name] !== undefined
                            ? roll.custom_fields[field.field_name]
                            : '0'
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

        {/* Footer - Hidden in print */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600 print:hidden">
          <p>
            تعداد چاپ: {printData.qc_record.print_count} | 
            وضعیت: {printData.qc_record.status === 'completed' ? 'تکمیل شده' : 
                     printData.qc_record.status === 'printed' ? 'چاپ شده' : 'پیش‌نویس'}
          </p>
          <p className="mt-2">
            تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')} - {new Date().toLocaleTimeString('fa-IR')}
          </p>
        </div>
      </div>
    </div>
  );
};
