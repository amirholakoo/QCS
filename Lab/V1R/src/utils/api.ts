/**
 * API utilities for connecting to Django backend
 */

// Auto-detect API base URL based on current host
const getApiBaseUrl = (): string => {
  const currentHost = window.location.hostname;
  const currentPort = window.location.port;
  const currentProtocol = window.location.protocol;
  
  // Always use the same host as the frontend is running on
  // This ensures CORS compliance across different network configurations
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    return 'http://localhost:8000/api';
  } else {
    // For network IPs, use the same IP but port 8000 for the API
    return `${currentProtocol}//${currentHost}:8000/api`;
  }
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
};