import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

interface FetchOptions<T> {
  tableName: string;
  selectQuery: string;
  pageSize?: number;
  orderBy?: { column: string; ascending?: boolean };
  extraQuery?: (query: any) => any;
}

interface FetchState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  page: number;
}

export function useFetchWithRetry<T>(options: FetchOptions<T>) {
  const {
    tableName,
    selectQuery,
    pageSize = 20,
    orderBy = { column: 'created_at', ascending: false },
    extraQuery
  } = options;

  const [state, setState] = useState<FetchState<T>>({
    data: [],
    loading: true,
    error: null,
    hasMore: true,
    totalCount: 0,
    page: 1
  });

  const location = useLocation();
  const isMounted = useRef(true);
  const hasFetched = useRef(false);
  const isCurrentlyFetching = useRef(false);
  const prevPathname = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const visibilityDebounceRef = useRef<number | null>(null);
  const lastSuccessfulFetchRef = useRef<number>(0);

  const fetchTotalCount = async (signal?: AbortSignal) => {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .abortSignal(signal);

      if (error) throw error;
      if (isMounted.current) {
        setState(prev => ({ ...prev, totalCount: count || 0 }));
      }
      return count || 0;
    } catch (err) {
      console.error(`[${tableName}] Error getting count:`, err);
      return 0;
    }
  };

  const fetchData = async (forceFetch = false) => {
    let fetchError: Error | null = null;
    
    try {
      if (!isMounted.current) return;

      // Always fetch if forcing, otherwise check conditions
      if (!forceFetch) {
        if (isCurrentlyFetching.current) return;

        const now = Date.now();
        if (lastSuccessfulFetchRef.current > 0 && (now - lastSuccessfulFetchRef.current < 2000)) {
          return;
        }
      }

      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Mark that we're currently fetching
      isCurrentlyFetching.current = true;
      setState(prev => ({ ...prev, loading: true, error: null }));

      // If forcing fetch, reset to page 1
      if (forceFetch) {
        setState(prev => ({ ...prev, page: 1 }));
      }

      // Get total count first
      if (forceFetch || state.totalCount === 0) {
        await fetchTotalCount(signal);
      }

      // Calculate range for pagination
      const from = (state.page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Setup timeout
      const timeoutDuration = 15000;
      const timeout = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error(`Query timed out after ${timeoutDuration}ms`));
        }, timeoutDuration);
      });

      // Attempt to fetch data with retries
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[${tableName}] Fetch attempt ${attempt}/${maxRetries}`);
          
          let query = supabase
            .from(tableName)
            .select(selectQuery)
            .order(orderBy.column, { ascending: orderBy.ascending })
            .range(from, to)
            .abortSignal(signal);

          // Apply any extra query modifications
          if (extraQuery) {
            query = extraQuery(query);
          }

          const result = await Promise.race([query, timeout]);
          const { data, error: supabaseError } = result;

          if (supabaseError) throw supabaseError;
          if (!data) throw new Error('No data received from server');

          if (isMounted.current) {
            setState(prev => ({
              ...prev,
              data: forceFetch ? data : [...prev.data, ...data],
              hasMore: data.length === pageSize,
              loading: false,
              error: null
            }));
            
            hasFetched.current = true;
            lastSuccessfulFetchRef.current = Date.now();
          }
          return; // Success, exit retry loop
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (signal.aborted || attempt === maxRetries) {
            throw lastError;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    } catch (err: any) {
      fetchError = err;
      if (err.name === 'AbortError' || err.message === 'Query aborted') {
        return;
      }

      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          error: err instanceof Error ? err.message : String(err),
          data: state.page === 1 ? [] : prev.data
        }));
      }
    } finally {
      if (isMounted.current && (!fetchError || (fetchError.name !== 'AbortError' && fetchError.message !== 'Query aborted'))) {
        setState(prev => ({ ...prev, loading: false }));
      }
      isCurrentlyFetching.current = false;
    }
  };

  const loadMore = useCallback(() => {
    if (!state.loading && state.hasMore) {
      setState(prev => ({ ...prev, page: prev.page + 1 }));
    }
  }, [state.loading, state.hasMore]);

  // Watch for page changes to load more data
  useEffect(() => {
    if (state.page > 1) {
      fetchData();
    }
  }, [state.page]);

  // Add visibility change listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && location.pathname.includes(tableName.toLowerCase())) {
        if (visibilityDebounceRef.current !== null) {
          window.clearTimeout(visibilityDebounceRef.current);
        }
        
        visibilityDebounceRef.current = window.setTimeout(() => {
          if (isMounted.current) {
            fetchData(true);
          }
          visibilityDebounceRef.current = null;
        }, 300);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityDebounceRef.current !== null) {
        window.clearTimeout(visibilityDebounceRef.current);
      }
    };
  }, [location.pathname, tableName]);

  // Force fetch when location changes
  useEffect(() => {
    if (isMounted.current && location.pathname.includes(tableName.toLowerCase())) {
      if (prevPathname.current && prevPathname.current !== location.pathname) {
        setTimeout(() => {
          if (isMounted.current) {
            fetchData(true);
          }
        }, 300);
      }
      prevPathname.current = location.pathname;
    }
  }, [location, tableName]);

  // Initial fetch
  useEffect(() => {
    isMounted.current = true;
    hasFetched.current = false;
    isCurrentlyFetching.current = false;
    lastSuccessfulFetchRef.current = 0;
    
    const timer = setTimeout(() => {
      if (isMounted.current) {
        fetchData(true);
      }
    }, 300);
    
    return () => {
      clearTimeout(timer);
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const refresh = useCallback(() => {
    fetchData(true);
  }, []);

  return {
    ...state,
    refresh,
    loadMore
  };
} 