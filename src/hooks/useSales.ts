import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';

const PAGE_SIZE = 20;
const TIMEOUT_DURATION = 5000;
const SUPABASE_URL = 'https://dqnjtkbxtscjikalkajq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw';

interface Sale {
  id: string;
  process_id: string | null;
  fee_amount: number | null;
  payment_status: string | null;
  invoice_date: string | null;
  client: { id: string; client_name: string | null } | null;
  job: { id: string; position_title: string | null } | null;
  candidate: { id: string; name: string | null } | null;
  handler: { id: string; full_name: string | null } | null;
}

export const useSales = () => {
  const { session } = useAuth();
  const location = useLocation();
  const [data, setData] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  // Refs for managing fetch lifecycle
  const isMounted = useRef(true);
  const isCurrentlyFetching = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Function to get total count of sales
  const fetchTotalCount = async (signal?: AbortSignal) => {
    try {
      if (!isMounted.current || signal?.aborted) return 0;
      
      const { count, error } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.error('[useSales] Error fetching count:', error);
        return 0;
      }
      
      if (isMounted.current) {
        setTotalCount(count || 0);
      }
      return count || 0;
    } catch (err) {
      console.error('[useSales] Error getting count:', err);
      return 0;
    }
  };

  // Main fetch function
  const fetchSales = useCallback(async (forceFetch = false) => {
    try {
      if (!isMounted.current) return;
      
      if (!forceFetch && isCurrentlyFetching.current) {
        return;
      }

      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      isCurrentlyFetching.current = true;
      setLoading(true);
      setError(null);

      // Get total count first
      const count = await fetchTotalCount(abortControllerRef.current.signal);
      
      // Fetch data using Supabase client
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          id,
          process_id,
          fee_amount,
          payment_status,
          invoice_date,
          client:client_id(id, client_name),
          job:job_id(id, position_title),
          candidate:candidate_id(id, name),
          handler:handled_by_id(id, full_name)
        `)
        .order('invoice_date', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (salesError) {
        throw new Error(salesError.message);
      }

      if (isMounted.current) {
        setData(salesData || []);
        setHasMore((page * PAGE_SIZE) < count);
        setLoading(false);
      }
    } catch (err) {
      console.error('[useSales] Error in fetchSales:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setLoading(false);
      }
    } finally {
      isCurrentlyFetching.current = false;
      abortControllerRef.current = null;
    }
  }, [page]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    if (location.pathname === '/tables/sales') {
      fetchSales();
    }
  }, [fetchSales, location.pathname]);

  return {
    data,
    loading,
    error,
    hasMore,
    totalCount,
    page,
    setPage,
    refresh: () => fetchSales(true)
  };
}; 