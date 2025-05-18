import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface QueryOptions<T> {
  tableName: string;
  selectQuery: string;
  pageSize?: number;
  orderBy?: { column: string; ascending?: boolean };
  extraQuery?: (query: any) => any;
  enableAutoRefresh?: boolean;
}

interface QueryState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  page: number;
}

const DEFAULT_PAGE_SIZE = 20;
const RETRY_DELAY = 1000;
const MAX_RETRIES = 1;
const DEBOUNCE_DELAY = 300;
const MIN_FETCH_INTERVAL = 2000;
const TIMEOUT_DURATION = 5000;

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw';
const SUPABASE_URL = 'https://dqnjtkbxtscjikalkajq.supabase.co';

export function useSupabaseQuery<T>(options: QueryOptions<T>) {
  const {
    tableName,
    selectQuery,
    pageSize = DEFAULT_PAGE_SIZE,
    orderBy = { column: 'created_at', ascending: false },
    extraQuery,
    enableAutoRefresh = true
  } = options;

  const { session } = useAuth();

  const [state, setState] = useState<QueryState<T>>({
    data: [],
    loading: true,
    error: null,
    hasMore: true,
    totalCount: 0,
    page: 1
  });

  const location = useLocation();
  const isMounted = useRef(true);
  const isCurrentlyFetching = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSuccessfulFetchRef = useRef<number>(0);
  const visibilityDebounceRef = useRef<number | null>(null);
  const mountTimerId = useRef<NodeJS.Timeout | null>(null);

  const getSupabaseCredentials = () => ({ supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON_KEY });

  const fetchTotalCount = useCallback(async (signal?: AbortSignal): Promise<number> => {
    if (!isMounted.current || signal?.aborted) {
      if (signal?.aborted) console.log(`[${tableName}] Count fetch aborted before execution`);
      return 0;
    }
      console.log(`[${tableName}] Fetching total count...`);
      
    const { supabaseUrl, supabaseAnonKey } = getSupabaseCredentials();
    const accessToken = session?.access_token || '';

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=count`, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        signal
      });
      if (response.ok) {
        const countData = await response.json();
        const count = Array.isArray(countData) && countData.length > 0 && typeof countData[0].count === 'number' 
                      ? countData[0].count 
                      : (Array.isArray(countData) && countData.length > 0 && typeof countData[0].count === 'string' 
                         ? parseInt(countData[0].count, 10) 
                         : 0);
        console.log(`[${tableName}] Direct count fetch result: ${count}`);
        if (isMounted.current) setState(prev => ({ ...prev, totalCount: count }));
        return count;
      }
      console.warn(`[${tableName}] Direct count fetch failed, status: ${response.status}, text: ${await response.text()}`);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log(`[${tableName}] Direct count fetch aborted.`);
        return 0;
      }
      console.warn(`[${tableName}] Direct count fetch error, falling back:`, err);
    }

    try {
      console.log(`[${tableName}] Fallback: Fetching count with Supabase client...`);
      let query = supabase.from(tableName).select('*', { count: 'exact', head: true });
      if (extraQuery) {
        query = extraQuery(query);
      }
      if (signal) {
        query = query.abortSignal(signal);
      }
      const { count: supabaseClientCount, error: supabaseError } = await query;
      if (supabaseError) {
        if (supabaseError.name === 'AbortError') console.log(`[${tableName}] Supabase client count fetch aborted.`);
        else console.error(`[${tableName}] Supabase client error fetching count:`, supabaseError);
        return 0;
      }
      console.log(`[${tableName}] Supabase client count: ${supabaseClientCount}`);
      if (isMounted.current && supabaseClientCount !== null) {
        setState(prev => ({ ...prev, totalCount: supabaseClientCount }));
      }
      return supabaseClientCount || 0;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') console.log(`[${tableName}] Supabase client count fetch (fallback) aborted unexpectedly.`);
      else console.error(`[${tableName}] Error in Supabase client count fallback:`, err);
      return 0;
    }
  }, [tableName, session?.access_token, extraQuery]);

  const directFetchData = useCallback(async (signal: AbortSignal, currentPage: number): Promise<{ data: T[] | null, error: Error | null }> => {
    console.log(`[${tableName}] Attempting direct fetch for ${tableName} (page ${currentPage})...`);
    const from = (currentPage - 1) * pageSize;
    const { supabaseUrl, supabaseAnonKey } = getSupabaseCredentials();
    const accessToken = session?.access_token || '';
    let url = `${supabaseUrl}/rest/v1/${tableName}?select=${encodeURIComponent(selectQuery)}`;
    url += `&order=${orderBy.column}.${orderBy.ascending ? 'asc' : 'desc'}`;
    url += `&offset=${from}&limit=${pageSize}`;
    // Note: extraQuery is not applied to directFetchData due to complexity of translation.

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        signal
      });
      if (!response.ok) throw new Error(`Direct fetch for ${tableName} failed with status: ${response.status} - ${await response.text()}`);
      const fetchedData = await response.json();
      console.log(`[${tableName}] Direct fetch success, got ${fetchedData.length} items for ${tableName}`);
      return { data: fetchedData as T[], error: null };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log(`[${tableName}] Direct fetch for ${tableName} aborted.`);
        return { data: null, error: new Error('Request aborted') };
      }
      console.error(`[${tableName}] Direct fetch error for ${tableName}:`, err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }, [tableName, selectQuery, pageSize, orderBy, session?.access_token]);

  const fetchData = useCallback(async (forceFetch = false, requestedPageOverride?: number) => {
    let fetchError: Error | null = null;
    const targetPage = requestedPageOverride ?? (forceFetch ? 1 : state.page);
    
    console.log(`[${tableName}] fetchData: force=${forceFetch}, targetPage=${targetPage}, currentLoading=${isCurrentlyFetching.current}, mounted=${isMounted.current}`);
      
      if (!isMounted.current) {
      console.log(`[${tableName}] Not mounted, skipping fetch.`);
        return;
      }
      
    if (!forceFetch && isCurrentlyFetching.current) {
      console.log(`[${tableName}] Already fetching, skipping.`);
          return;
        }

        const now = Date.now();
    if (!forceFetch && lastSuccessfulFetchRef.current > 0 && (now - lastSuccessfulFetchRef.current < MIN_FETCH_INTERVAL)) {
      console.log(`[${tableName}] Too soon after last successful fetch (${now - lastSuccessfulFetchRef.current}ms ago), skipping.`);
          return;
      }

      if (abortControllerRef.current) {
      console.log(`[${tableName}] Cancelling previous request.`);
      abortControllerRef.current.abort('New fetch initiated');
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      isCurrentlyFetching.current = true;
    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null, 
      ...(forceFetch && prev.page !== 1 ? { page: 1 } : {}),
      ...(targetPage !== prev.page && !forceFetch ? { page: targetPage } : {}) // if navigating to a specific page
    }));
    
    try {
      if (forceFetch || state.totalCount === 0) {
        console.log(`[${tableName}] Fetching total count (force: ${forceFetch}, currentTotal: ${state.totalCount})`);
        await fetchTotalCount(signal);
        if (signal.aborted) throw new DOMException('Aborted during count fetch', 'AbortError');
      }

      const from = (targetPage - 1) * pageSize;
      const to = from + pageSize - 1; // for Supabase client range

      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error(`Query for ${tableName} (page ${targetPage}) timed out after ${TIMEOUT_DURATION}ms`));
        }, TIMEOUT_DURATION);
      });

      let resultHolder: { data: T[] | null; error: Error | null; count?: number | null } = { data: null, error: null };

      // Attempt 1: Direct Fetch
      console.log(`[${tableName}] Attempting direct fetch for page ${targetPage}...`);
      try {
        resultHolder = await Promise.race([ directFetchData(signal, targetPage), timeoutPromise ]);
      } catch (directFetchWrappedError: any) {
        console.warn(`[${tableName}] Direct fetch attempt failed/timedout for page ${targetPage}:`, directFetchWrappedError?.message);
        resultHolder = { data: null, error: directFetchWrappedError instanceof Error ? directFetchWrappedError : new Error(String(directFetchWrappedError.message || directFetchWrappedError)) };
      }

      if (signal.aborted) throw new DOMException('Aborted after direct fetch attempt', 'AbortError');

      // Attempt 2: Supabase Client Fallback
      if (!resultHolder.data || resultHolder.error) {
        if (resultHolder.error && resultHolder.error.name === 'AbortError') throw resultHolder.error; // Propagate abort
        console.log(`[${tableName}] Direct fetch unsuccessful (Error: ${resultHolder.error?.message}). Falling back to Supabase client for page ${targetPage}...`);
        
        let lastSupabaseError: Error | null = null;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            if (signal.aborted) throw new DOMException('Aborted during Supabase retry prep', 'AbortError');
            console.log(`[${tableName}] Supabase client attempt ${attempt}/${MAX_RETRIES} for page ${targetPage}`);
            
          let query = supabase
            .from(tableName)
              .select(selectQuery, { count: 'exact' }) 
            .order(orderBy.column, { ascending: orderBy.ascending })
              .range(from, to);

            if (extraQuery) query = extraQuery(query);
            
            const { data: sbData, error: sbError, count: sbCount } = await Promise.race([ query.abortSignal(signal), timeoutPromise ]);
          
            if (sbError) {
              lastSupabaseError = new Error(sbError.message || 'Supabase client query failed');
              if ((sbError as any).name === 'AbortError' || sbError.message.includes('aborted')) { // More robust abort check
                lastSupabaseError = new DOMException(sbError.message, 'AbortError');
              }
              throw lastSupabaseError;
            }
            
            console.log(`[${tableName}] Supabase client success, got ${sbData?.length} items.`);
            resultHolder = { data: sbData as T[], error: null, count: sbCount };
            break; 
          } catch (errorInRetry: any) {
            lastSupabaseError = errorInRetry instanceof Error ? errorInRetry : new Error(String(errorInRetry.message || errorInRetry));
            if (lastSupabaseError.name === 'AbortError') throw lastSupabaseError;
            console.error(`[${tableName}] Supabase client attempt ${attempt} failed:`, lastSupabaseError.message);
            if (attempt === MAX_RETRIES) throw lastSupabaseError; 
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
          }
        }
      }

      if (signal.aborted) throw new DOMException('Aborted after all fetch attempts', 'AbortError');

      if (!resultHolder.data || resultHolder.error) {
        throw resultHolder.error || new Error(`Failed to fetch data for ${tableName} (page ${targetPage}) after all attempts.`);
      }

      const fetchedData = resultHolder.data;
      const newTotalCount = resultHolder.count;

      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          data: targetPage === 1 ? fetchedData : [...prev.data, ...fetchedData],
          hasMore: fetchedData.length === pageSize,
          loading: false,
          error: null,
          totalCount: newTotalCount !== undefined && newTotalCount !== null ? newTotalCount : prev.totalCount
        }));
        lastSuccessfulFetchRef.current = Date.now();
      }
    } catch (err: any) {
      fetchError = err;
      if (err.name === 'AbortError' || err.message?.includes('Aborted')) {
        console.log(`[${tableName}] Fetch operation for page ${targetPage} was aborted: ${err.message}.`);
      } else {
        console.error(`[${tableName}] Critical error during fetchData for ${tableName} (page ${targetPage}):`, err.message || err);
      if (isMounted.current) {
          setState(prev => ({ ...prev, error: err.message || 'An unknown error occurred', loading: false }));
        }
      }
    } finally {
      isCurrentlyFetching.current = false;
      // Ensure loading is set to false unless it was an abort that happened before loading was set true
      if (isMounted.current ) {
         setState(prev => ({ ...prev, loading: false }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tableName, selectQuery, pageSize, orderBy, extraQuery, 
    state.page, // current page from state for default targetPage if not overridden
    state.totalCount, 
    session?.access_token, 
    // fetchTotalCount and directFetchData are stable due to their own useCallback.
    // Not listing them here to prevent fetchData itself from changing too often if they were to change.
    // Their logic depends on session?.access_token, tableName etc which are already listed or stable.
  ]);

  const loadMore = useCallback(() => {
    if (!state.loading && state.hasMore && !isCurrentlyFetching.current) {
      console.log(`[${tableName}] loadMore called, current page: ${state.page}, advancing to ${state.page + 1}`);
      // fetchData will be called by the useEffect watching state.page
      setState(prev => ({...prev, page: prev.page + 1}));
    } else {
      console.log(`[${tableName}] loadMore skipped: loading=${state.loading}, hasMore=${state.hasMore}, fetching=${isCurrentlyFetching.current}`);
    }
  }, [state.loading, state.hasMore, state.page]);
  
  const refresh = useCallback(() => {
    console.log(`[${tableName}] Refresh requested.`);
    fetchData(true, 1); 
  }, [fetchData]); // fetchData should be stable

  // Initial fetch and unmount cleanup
  useEffect(() => {
    isMounted.current = true;
    console.log(`[${tableName}] Hook mounted. Path: ${location.pathname}. Fetching initial data.`);
    isCurrentlyFetching.current = false; 
    lastSuccessfulFetchRef.current = 0;
    setState(prev => ({ ...prev, page:1, data: [], loading:true, error:null, hasMore:true, totalCount:0})); // Reset state on mount

    mountTimerId.current = setTimeout(() => {
      if (isMounted.current) {
        console.log(`[${tableName}] Executing initial fetchData after mount timer.`);
        fetchData(true, 1); 
      }
    }, 50); 
    
    return () => {
      console.log(`[${tableName}] Hook unmounting. Path: ${location.pathname}`);
      if(mountTimerId.current) clearTimeout(mountTimerId.current);
      isMounted.current = false;
      if (abortControllerRef.current) {
        console.log(`[${tableName}] Aborting any in-flight requests on unmount`);
        abortControllerRef.current.abort('Component unmounted');
        abortControllerRef.current = null;
      }
      if (visibilityDebounceRef.current !== null) {
        window.clearTimeout(visibilityDebounceRef.current);
        visibilityDebounceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName, selectQuery, pageSize, orderBy, extraQuery, session?.access_token]); // Dependencies that define a "new instance" of the query configuration

  // Effect for page changes (pagination from loadMore)
  useEffect(() => {
    if (!isMounted.current || state.page === 1) { 
        // Do not fetch for page 1 here, initial mount effect handles it.
        // Or if component unmounted.
        return;
    }
    console.log(`[${tableName}] Page changed to ${state.page}, fetching next set of data.`);
    fetchData(false, state.page); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.page, fetchData]);

  // Effect for visibility change (refetch on tab focus)
  useEffect(() => {
    if (!enableAutoRefresh || !isMounted.current) return () => {};

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted.current) {
        console.log(`[${tableName}] Page/tab became visible.`);
        if (visibilityDebounceRef.current !== null) window.clearTimeout(visibilityDebounceRef.current);
        
        visibilityDebounceRef.current = window.setTimeout(() => {
          console.log(`[${tableName}] Executing debounced force fetch after visibility change.`);
          if (isMounted.current) fetchData(true, 1); 
          visibilityDebounceRef.current = null;
        }, DEBOUNCE_DELAY);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityDebounceRef.current !== null) window.clearTimeout(visibilityDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableAutoRefresh, fetchData]); // tableName removed as fetchData has it.

  // Check for network connectivity issues
  useEffect(() => {
    if(!isMounted.current) return () => {};
    const handleOnline = () => {
      console.log(`[${tableName}] Browser is online, refreshing data`);
      if(isMounted.current) fetchData(true,1); 
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]); // tableName removed

  return { ...state, refresh, loadMore };
} 