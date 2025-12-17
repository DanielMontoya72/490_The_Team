import { useState, useCallback, useEffect } from 'react';

interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
}

interface PaginatedResult<T> {
  data: T[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  pagination: PaginationState;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  reset: () => void;
}

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

/**
 * Generic pagination state hook
 * Use this with your own data fetching logic
 * 
 * Example:
 * const pagination = usePagination<Job>({ initialPageSize: 20 });
 * 
 * // In your query:
 * const from = pagination.pagination.page * pagination.pagination.pageSize;
 * const to = from + pagination.pagination.pageSize - 1;
 * 
 * // After fetching:
 * pagination.setData(fetchedData);
 * pagination.setTotalCount(totalCount);
 */
export function usePagination<T>(
  options: UsePaginationOptions = {}
): PaginatedResult<T> & {
  setData: (data: T[]) => void;
  setTotalCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
} {
  const { initialPage = 0, initialPageSize = 20 } = options;

  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: initialPage,
    pageSize: initialPageSize,
    totalCount: 0,
  });

  const totalPages = Math.ceil(pagination.totalCount / pagination.pageSize);
  const hasNextPage = pagination.page < totalPages - 1;
  const hasPreviousPage = pagination.page > 0;

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(0, Math.min(page, Math.max(0, totalPages - 1)));
    setPagination(prev => ({ ...prev, page: validPage }));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setPagination(prev => ({ ...prev, page: prev.page - 1 }));
    }
  }, [hasPreviousPage]);

  const setPageSize = useCallback((size: number) => {
    setPagination(prev => ({
      ...prev,
      pageSize: size,
      page: 0, // Reset to first page when changing page size
    }));
  }, []);

  const setTotalCount = useCallback((count: number) => {
    setPagination(prev => ({ ...prev, totalCount: count }));
  }, []);

  const reset = useCallback(() => {
    setPagination({
      page: initialPage,
      pageSize: initialPageSize,
      totalCount: 0,
    });
    setData([]);
    setError(null);
  }, [initialPage, initialPageSize]);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
    setIsFetching(loading);
  }, []);

  return {
    data,
    isLoading,
    isFetching,
    error,
    pagination,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    reset,
    setData,
    setTotalCount,
    setLoading,
    setError,
  };
}

/**
 * Calculate pagination range for Supabase queries
 */
export function getPaginationRange(page: number, pageSize: number): { from: number; to: number } {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
}

/**
 * Pagination controls props type for building UI components
 */
export interface PaginationControlsProps {
  pagination: PaginationState;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  isFetching?: boolean;
}
