/**
 * Custom hooks for API operations
 */
import { useState, useEffect } from 'react';
import { authAPI, paperAPI, pulpAPI, materialAPI, logsAPI } from '../utils/api';
import type { User, Paper, Pulp, Material, LogEntry } from '../types';

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
    material_usage_suggestions: {
      [materialId: string]: {
        amounts: number[];
        brands: string[];
      };
    };
  }>(paperAPI.getSuggestions);
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