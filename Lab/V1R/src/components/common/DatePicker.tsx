import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { getCurrentShamsiDate, isValidShamsiDate, formatPersianDate, persianToEnglishNumbers } from '../../utils/persianUtils';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  required,
  className,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [displayValue, setDisplayValue] = useState(formatPersianDate(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDisplayValue(formatPersianDate(value));
  }, [value]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current && 
        !pickerRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    
    // Convert Persian numerals to English for validation and storage
    const englishValue = persianToEnglishNumbers(inputValue);
    
    if (isValidShamsiDate(englishValue)) {
      onChange(englishValue);
    }
  };

  const handleInputFocus = () => {
    setShowPicker(true);
  };

  const handleDateSelect = (date: string) => {
    onChange(date);
    setDisplayValue(formatPersianDate(date));
    setShowPicker(false);
  };

  // Simple date picker grid (simplified for demo)
  const renderDatePicker = () => {
    const currentDate = value || getCurrentShamsiDate();
    const [year, month, day] = currentDate.split('-').map(Number);
    
    // Generate days for current month (simplified)
    const daysInMonth = 31; // Simplified - in real app, calculate based on month
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    return (
      <div
        ref={pickerRef}
        className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4 mt-1"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => {
              const newYear = year + 1;
              handleDateSelect(`${newYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`);
            }}
          >
            سال بعد
          </button>
          <div className="text-center">
            <div className="font-semibold">{formatPersianDate(`${year}`)}</div>
            <div className="text-sm text-gray-600">ماه {formatPersianDate(month.toString())}</div>
          </div>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => {
              const newYear = year - 1;
              handleDateSelect(`${newYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`);
            }}
          >
            سال قبل
          </button>
        </div>
        
        {/* Quick actions */}
        <div className="space-y-2 mb-4">
          <button
            type="button"
            className="w-full btn-secondary btn-sm"
            onClick={() => handleDateSelect(getCurrentShamsiDate())}
          >
            امروز
          </button>
        </div>
        
        {/* Days grid (simplified) */}
        <div className="grid grid-cols-7 gap-1">
          {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(dayName => (
            <div key={dayName} className="text-center text-xs font-medium text-gray-500 p-2">
              {dayName}
            </div>
          ))}
          
          {days.slice(0, 21).map(dayNumber => {
            const dayString = dayNumber.toString().padStart(2, '0');
            const isSelected = dayNumber === day;
            
            return (
              <button
                key={dayNumber}
                type="button"
                className={`p-2 text-sm rounded hover:bg-gray-100 transition-colors ${
                  isSelected ? 'bg-primary-600 text-white hover:bg-primary-700' : ''
                }`}
                onClick={() => {
                  handleDateSelect(`${year}-${month.toString().padStart(2, '0')}-${dayString}`);
                }}
              >
                {formatPersianDate(dayString)}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`form-group ${className || ''}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-error-500 mr-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className="form-input pl-12"
          placeholder="۱۴۰۴-۰۶-۲۱"
          dir="rtl"
        />
        
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          <Calendar className="w-5 h-5" />
        </div>
        
        {showPicker && renderDatePicker()}
      </div>
    </div>
  );
};