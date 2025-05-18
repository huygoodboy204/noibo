import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

interface UseTableDataOptions {
  tableName: string;
  selectQuery?: string;
  pageSize?: number;
  defaultOrderColumn?: string;
  defaultOrderDirection?: 'asc' | 'desc';
}

interface TableData<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  totalCount: number;
  refresh: () => void;
  loadMore: () => void;
}

export function useTableData<T extends Record<string, any>>(options: UseTableDataOptions): TableData<T> {
  const {
    tableName,
    selectQuery = '*',
    pageSize = 20,
    defaultOrderColumn = 'created_at',
    defaultOrderDirection = 'desc'
  } = options;

  const location = useLocation();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Refs for tracking component state
  const isMounted = useRef(true);
  const hasFetched = useRef(false);
  const isCurrentlyFetching = useRef(false);
  const prevPathname = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const visibilityDebounceRef = useRef<number | null>(null);
  const isNavigatingRef = useRef(false);
  const lastSuccessfulFetchRef = useRef<number>(0);
  const visibilityChangeCountRef = useRef<number>(0);

  // Function to get total count
  const fetchTotalCount = async (signal?: AbortSignal) => {
    try {
      if (!isMounted.current || signal?.aborted) return 0;

      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      if (isMounted.current) {
        setTotalCount(count || 0);
      }
      return count || 0;
    } catch (err) {
      console.error(`Error getting count for ${tableName}:`, err);
      return 0;
    }
  };

  // Main fetch function
  const fetchData = useCallback(async (forceFetch = false) => {
    if (!isMounted.current) return;
    if (isCurrentlyFetching.current && !forceFetch) return;
    if (hasFetched.current && !forceFetch) return;

    const now = Date.now();
    if (lastSuccessfulFetchRef.current > 0 && (now - lastSuccessfulFetchRef.current < 2000) && !forceFetch) {
      return;
    }

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      isCurrentlyFetching.current = true;
      setLoading(true);
      setError(null);

      if (forceFetch || totalCount === 0) {
        await fetchTotalCount(signal);
      }

      if (forceFetch && page !== 1) {
        setPage(1);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      console.log(`[${tableName}] Fetching data with params:`, {
        selectQuery,
        from,
        to,
        forceFetch,
        page
      });

      const { data: fetchedData, error: fetchError } = await supabase
        .from(tableName)
        .select(selectQuery)
        .order(defaultOrderColumn, { ascending: defaultOrderDirection === 'asc' })
        .range(from, to);

      console.log(`[${tableName}] Fetch result:`, { fetchedData, fetchError });

      if (fetchError) throw fetchError;

      if (isMounted.current) {
        const typedData = fetchedData as unknown as T[];
        if (forceFetch) {
          setData(typedData);
        } else {
          setData(prev => page === 1 ? typedData : [...prev, ...typedData]);
        }

        setHasMore((fetchedData || []).length === pageSize);
        hasFetched.current = true;
        lastSuccessfulFetchRef.current = Date.now();
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;

      console.error(`Error fetching ${tableName}:`, err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : String(err));
        if (page === 1) setData([]);
      }
    } finally {
      isCurrentlyFetching.current = false;
      if (isMounted.current) setLoading(false);
    }
  }, [tableName, selectQuery, page, pageSize, totalCount, defaultOrderColumn, defaultOrderDirection]);

  // Load more data
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prevPage => prevPage + 1);
    }
  }, [loading, hasMore]);

  // Watch for page changes
  useEffect(() => {
    if (page > 1) {
      fetchData();
    }
  }, [page, fetchData]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && location.pathname === `/${tableName}`) {
        visibilityChangeCountRef.current += 1;

        if (visibilityDebounceRef.current !== null) {
          window.clearTimeout(visibilityDebounceRef.current);
        }

        visibilityDebounceRef.current = window.setTimeout(() => {
          fetchData(true);
          visibilityDebounceRef.current = null;
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityDebounceRef.current !== null) {
        window.clearTimeout(visibilityDebounceRef.current);
      }
    };
  }, [location.pathname, fetchData, tableName]);

  // Handle location changes
  useEffect(() => {
    if (isMounted.current && location.pathname === `/${tableName}`) {
      if (prevPathname.current && prevPathname.current !== location.pathname) {
        isNavigatingRef.current = true;
        
        setTimeout(() => {
          if (isMounted.current) {
            fetchData(true);
            isNavigatingRef.current = false;
          }
        }, 200);
      }
      prevPathname.current = location.pathname;
    }
  }, [location, fetchData, tableName]);

  // Initial setup and cleanup
  useEffect(() => {
    isMounted.current = true;
    hasFetched.current = false;
    isCurrentlyFetching.current = false;
    isNavigatingRef.current = false;
    visibilityChangeCountRef.current = 0;
    lastSuccessfulFetchRef.current = 0;

    const timer = setTimeout(() => {
      fetchData(true);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (visibilityDebounceRef.current !== null) {
        window.clearTimeout(visibilityDebounceRef.current);
      }
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    page,
    hasMore,
    totalCount,
    refresh: () => fetchData(true),
    loadMore
  };
} 