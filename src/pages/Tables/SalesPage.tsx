import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import AddSaleModal from './components/AddSaleModal';

// Constants for fetching
const PAGE_SIZE = 20;
const TIMEOUT_DURATION = 5000;
const SUPABASE_URL = 'https://dqnjtkbxtscjikalkajq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw';

// Corrected select query for sales
// Assuming sales.client_id, sales.job_id, sales.candidate_id, sales.handled_by_id are the FKs
const SALES_SELECT_QUERY = "id,process_id,fee_amount,payment_status,invoice_date,client:client_id(id,client_name),job:job_id(id,position_title),candidate:candidate_id(id,name),handler:handled_by_id(id,full_name)";
const SALES_ORDER_BY_COLUMN = 'invoice_date'; // Defaulting to invoice_date, can be changed
const SALES_ORDER_BY_ASCENDING = false;

// Interfaces for joined data, adjusted for SalesPage
interface SaleClientInfo { id: string; client_name: string | null; }
interface SaleJobInfo { id: string; position_title: string | null; }
interface SaleCandidateInfo { id: string; name: string | null; }
interface SaleHandlerInfo { id: string; full_name: string | null; }
// Process info might be needed if process_id is expanded, e.g., process:process_id(status)

// Interface for a Sale to display - to be updated based on actual data structure from fetch
interface SaleDisplay {
  id: string;
  process_id: string | null; // process_id is UNIQUE in sales table, references processes
  fee_amount: number | null;
  payment_status: string | null;
  invoice_date: string | null;
  // Relational fields - assuming they might be objects or arrays of objects
  client: SaleClientInfo | SaleClientInfo[] | null;
  job: SaleJobInfo | SaleJobInfo[] | null;
  candidate: SaleCandidateInfo | SaleCandidateInfo[] | null;
  handler: SaleHandlerInfo | SaleHandlerInfo[] | null;
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

const SalesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();

