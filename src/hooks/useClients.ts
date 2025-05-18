import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Client } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface ClientsState {
  data: Client[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  page: number;
}

const PAGE_SIZE = 20;
const TIMEOUT_DURATION = 5000; // 5 seconds timeout

// Hardcoded Supabase anon key, ideally this should come from a more secure/config location
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw';
const SUPABASE_URL = 'https://dqnjtkbxtscjikalkajq.supabase.co';

export function useClients() {
  const { session } = useAuth();
  const location = useLocation();

  const [data, setData] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCurrentlyFetching = useRef(false);
  const lastSuccessfulFetchRef = useRef<number>(0);
  const visibilityDebounceRef = useRef<number | null>(null);
  const prevPathname = useRef<string>(''); // To detect navigation to the page

  // Helper function to get Supabase URL and Anon Key
  // In a real app, these would ideally come from environment variables
  // For now, using the hardcoded ones.
  const getSupabaseCredentials = () => {
    // const supabaseUrl = supabase.supabaseUrl; // This might not be directly on the client like this
    // const supabaseAnonKey = supabase.supabaseKey; // Check Supabase client v2 for exact properties
    // if (!supabaseUrl || !supabaseAnonKey) {
    //   console.error("Supabase URL or Anon Key is not available from the client.");
    //   // Fallback or throw error
    // }
    // return { supabaseUrl, supabaseAnonKey };
    return { supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON_KEY };
  };

  const fetchTotalCount = useCallback(async (signal?: AbortSignal): Promise<number> => {
    if (!isMounted.current || signal?.aborted) {
      if (signal?.aborted) console.log('[useClients] Count fetch aborted before execution');
      return 0;
    }
    console.log('[useClients] Fetching total count...');

    const { supabaseUrl, supabaseAnonKey } = getSupabaseCredentials();

    try { // Direct fetch attempt
      const response = await fetch(`${supabaseUrl}/rest/v1/clients?select=count`, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'Content-Type': 'application/json'
        },
        signal
      });
      if (response.ok) {
        const countData = await response.json();
        const count = Array.isArray(countData) && countData.length > 0 ? parseInt(countData[0].count, 10) : 0;
        console.log(`[useClients] Direct count fetch result: ${count}`);
        if (isMounted.current) setTotalCount(count);
        return count;
      }
      console.warn('[useClients] Direct count fetch failed, status:', response.status);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('[useClients] Direct count fetch aborted.');
        return 0;
      }
      console.warn('[useClients] Direct count fetch error, falling back:', err);
    }

    // Fallback to Supabase client
    try {
      let query = supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });
      
      if (signal) {
        query = query.abortSignal(signal);
      }

      const { count: supabaseCount, error: supabaseError } = await query;
            
      if (supabaseError) {
        if (supabaseError.name === 'AbortError') {
          console.log('[useClients] Supabase count fetch aborted.');
          return 0;
        }
        console.error('[useClients] Supabase error fetching count:', supabaseError);
        return 0;
      }
      console.log(`[useClients] Supabase client count: ${supabaseCount}`);
      if (isMounted.current && supabaseCount !== null) setTotalCount(supabaseCount);
      return supabaseCount || 0;
    } catch (err) {
       if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('[useClients] Supabase count fetch (fallback) aborted unexpectedly.');
        return 0;
      }
      console.error('[useClients] Error in Supabase count fallback:', err);
      return 0;
    }
  }, [session?.access_token]);

  const directFetchClients = useCallback(async (signal: AbortSignal, currentPage: number): Promise<{ data: Client[] | null, error: Error | null }> => {
    console.log(`[useClients] Attempting direct fetch for clients (page ${currentPage})...`);
    const from = (currentPage - 1) * PAGE_SIZE;
    
    const { supabaseUrl, supabaseAnonKey } = getSupabaseCredentials();
    const selectFields = 'id,client_name,client_industry,website_url,owner_id,address,client_rank,phase,created_at,updated_at,owner:users!clients_owner_id_fkey(full_name,email)';
    const url = `${supabaseUrl}/rest/v1/clients?select=${selectFields}&order=client_name.asc&offset=${from}&limit=${PAGE_SIZE}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'Content-Type': 'application/json'
        },
        signal
      });

      if (!response.ok) {
        throw new Error(`Direct fetch failed with status: ${response.status} ${await response.text()}`);
      }
      const fetchedData = await response.json();
      console.log(`[useClients] Direct fetch success, got ${fetchedData.length} clients`);
      return { data: fetchedData as Client[], error: null };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('[useClients] Direct client fetch aborted.');
        return { data: null, error: new Error('Request aborted') };
      }
      console.error('[useClients] Direct client fetch error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }, [session?.access_token]);


  const fetchClients = useCallback(async (forceFetch = false, requestedPage = page) => {
    let fetchError: Error | null = null;
    console.log(`[useClients] fetchClients called. forceFetch: ${forceFetch}, requestedPage: ${requestedPage}, currentPageState: ${page}`);

    if (!isMounted.current) {
      console.log('[useClients] Hook not mounted, skipping fetch.');
      return;
    }

    if (!forceFetch && isCurrentlyFetching.current) {
      console.log('[useClients] Already fetching, skipping.');
      return;
    }

    if (!forceFetch && lastSuccessfulFetchRef.current > 0 && (Date.now() - lastSuccessfulFetchRef.current < 2000)) {
      console.log('[useClients] Skipping fetch, too soon after last successful fetch.');
      return;
    }

    if (abortControllerRef.current) {
      console.log('[useClients] Cancelling previous request.');
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    isCurrentlyFetching.current = true;
    setLoading(true);
    setError(null);

    const targetPage = forceFetch ? 1 : requestedPage;
    if (forceFetch && page !== 1) { // if forcing, always reset to page 1 in state
        setPage(1);
    }


    try {
      if (forceFetch || totalCount === 0) {
        await fetchTotalCount(signal);
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      }

      const from = (targetPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const timeout = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error(`Query timed out after ${TIMEOUT_DURATION}ms`));
        }, TIMEOUT_DURATION);
      });

      let result: { data: Client[] | null; error: Error | null; } | null = null;

      // Attempt 1: Direct Fetch
      try {
        console.log('[useClients] Attempting direct fetch...');
        result = await Promise.race([
          directFetchClients(signal, targetPage),
          timeout
        ]);
      } catch (directFetchWrappedError) { // This catch is for timeout from Promise.race or if directFetchClients itself throws an unhandled error (it shouldn't)
        console.warn('[useClients] Direct fetch attempt failed (possibly timeout or unhandled directFetchClients error):', directFetchWrappedError);
        // if (directFetchWrappedError instanceof DOMException && directFetchWrappedError.name === 'AbortError') throw directFetchWrappedError;
        // Fall through to Supabase client if direct fetch fails or times out
      }
      
      // If direct fetch failed (result.error is not null) or timed out (result is null from timeout, or result.error from directFetch error)
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      if (!result || result.error) {
         if (result && result.error && result.error.name === 'AbortError') throw result.error; // Propagate abort
        console.log('[useClients] Direct fetch unsuccessful or timed out, falling back to Supabase client. Reason:', result?.error?.message || 'Timeout/NoResult');
        
        const maxRetries = 1; // Simpler retry for now, CandidatesPage had 3
        let lastSupabaseError: Error | null = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            if (signal.aborted) throw new DOMException('Aborted during retry prep', 'AbortError');
            console.log(`[useClients] Supabase client attempt ${attempt}/${maxRetries} for page ${targetPage}`);
            const selectFields = 'id,client_name,client_industry,website_url,owner_id,address,client_rank,phase,created_at,updated_at,owner:users!clients_owner_id_fkey(full_name,email)';
            
            const supabaseQuery = supabase
        .from('clients')
              .select(selectFields, { count: 'exact' }) // Request count again with Supabase client if direct count also failed or if we want to ensure consistency
        .order('client_name', { ascending: true })
        .range(from, to)
              .abortSignal(signal);

            const { data: supabaseData, error: supabaseError, count: supabaseClientCount } = await Promise.race([supabaseQuery, timeout]);

            if (supabaseError) {
                lastSupabaseError = supabaseError;
                if (supabaseError.name === 'AbortError') throw supabaseError; // Propagate abort
                console.warn(`[useClients] Supabase client error on attempt ${attempt}:`, supabaseError);
                if (attempt === maxRetries) throw lastSupabaseError; // Throw last error if all retries fail
                await new Promise(resolve => setTimeout(resolve, 500 * attempt)); // Wait before retry
                continue; 
            }
            
            console.log(`[useClients] Supabase client success, got ${supabaseData?.length} clients`);
            result = { data: supabaseData as Client[], error: null };
            if (isMounted.current && supabaseClientCount !== null && (forceFetch || totalCount === 0)) {
                // Update totalCount if it was fetched by supabase client successfully
                setTotalCount(supabaseClientCount);
            }
            break; // Success
          } catch (errorInRetryLoop) {
            lastSupabaseError = errorInRetryLoop instanceof Error ? errorInRetryLoop : new Error(String(errorInRetryLoop));
            if (lastSupabaseError.name === 'AbortError') throw lastSupabaseError; // Propagate abort
            console.error(`[useClients] Error during Supabase client attempt ${attempt}:`, lastSupabaseError);
            if (attempt === maxRetries) throw lastSupabaseError; // Throw last error if all retries fail
             await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          }
        }
      }
      
      if (signal.aborted) throw new DOMException('Aborted after fetch attempts', 'AbortError');

      if (!result || result.error || !result.data) {
        throw result?.error || new Error('No data received and no specific error from fetch attempts.');
      }
      
      const fetchedData = result.data;

      if (isMounted.current) {
        setData(currentData => {
          if (targetPage === 1) return fetchedData; // Handles forceFetch or first page load
          // Append for load more, ensuring no duplicates if data could overlap (though range should prevent this)
          return [...currentData, ...fetchedData];
        });
        setHasMore(fetchedData.length === PAGE_SIZE);
        lastSuccessfulFetchRef.current = Date.now();
      }

    } catch (err: any) {
      fetchError = err;
      if (err.name === 'AbortError' || err.message === 'Request aborted' || err.message?.includes('Aborted')) {
        console.log('[useClients] Fetch operation was aborted, skipping error state update.');
        // No error state update for aborts
      } else {
        console.error("[useClients] Error during fetchClients:", err);
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : String(err));
          // if (targetPage === 1) setData([]); // Reset data on error only if it's the first page
        }
      }
    } finally {
      if (isMounted.current) {
         // Only set loading to false if it's not an abort error that we are intentionally ignoring for UI state
        if (!fetchError || (fetchError.name !== 'AbortError' && !fetchError.message?.includes('Aborted'))) {
            setLoading(false);
        }
      }
      isCurrentlyFetching.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    session?.access_token, 
    fetchTotalCount, 
    directFetchClients, 
    page, // Include page here as requestedPage defaults to it
    totalCount // fetchTotalCount is conditional on this
    // supabase client is stable, getSupabaseCredentials is stable if SUPABASE_URL/KEY are global consts
  ]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore && !isCurrentlyFetching.current) {
      console.log('[useClients] loadMore called, current page:', page);
      setPage(prevPage => prevPage + 1);
    }
  }, [loading, hasMore, page]);
  
  const refresh = useCallback(() => {
    console.log('[useClients] Refresh requested.');
    // fetchClients will reset page to 1 internally if forceFetch is true
    fetchClients(true, 1);
  }, [fetchClients]);

  // Initial fetch and unmount cleanup
  useEffect(() => {
    isMounted.current = true;
    console.log(`[useClients] Hook mounted. Path: ${location.pathname}. Fetching initial data.`);
    isCurrentlyFetching.current = false; 
    lastSuccessfulFetchRef.current = 0;

    // Call fetchClients directly without it being a dependency of this useEffect
    // This ensures it runs once on mount. fetchClients itself uses useCallback for optimization.
    fetchClients(true, 1); // Force fetch on initial mount, page 1

    return () => {
      console.log(`[useClients] Hook unmounting. Path: ${location.pathname}`);
      isMounted.current = false;
      if (abortControllerRef.current) {
        console.log(`[useClients] Aborting any in-flight requests on unmount`);
        abortControllerRef.current.abort('Component unmounted');
        abortControllerRef.current = null;
      }
      if (visibilityDebounceRef.current !== null) {
        window.clearTimeout(visibilityDebounceRef.current);
        visibilityDebounceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Removed fetchClients, add other stable dependencies if needed for mount logic

  // Ref for the mount timer to clear it in unmount effect
  const timerId = useRef<NodeJS.Timeout | null>(null);

  // Effect for page changes (pagination from loadMore)
  useEffect(() => {
    if (!isMounted.current) return;
    // Only fetch if page changed to something > 1 (initial is handled by mount effect)
    if (page > 1) { 
      console.log(`[useClients] Page changed to ${page}, fetching next set of data.`);
      fetchClients(false, page); // Not a force fetch, use current `page` explicitly
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, fetchClients]); // Keep fetchClients here, as page change should trigger new fetch with potentially new fetchClients if its deep dependencies changed

  // Effect for visibility change (refetch on tab focus)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Check if the page using this hook is currently visible.
      // This requires the page component to pass its specific path or a more generic way.
      // For now, let's assume we always refresh if the document becomes visible
      // and the hook is active (mounted). A more specific check like in CandidatesPage
      // (location.pathname === '/specific-path') would be better if the hook instance
      // is tied to a specific page's lifecycle.
      if (document.visibilityState === 'visible' && isMounted.current) {
        console.log('[useClients] Page/tab became visible.');
        if (visibilityDebounceRef.current !== null) {
          window.clearTimeout(visibilityDebounceRef.current);
        }
        visibilityDebounceRef.current = window.setTimeout(() => {
          console.log('[useClients] Executing debounced force fetch after visibility change.');
          fetchClients(true, 1); // Force refresh from page 1
          visibilityDebounceRef.current = null;
        }, 300); // 300ms debounce
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityDebounceRef.current !== null) {
        window.clearTimeout(visibilityDebounceRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchClients]); // fetchClients dependency needed as it's called

  // Effect for navigation to the page (e.g. tab click)
  // This is a bit more complex for a generic hook.
  // The original CandidatesPage uses `prevPathname.current && prevPathname.current !== location.pathname`
  // and `location.pathname === '/tables/candidates'`.
  // A generic hook might not know its "target" path.
  // For now, this specific logic might be best left in the page component or passed as a config.
  // Simplified version: if pathname changes TO a path where this hook is actively used.
  // This effect might be too aggressive if not scoped.
  // Consider if this is needed or how to make it configurable.
  // useEffect(() => {
  //   if (isMounted.current && location.pathname !== prevPathname.current) {
  //     console.log(`[useClients] Navigated. Old: ${prevPathname.current}, New: ${location.pathname}. Forcing refresh.`);
  //     // Potentially add a condition here if this hook is only for a specific page.
  //     fetchClients(true, 1);
  //     prevPathname.current = location.pathname;
  //   }
  // }, [location.pathname, fetchClients]);


  return {
    data,
    loading,
    error,
    hasMore,
    totalCount,
    page, // Expose current page
    refresh,
    loadMore,
  };
} 