/**
 * API utilities for connecting to Django backend
 */

const getApiBaseUrl = (): string => {
  // In production, API is served on same origin at /api
  // In development, connect to localhost:8000
  if (import.meta.env.DEV) {
    return 'http://localhost:8000/api';
  }
  // Production: same origin, different path
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

// Get CSRF token from meta tag or cookie
const getCsrfToken = (): string | null => {
  // Try to get from meta tag first
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  if (metaTag) {
    return metaTag.getAttribute('content');
  }
  
  // Fallback to cookie
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrftoken') {
      return value;
    }
  }
  return null;
};

// API request wrapper with authentication
const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  // Add CSRF token for state-changing requests (only if available)
  const method = options.method?.toUpperCase();
  if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      defaultHeaders['X-CSRFToken'] = csrfToken;
    }
    // Don't fail if CSRF token is not available
  }
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Include cookies for session authentication
  };
  
  try {
    console.log('Making API request:', {
      url,
      method: config.method || 'GET',
      hasCredentials: config.credentials === 'include',
      headers: config.headers
    });

    const response = await fetch(url, config);
    
    // Handle different response types
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      // Special handling for CORS errors
      if (response.status === 0 || !response.status) {
        errorMessage = `CORS error: Unable to connect to API at ${url}. Make sure the Django server is running on the correct IP address.`;
        console.error('CORS Error Details:', {
          currentOrigin: window.location.origin,
          targetUrl: url,
          suggestion: 'Check Django CORS_ALLOWED_ORIGINS settings'
        });
      }
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
    
    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return {};
    }
  } catch (error) {
    // Enhanced error logging for CORS issues
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Network/CORS Error:', {
        error: error.message,
        url,
        origin: window.location.origin,
        suggestion: 'This might be a CORS issue. Check if Django server is running and CORS is properly configured.'
      });
    } else {
      console.error('API request failed:', error);
    }
    throw error;
  }
};

// Authentication API
export const authAPI = {
  loginOrRegister: (firstName: string, lastName: string) =>
    apiRequest('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ first_name: firstName, last_name: lastName }),
    }),
  
  logout: () =>
    apiRequest('/auth/logout/', { method: 'POST' }),
  
  getCurrentUser: () =>
    apiRequest('/auth/current-user/'),
  
  listUsers: () =>
    apiRequest('/auth/users/'),
};

// Paper API
export const paperAPI = {
  list: (params?: Record<string, string>) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/paper/records/${queryString}`);
  },
  
  create: (data: any) =>
    apiRequest('/paper/records/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) => {
    return apiRequest(`/paper/records/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  get: (id: string) =>
    apiRequest(`/paper/records/${id}/`),
  
  delete: (id: string) =>
    apiRequest(`/paper/records/${id}/`, {
      method: 'DELETE',
    }),
  
  getSuggestions: () =>
    apiRequest('/paper/records/suggestions/'),
  
  exportXlsx: (params?: Record<string, string>) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return downloadFile(`/paper/records/export_xlsx/${queryString}`);
  },
};

// Production Machine API
export const productionMachineAPI = {
  list: () =>
    apiRequest('/paper/production-machines/'),
  
  create: (data: any) =>
    apiRequest('/paper/production-machines/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) => {
    return apiRequest(`/paper/production-machines/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  get: (id: string) =>
    apiRequest(`/paper/production-machines/${id}/`),
  
  delete: (id: string) =>
    apiRequest(`/paper/production-machines/${id}/`, {
      method: 'DELETE',
    }),
};

// Helper function to download files (Excel, PDF, etc.)
const downloadFile = async (endpoint: string, filename?: string): Promise<void> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    
    // Get filename from Content-Disposition header or use provided filename
    const contentDisposition = response.headers.get('Content-Disposition');
    let finalFilename = filename;
    
    if (!finalFilename && contentDisposition) {
      // Try to extract filename from Content-Disposition header
      // First try UTF-8 encoded format: filename*=UTF-8''encoded-name
      let filenameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
      
      if (filenameMatch && filenameMatch[1]) {
        try {
          finalFilename = decodeURIComponent(filenameMatch[1]);
        } catch (e) {
          // If decoding fails, use the raw value
          finalFilename = filenameMatch[1];
        }
      } else {
        // Try standard format: filename="name" or filename=name
        filenameMatch = contentDisposition.match(/filename=["']?([^"';]+)["']?/i);
        if (filenameMatch && filenameMatch[1]) {
          finalFilename = filenameMatch[1].trim();
        }
      }
    }
    
    link.download = finalFilename || 'download.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
};

// Pulp API
export const pulpAPI = {
  list: (params?: Record<string, string>) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/pulp/records/${queryString}`);
  },
  
  create: (data: any) =>
    apiRequest('/pulp/records/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    apiRequest(`/pulp/records/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  get: (id: string) =>
    apiRequest(`/pulp/records/${id}/`),
  
  delete: (id: string) =>
    apiRequest(`/pulp/records/${id}/`, {
      method: 'DELETE',
    }),
  
  exportXlsx: (params?: Record<string, string>) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return downloadFile(`/pulp/records/export_xlsx/${queryString}`);
  },
  
  getLocationNames: () =>
    apiRequest('/pulp/records/location_names/'),
};

