import type { User, AppSection } from '../types';

/**
 * Check if user has access to a specific page.
 * Default behavior: All users have access to all pages unless admin restricts them.
 * Dashboard is always accessible.
 */
export const hasPageAccess = (user: User | null, pageName: AppSection): boolean => {
  if (!user) {
    return false;
  }
  
  // Dashboard is always accessible
  if (pageName === 'dashboard') {
    return true;
  }
  
  // Default: If allowed_pages is null, undefined, or empty array, user has access to ALL pages
  // This is the default behavior - all users can see all pages unless admin restricts
  if (!user.allowed_pages || 
      user.allowed_pages === null || 
      user.allowed_pages === undefined ||
      (Array.isArray(user.allowed_pages) && user.allowed_pages.length === 0)) {
    return true;
  }
  
  // If admin has set specific pages, check if this page is in the list
  if (Array.isArray(user.allowed_pages)) {
    return user.allowed_pages.includes(pageName);
  }
  
  // Fallback: allow access if we can't determine restrictions
  return true;
};

/**
 * Filter navigation items based on user permissions.
 */
export const filterNavItems = <T extends { key: AppSection }>(
  items: T[],
  user: User | null
): T[] => {
  if (!user) {
    return [];
  }
  
  return items.filter(item => hasPageAccess(user, item.key));
};
