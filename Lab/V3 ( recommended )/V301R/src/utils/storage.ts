// Local storage utilities for mock data persistence
// NOTE: This file is kept for backward compatibility during development
// In production, all data operations should use the Django API
// NOTE: This file is kept for backward compatibility during development
// In production, all data operations should use the Django API

import type { User, Paper, Pulp, Material, LogEntry, Suggestions } from '../types';
import { authAPI, paperAPI, pulpAPI, materialAPI, logsAPI } from './api';
import { authAPI, paperAPI, pulpAPI, materialAPI, logsAPI } from './api';

// Storage keys
const STORAGE_KEYS = {
  USERS: 'papermill_users',
  CURRENT_USER: 'papermill_current_user',
  PAPERS: 'papermill_papers',
  PULPS: 'papermill_pulps',
  MATERIALS: 'papermill_materials',
  LOGS: 'papermill_logs',
  SUGGESTIONS: 'papermill_suggestions',
};

// Flag to determine if we should use API or localStorage
const USE_API = false; // Set to false for offline development

// Generic storage functions
const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to storage:', error);
  }
};

// User storage
export const getUsers = (): User[] => {
  if (USE_API) {
    // This will be handled by React components using the API
    return [];
  }
  if (USE_API) {
    // This will be handled by React components using the API
    return [];
  }
  return getFromStorage(STORAGE_KEYS.USERS, []);
};

export const saveUser = (user: User): void => {
  if (USE_API) {
    // Users are managed by Django authentication
    return;
  }
  if (USE_API) {
    // Users are managed by Django authentication
    return;
  }
  const users = getUsers();
  const existingIndex = users.findIndex(u => u.id === user.id);
  
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  
  saveToStorage(STORAGE_KEYS.USERS, users);
};

export const getCurrentUser = (): User | null => {
  if (USE_API) {
    // This will be handled by React components using the API
    return null;
  }
  if (USE_API) {
    // This will be handled by React components using the API
    return null;
  }
  return getFromStorage(STORAGE_KEYS.CURRENT_USER, null);
};

export const setCurrentUser = (user: User | null): void => {
  if (USE_API) {
    // Session is managed by Django
    return;
  }
  if (USE_API) {
    // Session is managed by Django
    return;
  }
  saveToStorage(STORAGE_KEYS.CURRENT_USER, user);
};

// Paper storage
export const getPapers = (): Paper[] => {
  if (USE_API) {
    // This will be handled by React components using the API
    return [];
  }
  if (USE_API) {
    // This will be handled by React components using the API
    return [];
  }
  return getFromStorage(STORAGE_KEYS.PAPERS, []);
};

export const savePaper = (paper: Paper): void => {
  if (USE_API) {
    // This will be handled by React components using the API
    return;
  }
  if (USE_API) {
    // This will be handled by React components using the API
    return;
  }
  const papers = getPapers();
  const existingIndex = papers.findIndex(p => p.id === paper.id);
  
  if (existingIndex >= 0) {
    papers[existingIndex] = { ...paper, lastUpdated: new Date().toISOString() };
  } else {
    papers.push({ ...paper, createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() });
  }
  
  saveToStorage(STORAGE_KEYS.PAPERS, papers);
  
  // Log the action
  logAction(paper.user, 'Paper', existingIndex >= 0 ? 'edit' : 'create');
  
  // Update suggestions
  updateSuggestions(paper);
};

export const getPaperById = (id: string): Paper | undefined => {
  if (USE_API) {
    // This will be handled by React components using the API
    return undefined;
  }
  if (USE_API) {
    // This will be handled by React components using the API
    return undefined;
  }
  return getPapers().find(p => p.id === id);
};

// Pulp storage
export const getPulps = (): Pulp[] => {
  if (USE_API) {
    // This will be handled by React components using the API
    return [];
  }
  if (USE_API) {
    // This will be handled by React components using the API
    return [];
  }
  return getFromStorage(STORAGE_KEYS.PULPS, []);
};

export const savePulp = (pulp: Pulp): void => {
  if (USE_API) {
    // This will be handled by React components using the API
    return;
  }
  if (USE_API) {
    // This will be handled by React components using the API
    return;
  }
  const pulps = getPulps();
  const existingIndex = pulps.findIndex(p => p.id === pulp.id);
  
  if (existingIndex >= 0) {
    pulps[existingIndex] = { ...pulp, lastUpdated: new Date().toISOString() };
  } else {
    pulps.push({ ...pulp, createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() });
  }
  
  saveToStorage(STORAGE_KEYS.PULPS, pulps);
  
  // Log the action - we need current user for this
  const currentUser = getCurrentUser();
  if (currentUser) {
    logAction(currentUser.username, 'Pulp', existingIndex >= 0 ? 'edit' : 'create');
  }
};

export const getPulpById = (id: string): Pulp | undefined => {
  if (USE_API) {
    // This will be handled by React components using the API
    return undefined;
  }
  if (USE_API) {
    // This will be handled by React components using the API
    return undefined;
  }
  return getPulps().find(p => p.id === id);
};

// Material storage
export const getMaterials = (): Material[] => {
  if (USE_API) {
    // This will be handled by React components using the API
    return [];
  }
  if (USE_API) {
    // This will be handled by React components using the API
    return [];
  }
  return getFromStorage(STORAGE_KEYS.MATERIALS, []);
};

