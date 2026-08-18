import React, { useState } from 'react';
import { Save, X, User, CreditCard, Phone, MapPin, Mail } from 'lucide-react';
import type { Customer } from '../../types';
import { qcAPI } from '../../utils/api';
import { useToast } from '../common/Toast';

interface CustomerFormProps {
  onSave: (customer: Customer) => void;
  onCancel: () => void;
  customer?: Customer;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ 
  onSave, 
  onCancel, 
  customer 
}) => {
  const [formData, setFormData] = useState({
    name_family: customer?.name_family || '',
    national_code: customer?.national_code || '',
    phone_number: customer?.phone_number || '',
    address: customer?.address || '',
    postal_code: customer?.postal_code || '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name_family.trim()) {
      newErrors.name_family = 'نام و نام خانوادگی الزامی است';
    }

    if (!formData.national_code.trim()) {
      newErrors.national_code = 'کد ملی الزامی است';
    } else if (!/^\d{10}$/.test(formData.national_code.trim())) {
      newErrors.national_code = 'کد ملی باید 10 رقم باشد';
    }

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'شماره تلفن الزامی است';
    } else if (!/^09\d{9}$/.test(formData.phone_number.trim())) {
      newErrors.phone_number = 'شماره تلفن معتبر نیست (مثال: 09123456789)';
    }

    if (formData.postal_code && !/^\d{10}$/.test(formData.postal_code.trim())) {
      newErrors.postal_code = 'کد پستی باید 10 رقم باشد';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      
      let savedCustomer: Customer;
      
      if (customer?.id) {
        // Update existing customer
        savedCustomer = await qcAPI.updateCustomer(customer.id, formData);
        showToast('مشتری با موفقیت بروزرسانی شد', 'success');
      } else {
        // Create new customer
        savedCustomer = await qcAPI.createCustomer(formData);
        showToast('مشتری جدید با موفقیت ایجاد شد', 'success');
      }
      
      onSave(savedCustomer);
    } catch (error: any) {
      console.error('Failed to save customer:', error);
      
      // Handle validation errors from server
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        showToast('خطا در ذخیره اطلاعات مشتری', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          {customer?.id ? 'ویرایش مشتری' : 'مشتری جدید'}
        </h3>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-2" />
            نام و نام خانوادگی *
          </label>
          <input
            type="text"
            value={formData.name_family}
            onChange={(e) => handleChange('name_family', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.name_family ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="نام و نام خانوادگی را وارد کنید"
          />
          {errors.name_family && (
            <p className="mt-1 text-sm text-red-600">{errors.name_family}</p>
          )}
        </div>

        {/* National Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <CreditCard className="w-4 h-4 inline mr-2" />
            کد ملی *
          </label>
          <input
            type="text"
            value={formData.national_code}
            onChange={(e) => handleChange('national_code', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.national_code ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="کد ملی 10 رقمی"
            maxLength={10}
          />
          {errors.national_code && (
            <p className="mt-1 text-sm text-red-600">{errors.national_code}</p>
          )}
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Phone className="w-4 h-4 inline mr-2" />
            شماره تلفن *
          </label>
          <input
            type="tel"
            value={formData.phone_number}
            onChange={(e) => handleChange('phone_number', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.phone_number ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="09123456789"
            maxLength={11}
          />
          {errors.phone_number && (
            <p className="mt-1 text-sm text-red-600">{errors.phone_number}</p>
          )}
        </div>

        {/* Postal Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Mail className="w-4 h-4 inline mr-2" />
            کد پستی
          </label>
          <input
            type="text"
            value={formData.postal_code}
            onChange={(e) => handleChange('postal_code', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.postal_code ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="کد پستی 10 رقمی"
            maxLength={10}
          />
          {errors.postal_code && (
            <p className="mt-1 text-sm text-red-600">{errors.postal_code}</p>
          )}
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-2" />
            آدرس
          </label>
          <textarea
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="آدرس کامل"
            maxLength={300}
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-md inline-flex items-center transition-colors"
          >
            انصراف
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'در حال ذخیره...' : customer?.id ? 'بروزرسانی' : 'ذخیره'}
          </button>
        </div>
      </form>
    </div>
  );
};
