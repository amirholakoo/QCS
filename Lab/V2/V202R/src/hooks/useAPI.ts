/**
 * Custom hooks for API operations
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { authAPI, paperAPI, pulpAPI, materialAPI, logsAPI, reportAPI, productionMachineAPI } from '../utils/api';
import type { User, Paper, Pulp, Material, LogEntry, ProductionMachine } from '../types';

// Generic API hook
export const useAPI = <T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = []
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, dependencies);

  return { data, loading, error, refetch: fetchData };
};

// Authentication hooks
export const useCurrentUser = () => {
  return useAPI<{ user: User | null }>(authAPI.getCurrentUser);
};

export const useUsers = () => {
  return useAPI<{ users: User[] }>(authAPI.listUsers);
};

// Paper hooks
export const usePapers = (params?: Record<string, string>) => {
  return useAPI<{ results: Paper[]; count: number }>(
    () => paperAPI.list(params),
    [JSON.stringify(params)]
  );
};

export const usePaper = (id: string) => {
  return useAPI<Paper>(() => paperAPI.get(id), [id]);
};

export const usePaperSuggestions = () => {
  return useAPI<{
    responsible_person_names: string[];
    paper_types: string[];
    shifts: string[];
    temp_before_press_suggestions: number[];
    temp_after_press_suggestions: number[];
    machine_speed_suggestions: number[];
    paper_size_suggestions: number[];
    material_usage_suggestions: {
      [materialId: string]: {
        amounts: number[];
        brands: string[];
      };
    };
  }>(paperAPI.getSuggestions);
};

export const useProductionMachines = () => {
  return useAPI<{ results: ProductionMachine[]; count: number } | ProductionMachine[]>(productionMachineAPI.list);
};

// Pulp hooks
export const usePulps = (params?: Record<string, string>) => {
  return useAPI<{ results: Pulp[]; count: number }>(
    () => pulpAPI.list(params),
    [JSON.stringify(params)]
  );
};

export const usePulp = (id: string) => {
  return useAPI<Pulp>(() => pulpAPI.get(id), [id]);
};

// Material hooks
export const useMaterials = (params?: Record<string, string>) => {
  return useAPI<{ results: Material[]; count: number }>(
    () => materialAPI.list(params),
    [JSON.stringify(params)]
  );
};

export const useMaterial = (id: string) => {
  return useAPI<Material>(() => materialAPI.get(id), [id]);
};

// Logs hooks
export const useLogs = (params?: Record<string, string>) => {
  return useAPI<{ results: LogEntry[]; count: number }>(
    () => logsAPI.list(params), 
    [JSON.stringify(params)]
  );
};

// Mutation hooks for create/update operations
export const useCreatePaper = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPaper = async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await paperAPI.create(data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطا در ایجاد رکورد';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createPaper, loading, error };
};

export const useUpdatePaper = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePaper = async (id: string, data: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await paperAPI.update(id, data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطا در ویرایش رکورد';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updatePaper, loading, error };
};

export const useDeletePaper = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deletePaper = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await paperAPI.delete(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطا در حذف رکورد';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deletePaper, loading, error };
};

// Similar hooks for other entities
export const useCreatePulp = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPulp = async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await pulpAPI.create(data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطا در ایجاد نمونه';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createPulp, loading, error };
};

export const useUpdatePulp = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePulp = async (id: string, data: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await pulpAPI.update(id, data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطا در ویرایش نمونه';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updatePulp, loading, error };
};

export const useDeletePulp = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deletePulp = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await pulpAPI.delete(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطا در حذف نمونه';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deletePulp, loading, error };
};

export const useCreateMaterial = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMaterial = async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Creating material with data:', data);
      const result = await materialAPI.create(data);
      console.log('Material created successfully:', result);
      return result;
    } catch (err) {
      console.error('Error creating material:', err);
      const errorMessage = err instanceof Error ? err.message : 'خطا در ایجاد ماده';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createMaterial, loading, error };
};

export const useUpdateMaterial = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateMaterial = async (id: string, data: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await materialAPI.update(id, data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطا در ویرایش ماده';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateMaterial, loading, error };
};

export const useDeleteMaterial = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteMaterial = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await materialAPI.delete(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطا در حذف ماده';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deleteMaterial, loading, error };
};

// Production Machine mutation hooks
export const useCreateProductionMachine = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProductionMachine = async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await productionMachineAPI.create(data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطا در ایجاد ماشین تولید';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createProductionMachine, loading, error };
};

export const useUpdateProductionMachine = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProductionMachine = async (id: string, data: any) => {
    try {
      setLoading(true);
      setError(null);
      const result = await productionMachineAPI.update(id, data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطا در ویرایش ماشین تولید';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateProductionMachine, loading, error };
};

export const useDeleteProductionMachine = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteProductionMachine = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await productionMachineAPI.delete(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطا در حذف ماشین تولید';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deleteProductionMachine, loading, error };
};

// Authentication mutation hooks
export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (firstName: string, lastName: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await authAPI.loginOrRegister(firstName, lastName);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطا در ورود';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
};

export const useLogout = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await authAPI.logout();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطا در خروج';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { logout, loading, error };
};

// Infinite scroll pagination hook
export const useInfiniteScroll = <T>(
  apiCall: (params: Record<string, string>) => Promise<{ results: T[]; count: number; next: string | null }>,
  baseParams?: Record<string, string>,
  pageSize?: number | 'all'
) => {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastParamsRef = useRef<string>('');

  const fetchData = useCallback(async (pageNum: number, isLoadMore: boolean = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const params: Record<string, string> = { ...baseParams, page: pageNum.toString() };
      
      // Add page_size parameter if specified
      if (pageSize === 'all') {
        params.page_size = '10000'; // Large number to get all records (backend max)
      } else if (pageSize && pageSize > 0) {
        params.page_size = pageSize.toString();
      }
      
      const result = await apiCall(params);

      if (isLoadMore) {
        setData(prev => [...prev, ...result.results]);
      } else {
        setData(result.results);
      }

      setTotalCount(result.count);
      setHasMore(result.next !== null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [apiCall, baseParams, pageSize]);

  // Reset and fetch from beginning when params or pageSize change
  useEffect(() => {
    const currentParams = JSON.stringify({ ...baseParams, pageSize });
    if (currentParams !== lastParamsRef.current) {
      lastParamsRef.current = currentParams;
      setPage(1);
      setData([]);
      setHasMore(true);
      fetchData(1, false);
    }
  }, [baseParams, pageSize, fetchData]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage, true);
    }
  }, [page, loadingMore, hasMore, fetchData]);

  const refetch = useCallback(() => {
    setPage(1);
    setData([]);
    setHasMore(true);
    fetchData(1, false);
  }, [fetchData]);

  // Intersection Observer callback ref
  const lastElementRef = useCallback((node: HTMLElement | null) => {
    if (loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });

    if (node) observerRef.current.observe(node);
  }, [loadingMore, hasMore, loadMore]);

  return {
    data,
    loading,
    loadingMore,
    error,
    hasMore,
    totalCount,
    loadMore,
    refetch,
    lastElementRef
  };
};

// Dashboard stats hook
export const useDashboardStats = () => {
  return useAPI<{
    success: boolean;
    data: {
      daily: any;
      weekly: any;
      monthly: any;
      overall: any;
    };
  }>(reportAPI.getDashboardStats);
};