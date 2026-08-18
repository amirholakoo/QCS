import React, { useState, useEffect, useMemo } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import { qcAPI } from '../../utils/api';
import { useToast } from '../common/Toast';
import logoImage from '../../assets/images/logo.jpg';

interface QCPrintPageProps {
  qcRecordId: string;
  onClose?: () => void;
}

export interface PrintPageData {
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
  column_order?: string[] | null;
}

interface QCPrintContentProps {
  data: PrintPageData;
  onClose?: () => void;
  onPrint?: () => void;
  showControls?: boolean;
  allowColumnReorder?: boolean;
  onColumnOrderChange?: (order: string[]) => void;
  qcRecordId?: string;
}

export const QCPrintContent: React.FC<QCPrintContentProps> = ({
  data,
  onClose,
  onPrint,
  showControls = true,
  allowColumnReorder = false,
  onColumnOrderChange,
  qcRecordId,
}) => {
  // Initialize column order from saved data or default to field order
  const getInitialColumnOrder = (): string[] => {
    if (data.column_order && data.column_order.length > 0) {
      const validFieldNames = new Set(data.custom_fields_info.map((field) => field.field_name));
      const savedOrder = data.column_order.filter((fieldName) => validFieldNames.has(fieldName));
      const missingFields = data.custom_fields_info
        .map((field) => field.field_name)
        .filter((fieldName) => !savedOrder.includes(fieldName));
      return [...savedOrder, ...missingFields];
    }

    // Desired default order: break, gsm, moisture, burst, cub, md, cd, ash
    const desiredOrderKeywords: string[][] = [
      ['tear', 'break', 'numberoftears', 'break'],
      ['gram', 'gsm', 'گرماژ', 'grammage', 'real_grammage'],
      ['width','عرض','paper_size'],
      ['humid', 'humidity', 'moisture', 'رطوبت'],
      ['burst', 'ترکیدگی', 'burst_test', 'burst'],
      ['cub', 'cobb', 'کاب'],
      ['md', 'tensile_strength_md', 'tensile md'],
      ['cd', 'tensile_strength_cd', 'tensile cd'],
      ['ash', 'خاکستر', 'ash']
    ];

    const fieldNames = data.custom_fields_info.map((f) => f.field_name);

    const findByKeywords = (keywords: string[]) => {
      const lowered = keywords.map(k => k.toLowerCase());
      // Check both field_name and display_name for a match
      const found = data.custom_fields_info.find(f => {
        const fname = (f.field_name || '').toString().toLowerCase();
        const dname = (f.display_name || '').toString().toLowerCase();
        return lowered.some(k => fname.includes(k) || dname.includes(k));
      });
      return found ? found.field_name : null;
    };

    const ordered: string[] = [];
    desiredOrderKeywords.forEach(kws => {
      const found = findByKeywords(kws);
      if (found && !ordered.includes(found)) ordered.push(found);
    });

    // Append any other fields that weren't matched
    fieldNames.forEach(fn => {
      if (!ordered.includes(fn)) ordered.push(fn);
    });

    return ordered;
  };

  const [columnOrder, setColumnOrder] = useState<string[]>(getInitialColumnOrder);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [dragOverField, setDragOverField] = useState<string | null>(null);

  useEffect(() => {
    // Update column order when data changes, but preserve saved order if available
    if (data.column_order && data.column_order.length > 0) {
      const validFieldNames = new Set(data.custom_fields_info.map((field) => field.field_name));
      const savedOrder = data.column_order.filter((fieldName) => validFieldNames.has(fieldName));
      const missingFields = data.custom_fields_info
        .map((field) => field.field_name)
        .filter((fieldName) => !savedOrder.includes(fieldName));
      setColumnOrder([...savedOrder, ...missingFields]);
    } else {
      // Use same desired-order-matching logic as getInitialColumnOrder
      const desiredOrderKeywords: string[][] = [
        ['tear', 'break', 'numberoftears', 'break'],
        ['gram', 'gsm', 'گرماژ', 'grammage', 'real_grammage'],
        ['humid', 'humidity', 'moisture', 'رطوبت'],
        ['burst', 'ترکیدگی', 'burst_test', 'burst'],
        ['cub', 'cobb', 'کاب'],
        ['md', 'tensile_strength_md', 'tensile md'],
        ['cd', 'tensile_strength_cd', 'tensile cd'],
        ['ash', 'خاکستر', 'ash']
      ];

      const fieldNames = data.custom_fields_info.map((f) => f.field_name);
      const findByKeywords = (keywords: string[]) => {
        const lowered = keywords.map(k => k.toLowerCase());
        const found = data.custom_fields_info.find(f => {
          const fname = (f.field_name || '').toString().toLowerCase();
          const dname = (f.display_name || '').toString().toLowerCase();
          return lowered.some(k => fname.includes(k) || dname.includes(k));
        });
        return found ? found.field_name : null;
      };

      const ordered: string[] = [];
      desiredOrderKeywords.forEach(kws => {
        const found = findByKeywords(kws);
        if (found && !ordered.includes(found)) ordered.push(found);
      });
      fieldNames.forEach(fn => { if (!ordered.includes(fn)) ordered.push(fn); });
      setColumnOrder(ordered);
    }
  }, [data.custom_fields_info, data.column_order]);

  const fieldInfoMap = useMemo(() => {
    const map = new Map<string, { field_name: string; display_name: string }>();
    data.custom_fields_info.forEach((field) => {
      map.set(field.field_name, field);
    });
    return map;
  }, [data.custom_fields_info]);

  const handleDragStart = (fieldName: string) => (event: React.DragEvent) => {
    if (!allowColumnReorder) return;
    setDraggedField(fieldName);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', fieldName);
  };

  const handleDragOver = (fieldName: string) => (event: React.DragEvent) => {
    if (!allowColumnReorder) return;
    event.preventDefault();
    if (dragOverField !== fieldName) {
      setDragOverField(fieldName);
    }
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetField: string) => (event: React.DragEvent) => {
    if (!allowColumnReorder) return;
    event.preventDefault();
    const sourceField = draggedField || event.dataTransfer.getData('text/plain');
    if (!sourceField || sourceField === targetField) {
      setDraggedField(null);
      setDragOverField(null);
      return;
    }

    setColumnOrder((prevOrder) => {
      const newOrder = [...prevOrder];
      const sourceIndex = newOrder.indexOf(sourceField);
      const targetIndex = newOrder.indexOf(targetField);

      if (sourceIndex === -1 || targetIndex === -1) {
        return prevOrder;
      }

      newOrder.splice(sourceIndex, 1);
      newOrder.splice(targetIndex, 0, sourceField);
      onColumnOrderChange?.(newOrder);
      return newOrder;
    });

    setDraggedField(null);
    setDragOverField(null);
  };

  // Save column order to backend when it changes
  useEffect(() => {
    if (qcRecordId && allowColumnReorder && columnOrder.length > 0) {
      // Debounce the save operation to avoid too many API calls
      const timeoutId = setTimeout(() => {
        qcAPI.saveColumnOrder(qcRecordId, columnOrder).catch((error) => {
          console.error('Failed to save column order:', error);
        });
      }, 500); // Wait 500ms after last change

      return () => clearTimeout(timeoutId);
    }
  }, [columnOrder, qcRecordId, allowColumnReorder]);

  const handleDragEnd = () => {
    setDraggedField(null);
    setDragOverField(null);
  };

  const orderedFieldInfo = columnOrder
    .map((fieldName) => fieldInfoMap.get(fieldName))
    .filter((field): field is { field_name: string; display_name: string } => Boolean(field));

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className={`${showControls ? 'min-h-screen' : ''} bg-white`}>
      {showControls && (
        <div className="print:hidden bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onClose && (
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  بازگشت
                </button>
              )}
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-bold text-gray-900">
                صفحه چاپ - QC-{data.qc_record.id}
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
      )}

      <div className="p-4 max-w-full w-full print-content">
        <div className="mt-2 flex items-center w-full justify-between text-center border-b border-gray-200 pb-2 mb-2">
          <div className="flex flex-col justify-center items-center">
            <h6 className="text-1xl font-bold text-gray-900">
              گزارش کنترل کیفی
            </h6>
            <div className="flex mr-4 justify-center items-center gap-4 print:gap-2 text-sm mt-2 text-gray-700">
              (
              <span>QC-{data.qc_record.id}</span>
              <span>|</span>
              <span>{new Date(data.qc_record.create_time).toLocaleDateString('fa-IR')}</span>
              )
            </div>
          </div>
          <div className="h-20 mt-3 print:h-16 flex items-center justify-center">
            <img className="max-h-20 ml-4" src={logoImage} alt="logo" />
          </div>
        </div>

        <div className="flex w-full justify-between items-center gap-8 print:gap-4 mb-8 print:mb-6">
          <div className="space-y-3" style={{ width: '75%' }}>
            <div>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-2 gap-4 gap-2">
                    <div className="text-sm">
                      <span className="font-medium text-gray-600">نام و نام خانوادگی:</span>
                      <span className="text-gray-900 mr-2">{data.qc_record.customer.name_family}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-600">شماره تلفن:</span>
                      <span className="text-gray-900 mr-2">{data.qc_record.customer.phone_number}</span>
                    </div>
                  </div>
                  <div className="grid gap-4 print:gap-2">
                    <div className="print:text-sm">
                      <span className="font-medium text-gray-600">آدرس:</span>
                      <span className="text-gray-900 mr-2">{data.qc_record.customer.address}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="grid grid-cols-9 gap-1">
                  {data.roll_numbers.map((rollNumber, index) => (
                    <div
                      key={`${rollNumber}-${index}`}
                      className="bg-white px-1 py-1 rounded border text-center font-medium print:text-lg"
                    >
                      {rollNumber}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-start" style={{ width: '25%' }}>
            <h2 className="text-xl print:text-lg font-semibold text-gray-900 mb-4 print:mb-2 print:hidden">
              QR کد
            </h2>
            <div className="flex justify-center w-48 h-48 print:w-40 print:h-40 border border-gray-200 print:border-gray-400 rounded-lg print:rounded items-center">
              {data.qr_code ? (
                <img
                  src={data.qr_code}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-gray-400 text-center text-sm px-4">
                  QR کد پس از ذخیره در دسترس قرار می‌گیرد
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-2 print:hidden">
              اسکن کنید برای مشاهده جزئیات
            </p>
          </div>
        </div>

        <div className="print:hidden space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              مشخصات بارگیری
            </h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">GSM (گرماژ):</span>
                  <p className="text-gray-900">{data.qc_record.loading_specs.grammage ?? '-'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Width (عرض):</span>
                  <p className="text-gray-900">{data.qc_record.loading_specs.width ?? '-'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Moisture (رطوبت):</span>
                  <p className="text-gray-900">{data.qc_record.loading_specs.humidity ?? '-'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Burst (ترکیدگی):</span>
                  <p className="text-gray-900">{data.qc_record.loading_specs.burst ?? '-'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">COBB:</span>
                  <p className="text-gray-900">{data.qc_record.loading_specs.cub ?? '-'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">MD:</span>
                  <p className="text-gray-900">{data.qc_record.loading_specs.md ?? '-'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">CD:</span>
                  <p className="text-gray-900">{data.qc_record.loading_specs.cd ?? '-'}</p>
                </div>
                {data.qc_record.loading_specs.ash !== null && data.qc_record.loading_specs.ash !== undefined && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Ash (خاکستر):</span>
                    <p className="text-gray-900">{data.qc_record.loading_specs.ash}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {data.custom_fields_info.length > 0 && (
          <div className="mt-8 print:mt-3">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 print:text-xs" style={{ fontSize: '12px' }}>
                <thead className="bg-gray-50 print:bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-right font-semibold" style={{ fontSize: '12px' }}>
                      شماره رول
                    </th>
                    {orderedFieldInfo.map((field) => (
                      <th
                        key={field.field_name}
                        className={`border border-gray-300 px-4 py-2 print:px-1 text-right font-semibold ${
                          allowColumnReorder ? 'cursor-move select-none' : ''
                        } ${dragOverField === field.field_name ? 'bg-primary-100' : ''}`}
                        style={{ fontSize: '12px' }}
                        draggable={allowColumnReorder}
                        onDragStart={handleDragStart(field.field_name)}
                        onDragOver={handleDragOver(field.field_name)}
                        onDrop={handleDrop(field.field_name)}
                        onDragEnd={handleDragEnd}
                        title={allowColumnReorder ? 'برای تغییر جای ستون بکشید' : undefined}
                      >
                        {field.display_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.roll_data.map((roll, index) => (
                    <tr
                      key={`${roll.roll_number}-${index}`}
                      className={
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50 print:bg-gray-100'
                      }
                    >
                      <td className="border border-gray-300 px-4 py-2 print:px-1 print:py-0.5 font-medium" style={{ fontSize: '12px' }}>
                        {roll.roll_number}
                      </td>
                      {orderedFieldInfo.map((field) => (
                        <td
                          key={field.field_name}
                          className="border border-gray-300 px-4 py-2 print:px-1 print:py-0.5"
                          style={{ fontSize: '12px' }}
                        >
                          {roll.custom_fields[field.field_name] !== null &&
                          roll.custom_fields[field.field_name] !== undefined
                            ? roll.custom_fields[field.field_name]
                            : '0'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showControls && (
          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600 print:hidden">
            <p>
              تعداد چاپ: {data.qc_record.print_count} | 
              وضعیت: {data.qc_record.status === 'completed' ? 'تکمیل شده' : 
                       data.qc_record.status === 'printed' ? 'چاپ شده' : 'پیش‌نویس'}
            </p>
            <p className="mt-2">
              تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')} - {new Date().toLocaleTimeString('fa-IR')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

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
    <QCPrintContent
      data={printData}
      onClose={onClose}
      onPrint={handlePrint}
      showControls
      allowColumnReorder
      qcRecordId={qcRecordId}
    />
  );
};
