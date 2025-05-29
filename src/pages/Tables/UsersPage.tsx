import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import EditUserModal from './EditUserModal';
import './UsersPage.css';
// import { User } from '../../types'; // Will use local UserDisplay
// import { useSupabaseQuery } from '../../hooks/useSupabaseQuery'; // Removed

// Constants for fetching
const PAGE_SIZE = 20;
const TIMEOUT_DURATION = 5000;
const SUPABASE_URL = 'https://dqnjtkbxtscjikalkajq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw';

// Corrected select query for users based on provided schema
const USERS_SELECT_QUERY = "id,email,full_name,role,is_active,created_at,updated_at";
const USERS_ORDER_BY_COLUMN = 'full_name'; // Original orderBy
const USERS_ORDER_BY_ASCENDING = true;   // Original orderBy

// Local UserDisplay type
interface UserDisplay {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null; // Corresponds to user_role_enum
  is_active: boolean | null;
  created_at: string;
  updated_at: string | null;
  // avatar_url, phone, department, position were removed as they are not in the schema
}

const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();

  // State for data, loading, error, pagination
  const [users, setUsers] = useState<UserDisplay[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Refs for managing fetch lifecycle
  const isMounted = useRef(true);
  const isCurrentlyFetching = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSuccessfulFetchRef = useRef<number>(0);
  const visibilityDebounceRef = useRef<number | null>(null);
  const prevPathname = useRef<string>('');
  const mountTimerId = useRef<NodeJS.Timeout | null>(null);

  // UI specific state
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<UserDisplay | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Cleanup function
  const cleanup = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (mountTimerId.current) {
      clearTimeout(mountTimerId.current);
      mountTimerId.current = null;
    }
    if (visibilityDebounceRef.current) {
      clearTimeout(visibilityDebounceRef.current);
      visibilityDebounceRef.current = null;
    }
    isMounted.current = false;
  };

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && location.pathname === '/tables/users') {
        console.log('[UsersPage] Page/tab became visible');
        
        if (visibilityDebounceRef.current) {
          clearTimeout(visibilityDebounceRef.current);
        }
        
        visibilityDebounceRef.current = window.setTimeout(() => {
          if (isMounted.current) {
            fetchUsers(true);
          }
          visibilityDebounceRef.current = null;
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityDebounceRef.current) {
        clearTimeout(visibilityDebounceRef.current);
      }
    };
  }, [location.pathname]);

  // Handle navigation
  useEffect(() => {
    if (isMounted.current && location.pathname === '/tables/users') {
      if (prevPathname.current && prevPathname.current !== location.pathname) {
        console.log(`[UsersPage] Navigated to users page. Previous path: ${prevPathname.current}`);
        fetchUsers(true);
      }
      prevPathname.current = location.pathname;
    }
  }, [location.pathname]);

  // Initial mount
  useEffect(() => {
    console.log('[UsersPage] Component mounted');
    isMounted.current = true;
    prevPathname.current = location.pathname;
    
    setUsers([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    setTotalCount(0);
    isCurrentlyFetching.current = false;
    lastSuccessfulFetchRef.current = 0;

    if (mountTimerId.current) clearTimeout(mountTimerId.current);
    mountTimerId.current = setTimeout(() => {
      if (isMounted.current) {
        fetchUsers(true);
      }
    }, 100);

    return cleanup;
  }, [location.pathname]);

  // Handle page change
  useEffect(() => {
    if (page > 1 && isMounted.current) {
      fetchUsers(false, page);
    }
  }, [page]);

  // Handle online/offline
  useEffect(() => {
    const handleOnline = () => {
      console.log('[UsersPage] Browser is online, refreshing data');
      if (isMounted.current) {
        fetchUsers(true);
      }
    };
    
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const fetchTotalUsersCount = useCallback(async (signal?: AbortSignal) => {
    console.log('[UsersPage] Fetching total users count...');
    if (!isMounted.current || signal?.aborted) return 0;
    let countVal = 0;
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=count`, { method: 'GET', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json', 'Prefer': 'count=exact' }, signal });
      if (response.ok) {
        const countData = await response.json();
        countVal = Array.isArray(countData) && countData.length > 0 && typeof countData[0].count === 'number' ? countData[0].count : (Array.isArray(countData) && countData.length > 0 && typeof countData[0].count === 'string' ? parseInt(countData[0].count, 10) : 0);
        if (isMounted.current) setTotalCount(countVal);
        return countVal;
      }
    } catch (err:any) { if (err.name === 'AbortError') { /* silenced */ } else console.warn('[UsersPage] Direct count fetch error:', err.message); }
    try {
      let query = supabase.from('users').select('*', { count: 'exact', head: true });
      if (signal) query = query.abortSignal(signal);
      const { count: supabaseCount, error: supabaseError } = await query;
      if (supabaseError) return countVal;
      countVal = supabaseCount || 0;
      if (isMounted.current && supabaseCount !== null) setTotalCount(countVal);
      return countVal;
    } catch (err:any) { return countVal; }
  }, [session?.access_token]);

  const directFetchUsers = useCallback(async (signal: AbortSignal, currentPage: number): Promise<{ data: UserDisplay[] | null, error: Error | null }> => {
    const from = (currentPage - 1) * PAGE_SIZE;
    let url = `${SUPABASE_URL}/rest/v1/users?select=${encodeURIComponent(USERS_SELECT_QUERY)}`;
    url += `&order=${USERS_ORDER_BY_COLUMN}.${USERS_ORDER_BY_ASCENDING ? 'asc' : 'desc'}`;
    url += `&offset=${from}&limit=${PAGE_SIZE}`;
    try {
      const response = await fetch(url, { method: 'GET', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' }, signal });
      if (!response.ok) { const errorBody = await response.text(); throw new Error(`Direct fetch for users failed: ${response.status} - ${errorBody}`);}
      const fetchedData = await response.json();
      return { data: fetchedData as UserDisplay[], error: null };
    } catch (err: any) { 
      if (err.name === 'AbortError') return { data: null, error: new Error('Request aborted') };
      return { data: null, error: err instanceof Error ? err : new Error(String(err.message || 'Direct fetch users failed')) };
    }
  }, [session?.access_token]);

  const fetchUsers = useCallback(async (forceFetch = false, pageToFetchArg?: number) => {
    const pageForFetch = pageToFetchArg ?? page;
    console.log(`[UsersPage] fetchUsers triggered. force: ${forceFetch}, targetPage: ${pageForFetch}, current state page: ${page}, totalCount: ${totalCount}`);

    if (!isMounted.current) { console.log('[UsersPage] Fetch skipped: not mounted'); return; }
    if (!forceFetch && isCurrentlyFetching.current) { console.log('[UsersPage] Fetch skipped: already fetching'); return; }
    if (!forceFetch && lastSuccessfulFetchRef.current > 0 && (Date.now() - lastSuccessfulFetchRef.current < 2000)) { console.log('[UsersPage] Fetch skipped: too soon'); return; }

    if (abortControllerRef.current) abortControllerRef.current.abort('New fetch initiated');
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    isCurrentlyFetching.current = true;
    setLoading(true);
    setError(null);
    
    try {
      if (forceFetch || totalCount === 0) {
        await fetchTotalUsersCount(signal);
        if (signal.aborted) throw new DOMException('Count fetch aborted', 'AbortError');
      }

      const from = (pageForFetch - 1) * PAGE_SIZE;
      const timeoutPromise = new Promise<never>((_, reject) => { const id = setTimeout(() => { clearTimeout(id); reject(new Error(`User query timeout page ${pageForFetch}`)); }, TIMEOUT_DURATION); });
      let resultHolder: { data: UserDisplay[] | null; error: Error | null; count?: number | null } = { data: null, error: null };

      try {
        console.log(`[UsersPage] Fetching users direct: page ${pageForFetch}`);
        resultHolder = await Promise.race([directFetchUsers(signal, pageForFetch), timeoutPromise]);
      } catch (directErr: any) { resultHolder = { data: null, error: new Error(String(directErr.message || directErr)) }; }
      
      if (signal.aborted) throw new DOMException('Direct fetch aborted', 'AbortError');

      if (!resultHolder.data || resultHolder.error) {
        if (resultHolder.error?.name === 'AbortError') throw resultHolder.error;
        console.log(`[UsersPage] Direct fetch failed for users (page ${pageForFetch}), falling back. Error: ${resultHolder.error?.message}`);
        let lastSbError: Error | null = null;
        try {
          if (signal.aborted) throw new DOMException('Fallback aborted pre-query', 'AbortError');
          console.log(`[UsersPage] Fetching users Supabase: page ${pageForFetch}`);
          const query = supabase.from('users').select(USERS_SELECT_QUERY, { count: 'exact' }).order(USERS_ORDER_BY_COLUMN, { ascending: USERS_ORDER_BY_ASCENDING }).range(from, from + PAGE_SIZE - 1).abortSignal(signal);
          const { data: sbData, error: sbError, count: sbCount } = await Promise.race([query, timeoutPromise]);
          if (sbError) { lastSbError = new Error(sbError.message || 'Supabase query failed'); if ((sbError as any).name === 'AbortError') lastSbError = new DOMException(sbError.message, 'AbortError'); throw lastSbError; }
          resultHolder = { data: sbData as UserDisplay[], error: null, count: sbCount };
        } catch (retryErr: any) { lastSbError = retryErr; if (lastSbError?.name === 'AbortError') throw lastSbError; throw lastSbError || new Error('Supabase fallback failed'); }
      }

      if (signal.aborted) throw new DOMException('Fetch aborted post-attempts', 'AbortError');
      if (!resultHolder.data || resultHolder.error) throw resultHolder.error || new Error(`Failed to fetch users data page ${pageForFetch}`);
      
      const fetchedData = resultHolder.data as UserDisplay[];
      console.log('[UsersPage] Fetched Users Data (page', pageForFetch, '):', fetchedData);
      const newTotalCount = resultHolder.count;

      if (isMounted.current) {
        setUsers(prevUsers => (pageForFetch === 1 ? fetchedData : [...prevUsers, ...fetchedData]));
        setHasMore(fetchedData.length === PAGE_SIZE);
        if (newTotalCount !== undefined && newTotalCount !== null) setTotalCount(newTotalCount);
        lastSuccessfulFetchRef.current = Date.now();
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('Aborted')) console.log(`[UsersPage] User fetch aborted: ${err.message}`);
      else if (isMounted.current) setError(err.message || 'Unknown error');
    } finally {
      isCurrentlyFetching.current = false;
      if (isMounted.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, totalCount, session?.access_token]);

  const loadMoreUsers = useCallback(() => {
    if (!loading && hasMore && !isCurrentlyFetching.current) {
      setPage(prevPage => prevPage + 1);
    }
  }, [loading, hasMore, page]);
  
  const refreshUsers = useCallback(() => {
    console.log('[UsersPage] Refresh triggered');
    setPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddUser = () => navigate('/tables/users/new');
  const handleUpdateUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setEditingUser({
        ...user,
        full_name: user.full_name || '',
        email: user.email || '',
        role: user.role || '',
        is_active: !!user.is_active,
      });
    }
  };

  const handleCloseEditModal = () => setEditingUser(null);
  const handleSaveEditUser = (updated: any) => {
    if (updated && updated.id) {
      setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
    }
    setEditingUser(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa user này?')) {
      return;
    }

    try {
      setDeletingUserId(userId);
      
      // Xóa user trong bảng users (RLS policy sẽ tự động xóa trong auth.users)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      // Refresh user list after successful deletion
      setUsers(users.filter(user => user.id !== userId));
      setTotalCount(prev => prev - 1);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Có lỗi xảy ra khi xóa user. Vui lòng thử lại.');
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleInviteUser = async (email: string, full_name: string, role: string) => {
    try {
      const response = await fetch('https://dqnjtkbxtscjikalkajq.supabase.co/functions/v1/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, full_name, role }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Lỗi không xác định');
      }
      alert('Mời người dùng thành công!');
    } catch (error: any) {
      alert(`Lỗi: ${error.message}`);
    }
  };

  const filteredUsers = users.filter(user => {
    const u = user as UserDisplay;
    return searchTerm === '' ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchTerm.toLowerCase());
    // Removed department and position from filter as they are not in UserDisplay
  });

  if (loading && !users.length && page === 1) return <p>Loading users...</p>;
  if (error) return (
    <div className="container mx-auto p-4 text-center">
      <p className="text-red-500">Error: {error}</p>
      <button onClick={refreshUsers} className="mt-4 bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-150">
        Thử lại
      </button>
    </div>
  );

  return (
    <main id="contentUsers" className="main-content-section flex-1 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Quản lý Người dùng <span className="text-sky-600">({totalCount})</span></h1>
        <button 
          onClick={handleAddUser}
          className="mt-3 sm:mt-0 bg-sky-600 hover:bg-sky-700 text-white font-medium py-2.5 px-5 rounded-lg flex items-center transition-colors duration-150"
        >
          <i className="fas fa-user-plus mr-2"></i> Thêm người dùng
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
        <table className="styled-table">
          <thead>
            <tr>
              <th>Tên</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Lần đăng nhập cuối</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400 text-lg">
                  <div className="flex flex-col items-center justify-center">
                    <i className="fas fa-users text-4xl mb-4 text-gray-300"></i>
                    <p>Không tìm thấy người dùng nào.</p>
                    <p className="text-sm text-gray-500 mt-2">Hãy thử tìm kiếm với từ khóa khác hoặc thêm người dùng mới.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="font-medium">{user.full_name || 'N/A'}</td>
                  <td>{user.email || 'N/A'}</td>
                  <td>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'HR' ? 'bg-green-100 text-green-700' :
                      user.role === 'Manager' ? 'bg-blue-100 text-blue-700' :
                      user.role === 'Headhunter' ? 'bg-yellow-100 text-yellow-700' :
                      user.role === 'BD' ? 'bg-pink-100 text-pink-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role || 'N/A'}
                    </span>
                  </td>
                  <td>{user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.is_active ? 'Hoạt động' : 'Không hoạt động'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleUpdateUser(user.id)}
                        className="action-btn text-slate-600 hover:text-sky-600"
                        title="Chỉnh sửa"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={deletingUserId === user.id}
                        className="action-btn text-red-500 hover:text-red-600"
                        title="Xóa"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <EditUserModal
          user={{
            id: editingUser.id,
            full_name: editingUser.full_name || '',
            email: editingUser.email || '',
            role: editingUser.role || '',
            is_active: !!editingUser.is_active,
          }}
          onClose={handleCloseEditModal}
          onSave={handleSaveEditUser}
        />
      )}
    </main>
  );
};

export default UsersPage; 