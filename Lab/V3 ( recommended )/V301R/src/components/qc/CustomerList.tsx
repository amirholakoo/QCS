import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Check, User, Phone, CreditCard, MapPin } from 'lucide-react';
import type { Customer } from '../../types';
import { qcAPI } from '../../utils/api';
import { useToast } from '../common/Toast';

interface CustomerListProps {
  onSelect: (customer: Customer) => void;
  onCreateNew: () => void;
  selectedCustomer?: Customer;
}

export const CustomerList: React.FC<CustomerListProps> = ({ 
  onSelect, 
  onCreateNew,
  selectedCustomer 
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { showToast } = useToast();
  
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Debounce search term with safer approach
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
    }
    
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchTerm]);

  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = {
        page: currentPage.toString(),
      };
      
      if (debouncedSearchTerm.trim()) {
        params.search = debouncedSearchTerm.trim();
      }
      
      const response = await qcAPI.listCustomers(params);
      setCustomers(response.results || []);
      setTotalPages(Math.ceil((response.count || 0) / 20));
    } catch (error) {
      console.error('Failed to load customers:', error);
      showToast('خطا در بارگذاری لیست مشتریان', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearchTerm]);

  // Load customers when debounced search term or page changes
  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  const handleSelectCustomer = useCallback((customer: Customer) => {
    try {
      onSelect(customer);
    } catch (error) {
      console.error('Error selecting customer:', error);
      showToast('خطا در انتخاب مشتری', 'error');
    }
  }, [onSelect, showToast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="mr-3 text-gray-600">در حال بارگذاری...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">انتخاب مشتری</h3>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          مشتری جدید
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          key="customer-search-input"
          type="text"
          placeholder="جستجو بر اساس نام، تلفن، کد ملی یا کد پستی..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pr-10 pl-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          autoComplete="off"
        />
        {isSearching && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Customer List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {customers.map((customer) => (
          <div
            key={customer.id}
            onClick={() => handleSelectCustomer(customer)}
            className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
              selectedCustomer?.id === customer.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{customer.name_family}</span>
                  {selectedCustomer?.id === customer.id && (
                    <Check className="w-4 h-4 text-primary-600" />
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3 h-3" />
                    <span>کد ملی: {customer.national_code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3" />
                    <span>تلفن: {customer.phone_number}</span>
                  </div>
                  {customer.postal_code && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      <span>کد پستی: {customer.postal_code}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center gap-2 md:col-span-2">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">آدرس: {customer.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {customers.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'هیچ مشتری با این مشخصات یافت نشد' : 'هیچ مشتری ثبت نشده است'}
          </p>
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors mx-auto"
          >
            <Plus className="w-4 h-4" />
            ایجاد اولین مشتری
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4 border-t">
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
