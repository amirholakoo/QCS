import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { formatPersianTime, persianToEnglishNumbers, isValidTime } from '../../utils/persianUtils';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  label,
  required,
  className,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [displayValue, setDisplayValue] = useState(formatPersianTime(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDisplayValue(formatPersianTime(value));
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
    
    if (isValidTime(englishValue)) {
      onChange(englishValue);
    }
  };

  const handleInputFocus = () => {
    setShowPicker(true);
  };

  const handleTimeSelect = (time: string) => {
    onChange(time);
    setDisplayValue(formatPersianTime(time));
    setShowPicker(false);
  };

  // Time picker with scrollable hours and minutes
  const renderTimePicker = () => {
    const [currentHours, currentMinutes] = (value || '00:00').split(':').map(Number);
    
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);
    
    return (
      <div
        ref={pickerRef}
        className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 mt-1"
      >
        <div className="p-4">
          <div className="text-center mb-3 text-sm font-medium text-gray-700">
            انتخاب زمان
          </div>
          
          <div className="flex gap-2 justify-center">
            {/* Hours */}
            <div className="flex flex-col items-center">
              <div className="text-xs text-gray-500 mb-1">ساعت</div>
              <div className="h-32 overflow-y-auto border border-gray-200 rounded">
                {hours.map(hour => (
                  <button
                    key={hour}
                    type="button"
                    className={`w-12 py-1 text-sm hover:bg-gray-100 transition-colors ${
                      hour === currentHours ? 'bg-primary-600 text-white hover:bg-primary-700' : ''
                    }`}
                    onClick={() => {
                      const timeString = `${hour.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;
                      handleTimeSelect(timeString);
                    }}
                  >
                    {formatPersianTime(hour.toString().padStart(2, '0'))}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center text-gray-400">:</div>
            
            {/* Minutes */}
            <div className="flex flex-col items-center">
              <div className="text-xs text-gray-500 mb-1">دقیقه</div>
              <div className="h-32 overflow-y-auto border border-gray-200 rounded">
                {minutes.filter(m => m % 5 === 0).map(minute => (
                  <button
                    key={minute}
                    type="button"
                    className={`w-12 py-1 text-sm hover:bg-gray-100 transition-colors ${
                      minute === currentMinutes ? 'bg-primary-600 text-white hover:bg-primary-700' : ''
                    }`}
                    onClick={() => {
                      const timeString = `${currentHours.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                      handleTimeSelect(timeString);
                    }}
                  >
                    {formatPersianTime(minute.toString().padStart(2, '0'))}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Quick time buttons */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {['08:00', '16:00', '00:00'].map(quickTime => (
              <button
                key={quickTime}
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => handleTimeSelect(quickTime)}
              >
                {formatPersianTime(quickTime)}
              </button>
            ))}
          </div>
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
          className="form-input pl-12 time-input"
          placeholder="۰۸:۳۰"
          dir="ltr"
        />
        
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          <Clock className="w-5 h-5" />
        </div>
        
        {showPicker && renderTimePicker()}
      </div>
    </div>
  );
};