  // State for data, loading, error, pagination
  const [sales, setSales] = useState<SaleDisplay[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [showAddModal, setShowAddModal] = useState(false);

  // Refs for managing fetch lifecycle
  const isMounted = useRef(true);
  const isCurrentlyFetching = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSuccessfulFetchRef = useRef<number>(0);
  const visibilityDebounceRef = useRef<number | null>(null);
  const prevPathname = useRef<string>('');
  const mountTimerId = useRef<NodeJS.Timeout | null>(null);
  
  // Placeholder for search/filter state if needed later
  // const [searchTerm, setSearchTerm] = useState(''); 

  // --- Fetch logic for Sales (adapted from other pages) ---
  const fetchTotalSalesCount = useCallback(async (signal?: AbortSignal) => {
    console.log('[SalesPage] Fetching total sales count...');
    if (!isMounted.current || signal?.aborted) return 0;
    let countVal = 0;
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/sales?select=count`, { method: 'GET', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json', 'Prefer': 'count=exact' }, signal });
      if (response.ok) {
        const countData = await response.json();
        countVal = Array.isArray(countData) && countData.length > 0 && typeof countData[0].count === 'number' ? countData[0].count : (Array.isArray(countData) && countData.length > 0 && typeof countData[0].count === 'string' ? parseInt(countData[0].count, 10) : 0);
        if (isMounted.current) setTotalCount(countVal);
        return countVal;
      }
    } catch (err:any) { if (err.name === 'AbortError') { /* silenced */ } else console.warn('[SalesPage] Direct count fetch error:', err.message); }
    try {
      let query = supabase.from('sales').select('*', { count: 'exact', head: true });
      if (signal) query = query.abortSignal(signal);
      const { count: supabaseCount, error: supabaseError } = await query;
      if (supabaseError) return countVal;
      countVal = supabaseCount || 0;
      if (isMounted.current && supabaseCount !== null) setTotalCount(countVal);
      return countVal;
    } catch (err:any) { return countVal; }
  }, [session?.access_token]);

  const directFetchSales = useCallback(async (signal: AbortSignal, currentPage: number): Promise<{ data: SaleDisplay[] | null, error: Error | null }> => {
    const from = (currentPage - 1) * PAGE_SIZE;
    let url = `${SUPABASE_URL}/rest/v1/sales?select=${encodeURIComponent(SALES_SELECT_QUERY)}`;
    url += `&order=${SALES_ORDER_BY_COLUMN}.${SALES_ORDER_BY_ASCENDING ? 'asc' : 'desc'}`;
    url += `&offset=${from}&limit=${PAGE_SIZE}`;
    try {
      const response = await fetch(url, { method: 'GET', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' }, signal });
      if (!response.ok) { const errorBody = await response.text(); throw new Error(`Direct fetch for sales failed: ${response.status} - ${errorBody}`);}
      const fetchedData = await response.json();
      console.log('[SalesPage] Direct fetched sales sample:', fetchedData.length > 0 ? fetchedData[0] : 'empty');
      return { data: fetchedData as SaleDisplay[], error: null };
    } catch (err: any) { 
      if (err.name === 'AbortError') return { data: null, error: new Error('Request aborted') };
      return { data: null, error: err instanceof Error ? err : new Error(String(err.message || 'Direct fetch sales failed')) };
    }
  }, [session?.access_token]);

  const fetchSales = useCallback(async (forceFetch = false) => {
    let fetchError: Error | null = null;
    try {
      if (!isMounted.current) return;
      if (!forceFetch) {
        if (isCurrentlyFetching.current) return;
        const now = Date.now();
        if (lastSuccessfulFetchRef.current > 0 && (now - lastSuccessfulFetchRef.current < 2000)) return;
      }
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      isCurrentlyFetching.current = true;
      setLoading(true);
      setError(null);
      if (forceFetch) setPage(1);
      if (forceFetch || totalCount === 0) await fetchTotalSalesCount(signal);
      const from = (page - 1) * PAGE_SIZE;
      const timeoutDuration = 5000;
      const timeout = new Promise<never>((_, reject) => {
        const id = setTimeout(() => { clearTimeout(id); reject(new Error(`Query timed out after ${timeoutDuration}ms`)); }, timeoutDuration);
      });
      let result;
      try {
        result = await Promise.race([
          directFetchSales(signal, page),
          timeout
        ]);
      } catch (directError) {
        // fallback nếu cần
        result = { data: null, error: directError };
      }
      if (typeof result === 'undefined') throw new Error('Internal error: Failed to get data fetching result.');
      const { data, error: fetchErr } = result;
      if (fetchErr) throw fetchErr;
      if (!data) throw new Error('No data received from server');
      if (isMounted.current) {
        if (forceFetch) {
          setSales(data);
        } else {
          setSales(prev => page === 1 ? data : [...prev, ...data]);
        }
        setHasMore(data.length === PAGE_SIZE);
        lastSuccessfulFetchRef.current = Date.now();
      }
    } catch (err: any) {
      fetchError = err;
      if (err.name === 'AbortError' || err.message === 'Request aborted') return;
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : String(err));
        if (page === 1) setSales([]);
      }
    } finally {
      if (isMounted.current && (!fetchError || (fetchError.name !== 'AbortError' && fetchError.message !== 'Request aborted'))) {
        setLoading(false);
      }
      isCurrentlyFetching.current = false;
    }
  }, [page, totalCount, session?.access_token, fetchTotalSalesCount, directFetchSales]);

  const loadMoreSales = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prevPage => prevPage + 1);
    }
  }, [loading, hasMore]);

  useEffect(() => {
    isMounted.current = true;
    setSales([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    setTotalCount(0);
    isCurrentlyFetching.current = false;
    lastSuccessfulFetchRef.current = 0;
    prevPathname.current = location.pathname;
    const timer = setTimeout(() => {
      if (isMounted.current) fetchSales(true);
    }, 100);
    return () => {
      clearTimeout(timer);
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort('SalesPage unmounted');
        abortControllerRef.current = null;
      }
      if (visibilityDebounceRef.current !== null) window.clearTimeout(visibilityDebounceRef.current);
    };
  }, [location.pathname]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted.current && location.pathname.includes('/tables/sales')) {
        if (visibilityDebounceRef.current !== null) window.clearTimeout(visibilityDebounceRef.current);
        visibilityDebounceRef.current = window.setTimeout(() => {
          if (isMounted.current) {
            setPage(1);
            fetchSales(true);
          }
          visibilityDebounceRef.current = null;
        }, 300);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityDebounceRef.current !== null) window.clearTimeout(visibilityDebounceRef.current);
    };
  }, [location.pathname]);

  // --- End Fetch logic ---

  const handleAddSale = () => setShowAddModal(true);
  const handleCloseAddModal = () => setShowAddModal(false);
  const handleSaleAdded = () => {
    setShowAddModal(false);
    fetchSales(true);
  };

  if (loading && !sales.length && page === 1) return <p>Loading sales...</p>;
  if (error) return ( <div className="container mx-auto p-4 text-center"> <p className="text-red-500">Error: {error}</p> <button onClick={() => fetchSales(true)} className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Try Again</button> </div> );

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Sales {totalCount > 0 ? `(${sales.length}/${totalCount})` : ''}</h1>
        <button onClick={handleAddSale} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Add Sale
        </button>
      </div>
      {showAddModal && <AddSaleModal onClose={handleCloseAddModal} onAdded={handleSaleAdded} />}
      {sales.length === 0 && !loading ? (
        <p>No sales found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-md rounded-lg">
            <thead className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <tr>
                <th className="py-3 px-6 text-left">Client</th>
                <th className="py-3 px-6 text-left">Position</th>
                <th className="py-3 px-6 text-left">Candidate</th>
                <th className="py-3 px-6 text-left">Fee Amount</th>
                <th className="py-3 px-6 text-left">Payment Status</th>
                <th className="py-3 px-6 text-left">Invoice Date</th>
                <th className="py-3 px-6 text-left">Handler</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-3 px-6 text-left">{getRelationalField(sale.client, 'client_name') || 'N/A'}</td>
                  <td className="py-3 px-6 text-left">{getRelationalField(sale.job, 'position_title') || 'N/A'}</td>
                  <td className="py-3 px-6 text-left">{getRelationalField(sale.candidate, 'name') || 'N/A'}</td>
                  <td className="py-3 px-6 text-left">${sale.fee_amount?.toLocaleString() || 'N/A'}</td>
                  <td className="py-3 px-6 text-left">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      sale.payment_status === 'PAID' ? 'bg-green-100 text-green-800' :
                      sale.payment_status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : // Corrected from PENDING to Paid for example
                      sale.payment_status === 'Paid' ? 'bg-green-100 text-green-800' : // Added explicit Paid check
                      'bg-red-100 text-red-800' // Default for Overdue, Cancelled etc.
                    }`}>
                      {sale.payment_status}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-left">{sale.invoice_date ? new Date(sale.invoice_date).toLocaleDateString() : 'N/A'}</td>
                  <td className="py-3 px-6 text-left">{getRelationalField(sale.handler, 'full_name') || 'N/A'}</td>
                  <td className="py-3 px-6 text-center">
                    <button onClick={() => {}} className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hasMore && !loading && (
        <div className="text-center mt-4">
          <button onClick={loadMoreSales} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" disabled={loading}>
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
      {loading && sales.length > 0 && page > 1 && (
        <p className="text-center mt-4 text-gray-600">Loading more sales...</p>
      )}
    </div>
  );
};

export default SalesPage; 