export const saveMaterial = (material: Material): void => {
  if (USE_API) {
    // This will be handled by React components using the API
    return;
  }
  if (USE_API) {
    // This will be handled by React components using the API
    return;
  }
  const materials = getMaterials();
  const existingIndex = materials.findIndex(m => m.id === material.id);
  
  if (existingIndex >= 0) {
    materials[existingIndex] = { ...material, lastUpdated: new Date().toISOString() };
  } else {
    materials.push({ ...material, createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString() });
  }
  
  saveToStorage(STORAGE_KEYS.MATERIALS, materials);
  
  // Log the action
  logAction(material.user, 'Material', existingIndex >= 0 ? 'edit' : 'create');
};

export const getMaterialById = (id: string): Material | undefined => {
  if (USE_API) {
    // This will be handled by React components using the API
    return undefined;
  }
  if (USE_API) {
    // This will be handled by React components using the API
    return undefined;
  }
  return getMaterials().find(m => m.id === id);
};

// Log storage
export const getLogs = (): LogEntry[] => {
  if (USE_API) {
    // This will be handled by React components using the API
    return [];
  }
  if (USE_API) {
    // This will be handled by React components using the API
    return [];
  }
  return getFromStorage(STORAGE_KEYS.LOGS, []);
};

export const logAction = (username: string, modelName: string, actionType: 'create' | 'edit'): void => {
  if (USE_API) {
    // Logging is handled automatically by Django views
    return;
  }
  if (USE_API) {
    // Logging is handled automatically by Django views
    return;
  }
  const logs = getLogs();
  const newLog: LogEntry = {
    id: Date.now().toString(),
    username,
    modelName,
    timestamp: new Date().toISOString(),
    actionType,
  };
  
  logs.unshift(newLog); // Add to beginning
  
  // Keep only last 1000 logs
  if (logs.length > 1000) {
    logs.splice(1000);
  }
  
  saveToStorage(STORAGE_KEYS.LOGS, logs);
};

// Suggestions storage and management
export const getSuggestions = (): Suggestions => {
  if (USE_API) {
    // This will be handled by React components using the API
    return {
      responsiblePersonNames: [],
      starchBrands: [],
      materialNames: [],
      materialUsageAmounts: {},
    };
  }
  if (USE_API) {
    // This will be handled by React components using the API
    return {
      responsiblePersonNames: [],
      starchBrands: [],
      materialNames: [],
      materialUsageAmounts: {},
    };
  }
  return getFromStorage(STORAGE_KEYS.SUGGESTIONS, {
    responsiblePersonNames: [],
    starchBrands: [],
    materialNames: [],
    materialUsageAmounts: {},
  });
};

const updateSuggestions = (paper: Paper): void => {
  if (USE_API) {
    // Suggestions are generated by Django backend
    return;
  }
  if (USE_API) {
    // Suggestions are generated by Django backend
    return;
  }
  const suggestions = getSuggestions();
  
  // Add responsible person name
  if (paper.responsiblePersonName && !suggestions.responsiblePersonNames.includes(paper.responsiblePersonName)) {
    suggestions.responsiblePersonNames.push(paper.responsiblePersonName);
    suggestions.responsiblePersonNames.sort();
  }
  
  // Add starch brand
  if (paper.starchBrand && !suggestions.starchBrands.includes(paper.starchBrand)) {
    suggestions.starchBrands.push(paper.starchBrand);
    suggestions.starchBrands.sort();
  }
  
  // Parse and update material usage suggestions
  if (paper.materialUsage) {
    const materials = getMaterials();
    const usagePairs = paper.materialUsage.split(',');
    
    for (const pair of usagePairs) {
      const [materialId, amountStr] = pair.split(':');
      const amount = parseFloat(amountStr);
      
      if (materialId && !isNaN(amount)) {
        const material = materials.find(m => m.id === materialId);
        if (material) {
          // Add material name to suggestions
          if (!suggestions.materialNames.includes(material.materialName)) {
            suggestions.materialNames.push(material.materialName);
            suggestions.materialNames.sort();
          }
          
          // Add amount to suggestions for this material
          if (!suggestions.materialUsageAmounts[materialId]) {
            suggestions.materialUsageAmounts[materialId] = [];
          }
          
          if (!suggestions.materialUsageAmounts[materialId].includes(amount)) {
            suggestions.materialUsageAmounts[materialId].push(amount);
            suggestions.materialUsageAmounts[materialId].sort((a, b) => b - a); // Descending order
          }
        }
      }
    }
  }
  
  saveToStorage(STORAGE_KEYS.SUGGESTIONS, suggestions);
};

// Initialize with some demo data if empty
export const initializeDemoData = (): void => {
  if (USE_API) {
    // Demo data will be created via Django fixtures or admin
    return;
  }
  if (USE_API) {
    // Demo data will be created via Django fixtures or admin
    return;
  }
  const papers = getPapers();
  const materials = getMaterials();
  
  // Add demo materials if none exist
  if (materials.length === 0) {
    const demoMaterials: Material[] = [
      {
        id: 'mat-1',
        user: 'admin',
        materialName: 'نشاسته ذرت',
        description: 'نشاسته ذرت طبیعی برای تقویت کاغذ',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'mat-2',
        user: 'admin',
        materialName: 'خمیر بازیافتی',
        description: 'خمیر حاصل از بازیافت کاغذهای کهنه',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'mat-3',
        user: 'admin',
        materialName: 'کربنات کلسیم',
        description: 'پرکننده معدنی برای افزایش کیفیت',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    ];
    
    demoMaterials.forEach(material => {
      saveMaterial(material);
    });
  }
};