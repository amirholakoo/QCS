import React from 'react';
import { Calendar } from 'lucide-react';
import { DatePicker } from './DatePicker';
import { getCurrentShamsiDate } from '../../utils/persianUtils';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  label?: string;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label,
  className,
}) => {
  const handleClear = () => {
    onStartDateChange('');
    onEndDateChange('');
  };

  return (
    <div className={`${className || ''}`}>
      {label && (
        <label className="form-label mb-2 block">
          {label}
        </label>
      )}
      
      <div className="flex items-center gap-2 flex-wrap">
        <div className="min-w-[140px]">
          <DatePicker
            value={startDate || ''}
            onChange={onStartDateChange}
            label={label ? "از تاریخ" : undefined}
            className="mb-0"
          />
        </div>
        
        <div className="flex items-center text-gray-500" style={{ marginTop: label ? '1.5rem' : '0' }}>
          <span className="text-sm">تا</span>
        </div>
        
        <div className="min-w-[140px]">
          <DatePicker
            value={endDate || ''}
            onChange={onEndDateChange}
            label={label ? "تا تاریخ" : undefined}
            className="mb-0"
          />
        </div>
        
        {(startDate || endDate) && (
          <button
            type="button"
            onClick={handleClear}
            className="btn-secondary btn-sm"
            style={{ marginTop: label ? '1.5rem' : '0' }}
            title="پاک کردن"
          >
            پاک کردن
          </button>
        )}
      </div>
    </div>
  );
};

