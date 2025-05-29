import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Process } from '../types';

interface ProcessesState {
  data: Process[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  totalCount: number;
  page: number;
}

const INITIAL_STATE: ProcessesState = {
  data: [],
  loading: false,
  error: null,
  hasMore: true,
  totalCount: 0,
  page: 1
};

const PAGE_SIZE = 20;

export function useProcesses() {
  const [state, setState] = useState<ProcessesState>(INITIAL_STATE);
  const location = useLocation();
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchProcesses = useCallback(async (forceFetch = false) => {
    try {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setState(prev => ({ ...prev, loading: true, error: null }));

      // Reset to page 1 if force fetching
      if (forceFetch) {
        setState(prev => ({ ...prev, page: 1 }));
      }

      // Calculate pagination
      const from = (state.page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Fetch data
      const { data, error, count } = await supabase
        .from('processes')
        .select(`
          id,
          process_status,
          status_update_date,
          process_memo,
          candidates (
            id,
            name,
            email
          ),
          jobs (
            id,
            position_title
          ),
          clients (
            id,
            client_name
          ),
          hr_contacts (
            id,
            name
          ),
          owner_details:owner_id (
            id,
            full_name
          )
        `, { count: 'exact' })
        .order('status_update_date', { ascending: false })
        .range(from, to)
        .abortSignal(abortControllerRef.current.signal);

      if (error) throw error;

      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          data: forceFetch ? data : [...prev.data, ...data],
          hasMore: data.length === PAGE_SIZE,
          totalCount: count || 0,
          loading: false,
          error: null
        }));
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message === 'Request aborted') {
        return;
      }

      console.error('Error fetching processes:', err);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          error: err instanceof Error ? err : new Error(err.message),
          data: state.page === 1 ? [] : prev.data,
          loading: false
        }));
      }
    }
  }, [state.page]);

  // Update process status
  const updateProcessStatus = useCallback(async (processId: string, newStatus: string) => {
    try {
      const { error: updateError } = await supabase
        .from('processes')
        .update({
          process_status: newStatus,
          status_update_date: new Date().toISOString()
        })
        .eq('id', processId);

      if (updateError) throw updateError;
      await fetchProcesses(true);
    } catch (err) {
      console.error('Error updating process status:', err);
      throw err;
    }
  }, [fetchProcesses]);

  // Load more
  const loadMore = useCallback(() => {
    if (!state.loading && state.hasMore) {
      setState(prev => ({ ...prev, page: prev.page + 1 }));
    }
  }, [state.loading, state.hasMore]);

  // Watch for page changes
  useEffect(() => {
    if (state.page > 1) {
      fetchProcesses();
    }
  }, [state.page, fetchProcesses]);

  // Initial fetch
  useEffect(() => {
    isMounted.current = true;
    fetchProcesses(true);

    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchProcesses]);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    refresh: () => fetchProcesses(true),
    loadMore,
    updateProcessStatus,
    reset
  };
} 