// Paper Type API
export const paperTypeAPI = {
  list: (params?: Record<string, string>) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/paper-type/records/${queryString}`);
  },
  
  create: (data: any) =>
    apiRequest('/paper-type/records/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    apiRequest(`/paper-type/records/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  get: (id: string) =>
    apiRequest(`/paper-type/records/${id}/`),
  
  delete: (id: string) =>
    apiRequest(`/paper-type/records/${id}/`, {
      method: 'DELETE',
    }),
};

// Material API
export const materialAPI = {
  list: (params?: Record<string, string>) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/material/records/${queryString}`);
  },
  
  create: (data: any) =>
    apiRequest('/material/records/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    apiRequest(`/material/records/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  get: (id: string) =>
    apiRequest(`/material/records/${id}/`),
  
  delete: (id: string) =>
    apiRequest(`/material/records/${id}/`, {
      method: 'DELETE',
    }),
};

// Logs API
export const logsAPI = {
  list: (params?: Record<string, string>) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/logs/entries/${queryString}`);
  },
};

// Report API
export const reportAPI = {
  getChartData: () =>
    apiRequest('/report/chart-data/'),
  
  processChartData: () =>
    apiRequest('/report/chart-data/', {
      method: 'POST',
    }),
  
  clearChartData: () =>
    apiRequest('/report/clear-chart-data/'),
  
  getTechnicalReportData: (timeFilter?: string) => {
    const params = timeFilter ? `?time_filter=${timeFilter}` : '';
    return apiRequest(`/report/technical-report-data/${params}`);
  },
  
  getDashboardStats: () =>
    apiRequest('/report/dashboard-stats/'),
  
  exportCompleteReportXlsx: (params?: Record<string, string>) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return downloadFile(`/report/complete-report-export-xlsx/${queryString}`);
  },

  getPLCKeys: () =>
    apiRequest('/report/plc-keys/'),

  getRollPLCData: (params?: Record<string, string>) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/report/roll-plc-data/${queryString}`);
  },

  syncPLCData: (timeRange?: string) => {
    const params = timeRange ? `?time_range=${timeRange}` : '';
    return apiRequest(`/report/sync-plc-data/${params}`, {
      method: 'POST',
    });
  },

  getPLCColumnPreference: () =>
    apiRequest('/report/plc-column-preference/'),

  savePLCColumnPreference: (visibleKeys: number[]) =>
    apiRequest('/report/plc-column-preference/', {
      method: 'POST',
      body: JSON.stringify({ visible_keys: visibleKeys }),
    }),
};

// QC (Quality Control) API
export const qcAPI = {
  // QC Records
  listRecords: (params?: Record<string, string>) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/qc/records/${queryString}`);
  },
  
  createRecord: (data: any) =>
    apiRequest('/qc/records/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updateRecord: (id: string, data: any) =>
    apiRequest(`/qc/records/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  getRecord: (id: string) =>
    apiRequest(`/qc/records/${id}/`),
  
  deleteRecord: (id: string) =>
    apiRequest(`/qc/records/${id}/`, {
      method: 'DELETE',
    }),
  
  // Recent papers for QC
  getRecentPapers: (hours: number = 24, excludeQcId: string | undefined = undefined, searchQuery: string = '', onlyUnused: boolean = false) => {
    let url = `/qc/records/recent_papers/?hours=${hours}`;
    if (excludeQcId) {
      url += `&exclude_qc_id=${excludeQcId}`;
    }
    if (searchQuery) {
      url += `&search=${encodeURIComponent(searchQuery)}`;
    }
    if (onlyUnused) {
      url += `&only_unused=true`;
    }
    return apiRequest(url);
  },
  
  // Available paper fields
  getPaperFields: () =>
    apiRequest('/qc/records/paper_fields/'),
  
  // Bulk create QC record with all related data
  bulkCreate: (data: any) =>
    apiRequest('/qc/records/bulk_create/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // Generate QR code for QC record
  generateQR: (id: string) =>
    apiRequest(`/qc/records/${id}/generate_qr_data/`, {
      method: 'POST',
    }),
  
  // Generate PDF for QC record
  generatePDF: (id: string) =>
    apiRequest(`/qc/records/${id}/generate_pdf/`, {
      method: 'POST',
    }),
  
  // Get print page data for QC record
  getPrintPageData: (id: string) =>
    apiRequest(`/qc/records/${id}/print_page_data/`),
  
  // Save column order for print table
  saveColumnOrder: (id: string, columnOrder: string[]) =>
    apiRequest(`/qc/records/${id}/save_column_order/`, {
      method: 'POST',
      body: JSON.stringify({ column_order: columnOrder }),
    }),
  
  
  // Customers
  listCustomers: (params?: Record<string, string>) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/qc/customers/${queryString}`);
  },
  
  createCustomer: (data: any) =>
    apiRequest('/qc/customers/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updateCustomer: (id: string, data: any) =>
    apiRequest(`/qc/customers/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  getCustomer: (id: string) =>
    apiRequest(`/qc/customers/${id}/`),
  
  deleteCustomer: (id: string) =>
    apiRequest(`/qc/customers/${id}/`, {
      method: 'DELETE',
    }),
  
  // Loading specifications
  listLoading: (params?: Record<string, string>) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/qc/loading/${queryString}`);
  },
  
  createLoading: (data: any) =>
    apiRequest('/qc/loading/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updateLoading: (id: string, data: any) =>
    apiRequest(`/qc/loading/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  getLoading: (id: string) =>
    apiRequest(`/qc/loading/${id}/`),
  
  deleteLoading: (id: string) =>
    apiRequest(`/qc/loading/${id}/`, {
      method: 'DELETE',
    }),
};