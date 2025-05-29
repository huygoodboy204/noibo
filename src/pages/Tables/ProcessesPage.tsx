import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

const PAGE_SIZE = 20;
const TIMEOUT_DURATION = 5000;
const SUPABASE_URL = 'https://dqnjtkbxtscjikalkajq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw';

// Select query for processes - CLEANED UP
const PROCESSES_SELECT_QUERY = "id,process_status,status_update_date,process_memo,candidates(id,name,email),jobs(id,position_title),clients(id,client_name),hr_contacts(id,name),owner_details:owner_id(id,full_name)";

const PROCESSES_ORDER_BY_COLUMN = 'status_update_date';
const PROCESSES_ORDER_BY_ASCENDING = false;

const getRelationalField = <T, K extends keyof T>(
  relation: T | T[] | null | undefined,
  field: K
): T[K] | null | undefined => {
  if (!relation) return null;
  const targetObject = Array.isArray(relation) ? relation[0] : relation;
  return targetObject ? targetObject[field] : undefined;
};

interface ProcessDisplayCandidateInfo { id: string; name: string | null; email?: string | null; }
interface ProcessDisplayJobInfo { id: string; position_title: string | null; }
interface ProcessDisplayClientInfo { id: string; client_name: string | null; }
interface ProcessDisplayHrContactInfo { id: string; name: string | null; }
interface ProcessDisplayOwnerInfo { id: string; full_name: string | null; }

interface ProcessDisplay {
  id: string;
  process_status: string | null;
  status_update_date: string;
  process_memo: string | null;
  candidates: ProcessDisplayCandidateInfo | ProcessDisplayCandidateInfo[] | null;
  jobs: ProcessDisplayJobInfo | ProcessDisplayJobInfo[] | null;
  clients: ProcessDisplayClientInfo | ProcessDisplayClientInfo[] | null;
  hr_contacts: ProcessDisplayHrContactInfo | ProcessDisplayHrContactInfo[] | null;
  owner_details: ProcessDisplayOwnerInfo | ProcessDisplayOwnerInfo[] | null;
}

const ProcessesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();

  // State for data, loading, error, pagination
  const [processes, setProcesses] = useState<ProcessDisplay[]>([]);
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
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [editingProcess, setEditingProcess] = useState<ProcessDisplay | null>(null);
  const [deletingProcessId, setDeletingProcessId] = useState<string | null>(null);

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
      if (document.visibilityState === 'visible' && location.pathname === '/tables/processes') {
        console.log('[ProcessesPage] Page/tab became visible');
        
        if (visibilityDebounceRef.current) {
          clearTimeout(visibilityDebounceRef.current);
        }
        
        visibilityDebounceRef.current = window.setTimeout(() => {
          if (isMounted.current) {
            fetchProcesses(true);
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
    if (isMounted.current && location.pathname === '/tables/processes') {
      if (prevPathname.current && prevPathname.current !== location.pathname) {
        console.log(`[ProcessesPage] Navigated to processes page. Previous path: ${prevPathname.current}`);
        fetchProcesses(true);
      }
      prevPathname.current = location.pathname;
    }
  }, [location.pathname]);

  // Initial mount
  useEffect(() => {
    console.log('[ProcessesPage] Component mounted');
    isMounted.current = true;
    prevPathname.current = location.pathname;
    
    setProcesses([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    setTotalCount(0);
    isCurrentlyFetching.current = false;
    lastSuccessfulFetchRef.current = 0;

    if (mountTimerId.current) clearTimeout(mountTimerId.current);
    mountTimerId.current = setTimeout(() => {
      if (isMounted.current) {
        fetchProcesses(true);
      }
    }, 100);

    return cleanup;
  }, [location.pathname]);

  // Handle page change
  useEffect(() => {
    if (page > 1 && isMounted.current) {
      fetchProcesses(false, page);
    }
  }, [page]);

  // Handle online/offline
  useEffect(() => {
    const handleOnline = () => {
      console.log('[ProcessesPage] Browser is online, refreshing data');
      if (isMounted.current) {
        fetchProcesses(true);
      }
    };
    
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const fetchTotalProcessesCount = useCallback(async (signal?: AbortSignal) => {
    console.log('[ProcessesPage] Fetching total processes count...');
    if (!isMounted.current || signal?.aborted) return 0;
    let countVal = 0;
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/processes?select=count`, { method: 'GET', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json', 'Prefer': 'count=exact' }, signal });
      if (response.ok) {
        const countData = await response.json();
        countVal = Array.isArray(countData) && countData.length > 0 && typeof countData[0].count === 'number' ? countData[0].count : (Array.isArray(countData) && countData.length > 0 && typeof countData[0].count === 'string' ? parseInt(countData[0].count, 10) : 0);
        if (isMounted.current) setTotalCount(countVal);
        return countVal;
      }
    } catch (err:any) { if (err.name === 'AbortError') { /* silenced */ } else console.warn('[ProcessesPage] Direct count fetch error:', err.message); }
    try {
      let query = supabase.from('processes').select('*', { count: 'exact', head: true });
      if (signal) query = query.abortSignal(signal);
      const { count: supabaseCount, error: supabaseError } = await query;
      if (supabaseError) return countVal;
      countVal = supabaseCount || 0;
      if (isMounted.current && supabaseCount !== null) setTotalCount(countVal);
      return countVal;
    } catch (err:any) { return countVal; }
  }, [session?.access_token]);

  const directFetchProcesses = useCallback(async (signal: AbortSignal, currentPage: number): Promise<{ data: ProcessDisplay[] | null, error: Error | null }> => {
    const from = (currentPage - 1) * PAGE_SIZE;
    let url = `${SUPABASE_URL}/rest/v1/processes?select=${encodeURIComponent(PROCESSES_SELECT_QUERY)}`;
    url += `&order=${PROCESSES_ORDER_BY_COLUMN}.${PROCESSES_ORDER_BY_ASCENDING ? 'asc' : 'desc'}`;
    url += `&offset=${from}&limit=${PAGE_SIZE}`;
    try {
      const response = await fetch(url, { method: 'GET', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' }, signal });
      if (!response.ok) { const errorBody = await response.text(); throw new Error(`Direct fetch for processes failed: ${response.status} - ${errorBody}`);}
      const fetchedData = await response.json();
      console.log('[ProcessesPage] Direct fetched data sample:', fetchedData.length > 0 ? fetchedData[0] : 'empty');
      return { data: fetchedData as ProcessDisplay[], error: null };
    } catch (err: any) { 
      if (err.name === 'AbortError') return { data: null, error: new Error('Request aborted') };
      return { data: null, error: err instanceof Error ? err : new Error(String(err.message || 'Direct fetch processes failed')) };
    }
  }, [session?.access_token]);

  const fetchProcesses = useCallback(async (forceFetch = false, requestedPageOverride?: number) => {
    let fetchError: Error | null = null;
    const targetPage = requestedPageOverride ?? (forceFetch ? 1 : page);
    if (!isMounted.current || (!forceFetch && isCurrentlyFetching.current) || (!forceFetch && lastSuccessfulFetchRef.current > 0 && (Date.now() - lastSuccessfulFetchRef.current < 2000))) { return; }
    if (abortControllerRef.current) abortControllerRef.current.abort('New fetch for processes');
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    isCurrentlyFetching.current = true; setLoading(true); setError(null);
    if (forceFetch && page !== 1) setPage(1); else if (requestedPageOverride && page !== requestedPageOverride) setPage(requestedPageOverride);

    try {
      if (forceFetch || totalCount === 0) await fetchTotalProcessesCount(signal);
      if (signal.aborted) throw new DOMException('Aborted count fetch processes', 'AbortError');
      const from = (targetPage - 1) * PAGE_SIZE;
      const timeoutPromise = new Promise<never>((_, reject) => { const id = setTimeout(() => { clearTimeout(id); reject(new Error(`Query for processes (page ${targetPage}) timed out`)); }, TIMEOUT_DURATION); });
      let resultHolder: { data: ProcessDisplay[] | null; error: Error | null; count?: number | null } = { data: null, error: null };
      try {
        resultHolder = await Promise.race([directFetchProcesses(signal, targetPage), timeoutPromise]);
      } catch (directErr: any) { resultHolder = { data: null, error: new Error(String(directErr.message || directErr)) }; }
      if (signal.aborted) throw new DOMException('Aborted direct fetch processes', 'AbortError');
      if (!resultHolder.data || resultHolder.error) {
        if (resultHolder.error?.name === 'AbortError') throw resultHolder.error;
        let lastSbError: Error | null = null;
        try {
            if (signal.aborted) throw new DOMException('Aborted before Supabase fallback processes', 'AbortError');
            const query = supabase.from('processes').select(PROCESSES_SELECT_QUERY, { count: 'exact' }).order(PROCESSES_ORDER_BY_COLUMN, { ascending: PROCESSES_ORDER_BY_ASCENDING }).range(from, from + PAGE_SIZE - 1).abortSignal(signal);
            const { data: sbData, error: sbError, count: sbCount } = await Promise.race([query, timeoutPromise]);
            if (sbError) { lastSbError = new Error(sbError.message || 'Supabase query failed processes'); if ((sbError as any).name === 'AbortError' || sbError.message.includes('aborted')) lastSbError = new DOMException(sbError.message, 'AbortError'); throw lastSbError; }
            resultHolder = { data: sbData as ProcessDisplay[], error: null, count: sbCount };
        } catch (retryErr: any) { lastSbError = retryErr; if (lastSbError?.name === 'AbortError') throw lastSbError; throw lastSbError || new Error('Supabase fallback failed processes'); }
      }
      if (signal.aborted) throw new DOMException('Aborted all fetch attempts processes', 'AbortError');
      if (!resultHolder.data || resultHolder.error) throw resultHolder.error || new Error(`Failed to fetch processes (page ${targetPage})`);
      const fetchedData = resultHolder.data as ProcessDisplay[];
      console.log('[ProcessesPage] fetchProcesses - Fetched Data (raw):', fetchedData);
      if (fetchedData && fetchedData.length > 0) {
        console.log('[ProcessesPage] fetchProcesses - First process raw data:', JSON.parse(JSON.stringify(fetchedData[0])));
        console.log('[ProcessesPage] fetchProcesses - First process candidates field:', fetchedData[0].candidates);
        console.log('[ProcessesPage] fetchProcesses - First process jobs field:', fetchedData[0].jobs);
      }
      const newTotalCount = resultHolder.count;
      if (isMounted.current) {
        setProcesses(prev => targetPage === 1 ? fetchedData : [...prev, ...fetchedData]);
        setHasMore(fetchedData.length === PAGE_SIZE);
        if (newTotalCount !== undefined && newTotalCount !== null) setTotalCount(newTotalCount);
        lastSuccessfulFetchRef.current = Date.now();
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('Aborted')) console.log(`[ProcessesPage] Fetch aborted: ${err.message}.`);
      else if (isMounted.current) setError(err.message || 'Unknown error fetching processes');
    } finally {
      isCurrentlyFetching.current = false;
      if (isMounted.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, totalCount, session?.access_token]);

  const loadMoreProcesses = useCallback(() => { if (!loading && hasMore && !isCurrentlyFetching.current) setPage(p => p + 1); }, [loading, hasMore]);
  
  const refreshProcesses = useCallback(() => {
    console.log('[ProcessesPage] Refresh processes...');
    fetchProcesses(true, 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fetchProcesses will be in closure

  const handleStatusChange = async (processId: string, newStatus: string) => {
    try {
      const { error: updateError } = await supabase
        .from('processes')
        .update({ process_status: newStatus, status_update_date: new Date().toISOString() })
        .eq('id', processId);
      if (updateError) throw updateError;
      refreshProcesses();
    } catch (err) {
      console.error('Error updating process status:', err);
      alert('Failed to update process status');
    }
  };

  const filteredProcesses = processes.filter(processItem => {
    const p = processItem as ProcessDisplay;
    const candidateName = getRelationalField(p.candidates, 'name');
    const jobTitle = getRelationalField(p.jobs, 'position_title');
    const clientName = getRelationalField(p.clients, 'client_name');

    const matchesSearch = searchTerm === '' || 
      candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === '' || p.process_status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading && !processes.length && page === 1) return <p>Loading processes...</p>;
  if (error) return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-red-500">Error loading processes: {error}</p>
      <button onClick={refreshProcesses} className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Try Again</button>
      </div>
    );

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Processes {totalCount > 0 ? `(${processes.length}/${totalCount})` : ''}</h1>
        <div className="flex gap-2">
          <input type="text" placeholder="Search processes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="px-3 py-2 border rounded" />
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 border rounded">
            <option value="">All Statuses</option>
            <option value="APPLIED">Applied</option>
            <option value="CV_SUBMITTED_TO_CLIENT">CV Submitted</option>
            <option value="INTERVIEW_SCHEDULED_1ST">Interview 1st</option>
            <option value="INTERVIEW_COMPLETED_1ST">Interview 1st Done</option>
            <option value="INTERVIEW_SCHEDULED_2ND">Interview 2nd</option>
            <option value="INTERVIEW_COMPLETED_2ND">Interview 2nd Done</option>
            <option value="INTERVIEW_SCHEDULED_FINAL">Interview Final</option>
            <option value="INTERVIEW_COMPLETED_FINAL">Interview Final Done</option>
            <option value="OFFER_EXTENDED">Offer Extended</option>
            <option value="OFFER_ACCEPTED_BY_CANDIDATE">Offer Accepted</option>
            <option value="OFFER_DECLINED_BY_CANDIDATE">Offer Declined</option>
            <option value="REJECTED_BY_CLIENT">Rejected by Client</option>
            <option value="CANDIDATE_WITHDREW">Candidate Withdrew</option>
            <option value="PLACEMENT_CONFIRMED">Placement Confirmed</option>
            <option value="ONBOARDING">Onboarding</option>
            <option value="GUARANTEE_PERIOD">Guarantee Period</option>
            <option value="PROCESS_ON_HOLD">On Hold</option>
            <option value="PROCESS_CANCELLED">Cancelled</option>
          </select>
          <button onClick={refreshProcesses} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" disabled={loading}>
            {loading && page === 1 ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {filteredProcesses.length === 0 && !loading ? (
        <div className="text-center p-4"><p>No processes found.</p></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProcesses.map((process) => (
              <div key={process.id} className="border rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {getRelationalField(process.candidates, 'name') || 'N/A'} 
                      {getRelationalField(process.jobs, 'position_title') && ` → ${getRelationalField(process.jobs, 'position_title')}`}
                    </h3>
                  </div>
                    <select
                    value={process.process_status || ''} 
                      onChange={(e) => handleStatusChange(process.id, e.target.value)}
                    className="border rounded px-2 py-1 text-sm bg-gray-50 hover:bg-gray-100"
                    >
                      <option value="APPLIED">Applied</option>
                        <option value="CV_SUBMITTED_TO_CLIENT">CV Submitted</option>
                        <option value="INTERVIEW_SCHEDULED_1ST">Interview 1st</option>
                        <option value="INTERVIEW_COMPLETED_1ST">Interview 1st Done</option>
                        <option value="INTERVIEW_SCHEDULED_2ND">Interview 2nd</option>
                        <option value="INTERVIEW_COMPLETED_2ND">Interview 2nd Done</option>
                        <option value="INTERVIEW_SCHEDULED_FINAL">Interview Final</option>
                        <option value="INTERVIEW_COMPLETED_FINAL">Interview Final Done</option>
                        <option value="TEST_ASSIGNED">Test Assigned</option>
                        <option value="TEST_COMPLETED">Test Completed</option>
                        <option value="REFERENCE_CHECK_IN_PROGRESS">Ref Check In Progress</option>
                        <option value="REFERENCE_CHECK_COMPLETED">Ref Check Completed</option>
                        <option value="OFFER_EXTENDED">Offer Extended</option>
                        <option value="OFFER_ACCEPTED_BY_CANDIDATE">Offer Accepted</option>
                        <option value="OFFER_DECLINED_BY_CANDIDATE">Offer Declined</option>
                        <option value="REJECTED_BY_CLIENT">Rejected by Client</option>
                        <option value="CANDIDATE_WITHDREW">Candidate Withdrew</option>
                        <option value="PLACEMENT_CONFIRMED">Placement Confirmed</option>
                        <option value="ONBOARDING">Onboarding</option>
                        <option value="GUARANTEE_PERIOD">Guarantee Period</option>
                        <option value="PROCESS_ON_HOLD">On Hold</option>
                        <option value="PROCESS_CANCELLED">Cancelled</option>
                    </select>
                  </div>
                <div className="text-sm space-y-1">
                    <p>Client: {getRelationalField(process.clients, 'client_name') || 'N/A'}</p>
                    <p>HR Contact: {getRelationalField(process.hr_contacts, 'name') || 'N/A'}</p>
                    <p>Owner: {getRelationalField(process.owner_details, 'full_name') || 'N/A'}</p>
                    <p>Status Updated: {new Date(process.status_update_date).toLocaleDateString()}</p>
                    {process.process_memo && <p className="mt-1 p-2 bg-gray-50 rounded text-xs">Memo: {process.process_memo}</p>}
                </div>
              </div>
            ))}
          </div>
          {hasMore && !loading && (
            <div className="text-center mt-4">
              <button onClick={loadMoreProcesses} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" disabled={loading}>
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
      {loading && processes.length > 0 && page > 1 && (
        <p className="text-center mt-4 text-gray-600">Loading more processes...</p>
      )}
    </div>
  );
};

export default ProcessesPage; 