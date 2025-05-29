import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import EditHrContactModal from '../../components/EditHrContactModal';

// Constants for fetching
const PAGE_SIZE = 20;
const TIMEOUT_DURATION = 5000;
const SUPABASE_URL = 'https://dqnjtkbxtscjikalkajq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw';

// Corrected select query for hr_contacts
const HR_CONTACTS_SELECT_QUERY = "id,name,position_title,email_1,phone_1,client:client_id(id,client_name)";
const HR_CONTACTS_ORDER_BY_COLUMN = 'name'; // Defaulting to name, can be changed
const HR_CONTACTS_ORDER_BY_ASCENDING = true;

// Interface cho thông tin client được nhúng
interface ClientInfoForHrContact {
  id: string;
  client_name: string | null; // Ensure client_name can be null if that's possible for a client
}

// Interface cho một HR Contact hiển thị trên UI
interface HrContactDisplay {
  id: string;
  name: string;
  position_title?: string | null;
  email_1?: string | null;
  phone_1?: string | null;
  // Updated to allow single object or array for relational fields
  client: ClientInfoForHrContact | ClientInfoForHrContact[] | null; 
}

// Helper function (if needed, same as in AdminJobsPage)
const getRelationalField = <T, K extends keyof T>(
  relation: T | T[] | null | undefined,
  field: K
): T[K] | null | undefined => {
  if (!relation) return null;
  const targetObject = Array.isArray(relation) ? relation[0] : relation;
  return targetObject ? targetObject[field] : undefined;
};

const HrContactsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();

  // State for data, loading, error, pagination
  const [hrContacts, setHrContacts] = useState<HrContactDisplay[]>([]);
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
  const [editingHrContact, setEditingHrContact] = useState<HrContactDisplay | null>(null);
  const [deletingHrContactId, setDeletingHrContactId] = useState<string | null>(null);

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
      if (document.visibilityState === 'visible' && location.pathname === '/tables/hr-contacts') {
        console.log('[HrContactsPage] Page/tab became visible');
        
        if (visibilityDebounceRef.current) {
          clearTimeout(visibilityDebounceRef.current);
        }
        
        visibilityDebounceRef.current = window.setTimeout(() => {
          if (isMounted.current) {
            fetchHrContacts(true);
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
    if (isMounted.current && location.pathname === '/tables/hr-contacts') {
      if (prevPathname.current && prevPathname.current !== location.pathname) {
        console.log(`[HrContactsPage] Navigated to hr-contacts page. Previous path: ${prevPathname.current}`);
        fetchHrContacts(true);
      }
      prevPathname.current = location.pathname;
    }
  }, [location.pathname]);

  // Initial mount
  useEffect(() => {
    console.log('[HrContactsPage] Component mounted');
    isMounted.current = true;
    prevPathname.current = location.pathname;
    
    setHrContacts([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    setTotalCount(0);
    isCurrentlyFetching.current = false;
    lastSuccessfulFetchRef.current = 0;

    if (mountTimerId.current) clearTimeout(mountTimerId.current);
    mountTimerId.current = setTimeout(() => {
      if (isMounted.current) {
        fetchHrContacts(true);
      }
    }, 100);

    return cleanup;
  }, [location.pathname]);

  // Handle page change
  useEffect(() => {
    if (page > 1 && isMounted.current) {
      fetchHrContacts(false, page);
    }
  }, [page]);

  // Handle online/offline
  useEffect(() => {
    const handleOnline = () => {
      console.log('[HrContactsPage] Browser is online, refreshing data');
      if (isMounted.current) {
        fetchHrContacts(true);
      }
    };
    
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const fetchTotalHrContactsCount = useCallback(async (signal?: AbortSignal) => {
    console.log('[HrContactsPage] Fetching total hr_contacts count...');
    if (!isMounted.current || signal?.aborted) return 0;
    let countVal = 0;
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/hr_contacts?select=count`, { method: 'GET', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json', 'Prefer': 'count=exact' }, signal });
      if (response.ok) {
        const countData = await response.json();
        countVal = Array.isArray(countData) && countData.length > 0 && typeof countData[0].count === 'number' ? countData[0].count : (Array.isArray(countData) && countData.length > 0 && typeof countData[0].count === 'string' ? parseInt(countData[0].count, 10) : 0);
        if (isMounted.current) setTotalCount(countVal);
        return countVal;
      }
    } catch (err:any) { if (err.name === 'AbortError') { /* silenced */ } else console.warn('[HrContactsPage] Direct count fetch error:', err.message); }
    try {
      let query = supabase.from('hr_contacts').select('*', { count: 'exact', head: true });
      if (signal) query = query.abortSignal(signal);
      const { count: supabaseCount, error: supabaseError } = await query;
      if (supabaseError) return countVal;
      countVal = supabaseCount || 0;
      if (isMounted.current && supabaseCount !== null) setTotalCount(countVal);
      return countVal;
    } catch (err:any) { return countVal; }
  }, [session?.access_token]);

  const directFetchHrContacts = useCallback(async (signal: AbortSignal, currentPage: number): Promise<{ data: HrContactDisplay[] | null, error: Error | null }> => {
    const from = (currentPage - 1) * PAGE_SIZE;
    let url = `${SUPABASE_URL}/rest/v1/hr_contacts?select=${encodeURIComponent(HR_CONTACTS_SELECT_QUERY)}`;
    url += `&order=${HR_CONTACTS_ORDER_BY_COLUMN}.${HR_CONTACTS_ORDER_BY_ASCENDING ? 'asc' : 'desc'}`;
    url += `&offset=${from}&limit=${PAGE_SIZE}`;
    try {
      const response = await fetch(url, { method: 'GET', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' }, signal });
      if (!response.ok) { const errorBody = await response.text(); throw new Error(`Direct fetch for hr_contacts failed: ${response.status} - ${errorBody}`);}
      const fetchedData = await response.json();
      console.log('[HrContactsPage] Direct fetched hr_contacts sample:', fetchedData.length > 0 ? fetchedData[0] : 'empty');
      return { data: fetchedData as HrContactDisplay[], error: null };
    } catch (err: any) { 
      if (err.name === 'AbortError') return { data: null, error: new Error('Request aborted') };
      return { data: null, error: err instanceof Error ? err : new Error(String(err.message || 'Direct fetch hr_contacts failed')) };
    }
  }, [session?.access_token]);

  const fetchHrContacts = useCallback(async (forceFetch = false, pageToFetchArg?: number) => {
    const targetPage = pageToFetchArg ?? page;
    if (!isMounted.current || (!forceFetch && isCurrentlyFetching.current) || (!forceFetch && lastSuccessfulFetchRef.current > 0 && (Date.now() - lastSuccessfulFetchRef.current < 2000))) { return; }
    if (abortControllerRef.current) abortControllerRef.current.abort('New fetch for hr_contacts');
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    isCurrentlyFetching.current = true; setLoading(true); setError(null);
    try {
      if (forceFetch || totalCount === 0) await fetchTotalHrContactsCount(signal);
      if (signal.aborted) throw new DOMException('Aborted count fetch hr_contacts', 'AbortError');
      const from = (targetPage - 1) * PAGE_SIZE;
      const timeoutPromise = new Promise<never>((_, reject) => { const id = setTimeout(() => { clearTimeout(id); reject(new Error(`Query hr_contacts (page ${targetPage}) timed out`)); }, TIMEOUT_DURATION); });
      let resultHolder: { data: HrContactDisplay[] | null; error: Error | null; count?: number | null } = { data: null, error: null };
      try {
        resultHolder = await Promise.race([directFetchHrContacts(signal, targetPage), timeoutPromise]);
      } catch (directErr: any) { resultHolder = { data: null, error: new Error(String(directErr.message || directErr)) }; }
      if (signal.aborted) throw new DOMException('Aborted direct fetch hr_contacts', 'AbortError');
      if (!resultHolder.data || resultHolder.error) {
        if (resultHolder.error?.name === 'AbortError') throw resultHolder.error;
        let lastSbError: Error | null = null;
        try {
            if (signal.aborted) throw new DOMException('Aborted Supabase fallback hr_contacts', 'AbortError');
            const query = supabase.from('hr_contacts').select(HR_CONTACTS_SELECT_QUERY, { count: 'exact' }).order(HR_CONTACTS_ORDER_BY_COLUMN, { ascending: HR_CONTACTS_ORDER_BY_ASCENDING }).range(from, from + PAGE_SIZE - 1).abortSignal(signal);
            const { data: sbData, error: sbError, count: sbCount } = await Promise.race([query, timeoutPromise]);
            if (sbError) { lastSbError = new Error(sbError.message || 'Supabase query failed hr_contacts'); if ((sbError as any).name === 'AbortError' || sbError.message.includes('aborted')) lastSbError = new DOMException(sbError.message, 'AbortError'); throw lastSbError; }
            resultHolder = { data: sbData as HrContactDisplay[], error: null, count: sbCount };
        } catch (retryErr: any) { lastSbError = retryErr; if (lastSbError?.name === 'AbortError') throw lastSbError; throw lastSbError || new Error('Supabase fallback hr_contacts failed'); }
      }
      if (signal.aborted) throw new DOMException('Aborted all fetch hr_contacts', 'AbortError');
      if (!resultHolder.data || resultHolder.error) throw resultHolder.error || new Error(`Failed to fetch hr_contacts (page ${targetPage})`);
      const fetchedData = resultHolder.data as HrContactDisplay[];
      console.log('[HrContactsPage] fetchHrContacts - Fetched Data (raw):', fetchedData);
      if (fetchedData && fetchedData.length > 0) {
        console.log('[HrContactsPage] fetchHrContacts - First hr_contact raw data:', JSON.parse(JSON.stringify(fetchedData[0])));
      }
      const newTotalCount = resultHolder.count;
      if (isMounted.current) {
        setHrContacts(prev => targetPage === 1 ? fetchedData : [...prev, ...fetchedData]);
        setHasMore(fetchedData.length === PAGE_SIZE);
        if (newTotalCount !== undefined && newTotalCount !== null) setTotalCount(newTotalCount);
        lastSuccessfulFetchRef.current = Date.now();
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('Aborted')) console.log(`[HrContactsPage] Fetch aborted: ${err.message}.`);
      else if (isMounted.current) setError(err.message || 'Unknown error fetching hr_contacts');
    } finally {
      isCurrentlyFetching.current = false;
      if (isMounted.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, totalCount, session?.access_token]); // Corrected dependencies

  const loadMoreHrContacts = useCallback(() => { 
    if (!loading && hasMore && !isCurrentlyFetching.current) {
        console.log('[HrContactsPage] Load more: Current page:', page, '-> New page:', page + 1);
        setPage(p => p + 1); 
    }
}, [loading, hasMore, page]);
  
  const refreshHrContacts = useCallback(() => {
    console.log('[HrContactsPage] Refresh triggered');
    setPage(1); // Reset page, which will trigger page useEffect if page was not already 1
                // If page was already 1, mount useEffect or direct call is needed.
                // To ensure fetch happens even if page is already 1:
    fetchHrContacts(true, 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps, fetchHrContacts from closure

  const handleAddHrContact = () => {
    navigate('/tables/add-hr-contact');
  };
  const handleDeleteHrContact = async (hrContactId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa liên hệ này?')) {
      try {
        const { error } = await supabase
          .from('hr_contacts')
          .delete()
          .eq('id', hrContactId);

        if (error) throw error;

        toast.success('Xóa liên hệ thành công');
        await refreshHrContacts();
      } catch (error: any) {
        console.error('Error deleting HR contact:', error);
        toast.error(error.message || 'Không thể xóa liên hệ');
      }
    }
  };

  const handleUpdateHrContact = (hrContact: HrContactDisplay) => {
    setEditingHrContact(hrContact);
  };

  const handleCloseEditModal = () => {
    setEditingHrContact(null);
  };

  const handleSaveEditHrContact = async (updatedHrContact: HrContactDisplay) => {
    setEditingHrContact(null);
    await refreshHrContacts();
  };

  if (loading && !hrContacts.length && page === 1) return <p>Loading HR contacts...</p>;
  if (error) return ( <div className="container mx-auto p-4 text-center"> <p className="text-red-500">Error: {error}</p> <button onClick={refreshHrContacts} className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Try Again</button> </div> );

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">HR Contacts {totalCount > 0 ? `(${hrContacts.length}/${totalCount})` : ''}</h1>
        <button onClick={handleAddHrContact} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Add HR Contact
        </button>
      </div>
      
      {hrContacts.length === 0 && !loading ? (
        <p>No HR contacts found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-md rounded-lg">
            <thead className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <tr>
                <th className="py-3 px-6 text-left">Name</th>
                <th className="py-3 px-6 text-left">Position</th>
                <th className="py-3 px-6 text-left">Email</th>
                <th className="py-3 px-6 text-left">Phone</th>
                <th className="py-3 px-6 text-left">Client</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {hrContacts.map((contact) => (
                <tr key={contact.id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-3 px-6 text-left whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="font-medium">{contact.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-6 text-left">{contact.position_title || 'N/A'}</td>
                  <td className="py-3 px-6 text-left">
                    {contact.email_1 ? (
                      <a href={`mailto:${contact.email_1}`} className="text-blue-500 hover:underline">
                        {contact.email_1}
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="py-3 px-6 text-left">{contact.phone_1 || 'N/A'}</td>
                  <td className="py-3 px-6 text-left">
                    {getRelationalField(contact.client, 'client_name') || 'N/A'}
                  </td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleUpdateHrContact(contact)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteHrContact(contact.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {hasMore && !loading && (
        <div className="text-center mt-4">
          <button
            onClick={loadMoreHrContacts}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {loading && hrContacts.length > 0 && page > 1 && (
        <p className="text-center mt-4 text-gray-600">
          Loading more HR contacts...
        </p>
      )}

      {editingHrContact && (
        <EditHrContactModal
          hrContact={editingHrContact}
          onClose={handleCloseEditModal}
          onSave={handleSaveEditHrContact}
        />
      )}
    </div>
  );
};

export default HrContactsPage; 