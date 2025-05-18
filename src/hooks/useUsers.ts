import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { User } from '../types';

interface UsersState {
  data: User[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  page: number;
}

const INITIAL_STATE: UsersState = {
  data: [],
  loading: true,
  error: null,
  hasMore: true,
  totalCount: 0,
  page: 1
};

const PAGE_SIZE = 20;

export function useUsers() {
  const [state, setState] = useState<UsersState>(INITIAL_STATE);
  const location = useLocation();
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchUsers = useCallback(async (forceFetch = false) => {
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
        .from('users')
        .select(`
          id,
          email,
          full_name,
          role,
          avatar_url,
          phone,
          department,
          position,
          created_at,
          updated_at
        `, { count: 'exact' })
        .order('full_name', { ascending: true })
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

      console.error('Error fetching users:', err);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          error: err instanceof Error ? err.message : String(err),
          data: state.page === 1 ? [] : prev.data,
          loading: false
        }));
      }
    }
  }, [state.page]);

  // Load more
  const loadMore = useCallback(() => {
    if (!state.loading && state.hasMore) {
      setState(prev => ({ ...prev, page: prev.page + 1 }));
    }
  }, [state.loading, state.hasMore]);

  // Watch for page changes
  useEffect(() => {
    if (state.page > 1) {
      fetchUsers();
    }
  }, [state.page, fetchUsers]);

  // Initial fetch
  useEffect(() => {
    isMounted.current = true;
    fetchUsers(true);

    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchUsers]);

  return {
    ...state,
    refresh: () => fetchUsers(true),
    loadMore
  };
} 