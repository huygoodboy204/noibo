import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
// import { Job } from '../../types'; // Temporarily remove to use local JobDisplay
import ApplyJobModal, { ApplyJobModalProps } from '../../components/modals/ApplyJobModal'; // Now import ApplyJobModalProps

// Constants for fetching, mirroring CandidatesPage
const PAGE_SIZE = 20;
const TIMEOUT_DURATION = 5000; // 5 seconds
const SUPABASE_URL = 'https://dqnjtkbxtscjikalkajq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw';

// Select query for jobs - taken from the original useSupabaseQuery call
const JOBS_SELECT_QUERY = `*,clients(id,client_name,website_url),hr_contacts(id,name,email_1),owner_details:owner_id(id,full_name)`;
const JOBS_ORDER_BY_COLUMN = 'created_at';
const JOBS_ORDER_BY_ASCENDING = false;

// Local JobDisplay type mirroring the select query and CandidatesPage structure for related entities
interface JobClientInfo { id: string; client_name: string | null; website_url?: string | null; }
interface JobHrContactInfo { id: string; name: string | null; email_1?: string | null; }
interface JobOwnerInfo { id: string; full_name: string | null; }

interface JobDisplay {
  id: string;
  position_title: string | null;
  phase: string | null; 
  job_rank: string | null; 
  min_monthly_salary: number | null;
  max_monthly_salary: number | null;
  min_annual_salary: number | null;
  max_annual_salary: number | null;
  clients: JobClientInfo[] | null;
  hr_contacts: JobHrContactInfo[] | null;
  owner_details: JobOwnerInfo[] | null;
  work_location: string | null;
  mrt_station: string | null;
  industry_category: string | null;
  job_category: string | null;
  report_to: string | null;
  english_level: string | null; 
  other_languages: string[] | null;
  visa_support: boolean | null;
  working_hours: string | null;
  insurance: string | null;
  bonus: string | null;
  allowance: string | null;
  probation_period: string | null;
  annual_leave: string | null;
  sick_leave: string | null;
  created_at: string;
  updated_at?: string;
  job_summary?: string | null;
  requirements?: string | null;
}

// Helper cho trường liên kết (object hoặc array)
const getClientName = (clients: any) => {
  if (!clients) return null;
  if (Array.isArray(clients)) return clients[0]?.client_name;
  return clients.client_name;
};
const getClientWebsite = (clients: any) => {
  if (!clients) return null;
  if (Array.isArray(clients)) return clients[0]?.website_url;
  return clients.website_url;
};
const getHrContactName = (hr_contacts: any) => {
  if (!hr_contacts) return null;
  if (Array.isArray(hr_contacts)) return hr_contacts[0]?.name;
  return hr_contacts.name;
};
const getHrContactEmail = (hr_contacts: any) => {
  if (!hr_contacts) return null;
  if (Array.isArray(hr_contacts)) return hr_contacts[0]?.email_1;
  return hr_contacts.email_1;
};
const getOwnerName = (owner_details: any) => {
  if (!owner_details) return null;
  if (Array.isArray(owner_details)) return owner_details[0]?.full_name;
  return owner_details.full_name;
};

const JobsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session } = useAuth();

  // State for data, loading, error, pagination - from CandidatesPage
  const [jobs, setJobs] = useState<JobDisplay[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Refs for managing fetch lifecycle - from CandidatesPage
  const isMounted = useRef(true);
  const isCurrentlyFetching = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSuccessfulFetchRef = useRef<number>(0);
  const visibilityDebounceRef = useRef<number | null>(null);
  const prevPathname = useRef<string>('');
  const mountTimerId = useRef<NodeJS.Timeout | null>(null);

  // State for UI elements specific to JobsPage
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedJobForModal, setSelectedJobForModal] = useState<JobDisplay | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [animatingJobId, setAnimatingJobId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterJobType, setFilterJobType] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterRanking, setFilterRanking] = useState('');

  const fetchTotalJobsCount = useCallback(async (signal?: AbortSignal) => {
    console.log('[JobsPage] Fetching total jobs count...');
    if (!isMounted.current || signal?.aborted) return 0;
    let countVal = 0;
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/jobs?select=count`, {
        method: 'GET',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json', 'Prefer': 'count=exact' },
        signal
      });
      if (response.ok) {
        const countData = await response.json();
        countVal = Array.isArray(countData) && countData.length > 0 && typeof countData[0].count === 'number' 
                      ? countData[0].count 
                      : (Array.isArray(countData) && countData.length > 0 && typeof countData[0].count === 'string' 
                         ? parseInt(countData[0].count, 10) 
                         : 0);
        console.log(`[JobsPage] Direct count fetch result: ${countVal}`);
        if (isMounted.current) setTotalCount(countVal);
        return countVal;
      }
      console.warn(`[JobsPage] Direct count fetch failed, status: ${response.status}`);
    } catch (err: any) {
      if (err.name === 'AbortError') console.log('[JobsPage] Direct count fetch aborted.');
      else console.warn('[JobsPage] Direct count fetch error, falling back:', err.message);
    }

    try {
      let query = supabase.from('jobs').select('*', { count: 'exact', head: true });
      if (signal) query = query.abortSignal(signal); // Corrected
      const { count: supabaseCount, error: supabaseError } = await query;
      
      if (supabaseError) {
        if (supabaseError.name !== 'AbortError') console.error('[JobsPage] Supabase error fetching count:', supabaseError.message);
        return countVal; // Return previous count or 0 if direct failed
      }
      countVal = supabaseCount || 0;
      if (isMounted.current && supabaseCount !== null) setTotalCount(countVal);
      return countVal;
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('[JobsPage] Error in Supabase count fallback:', err.message);
      return countVal; // Return previous count or 0
    }
  }, [session?.access_token]);

  const directFetchJobs = useCallback(async (signal: AbortSignal, currentPage: number): Promise<{ data: JobDisplay[] | null, error: Error | null }> => {
    console.log(`[JobsPage] Attempting direct fetch for jobs (page ${currentPage})...`);
    const from = (currentPage - 1) * PAGE_SIZE;
    let url = `${SUPABASE_URL}/rest/v1/jobs?select=${encodeURIComponent(JOBS_SELECT_QUERY)}`;
    url += `&order=${JOBS_ORDER_BY_COLUMN}.${JOBS_ORDER_BY_ASCENDING ? 'asc' : 'desc'}`;
    url += `&offset=${from}&limit=${PAGE_SIZE}`;
    try {
      const response = await fetch(url, { 
        method: 'GET',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' },
        signal 
      });
      if (!response.ok) { 
        const errorBody = await response.text();
        console.error(`[JobsPage] Direct fetch error response body:`, errorBody);
        throw new Error(`Direct fetch for jobs failed: ${response.status} - ${errorBody}`);
      }
      const fetchedData = await response.json();
      return { data: fetchedData as JobDisplay[], error: null };
    } catch (err: any) { 
      if (err.name === 'AbortError') return { data: null, error: new Error('Request aborted') };
      console.error('[JobsPage] Direct fetch processing error:', err.message);
      return { data: null, error: err instanceof Error ? err : new Error(String(err.message || 'Direct fetch processing failed')) };
    }
  }, [session?.access_token]);

  const fetchJobs = useCallback(async (forceFetch = false, requestedPageOverride?: number) => {
    let fetchError: Error | null = null;
    const targetPage = requestedPageOverride ?? (forceFetch ? 1 : page);

    if (!isMounted.current || (!forceFetch && isCurrentlyFetching.current) || 
        (!forceFetch && lastSuccessfulFetchRef.current > 0 && (Date.now() - lastSuccessfulFetchRef.current < 2000))) {
      // console.log('[JobsPage] Fetch skipped due to conditions');
      return;
    }

    if (abortControllerRef.current) abortControllerRef.current.abort('New fetch initiated by fetchJobs');
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    isCurrentlyFetching.current = true;
    setLoading(true);
    setError(null);
    if (forceFetch && page !== 1) setPage(1);
    else if (requestedPageOverride && page !== requestedPageOverride) setPage(requestedPageOverride);

    try {
      if (forceFetch || totalCount === 0) await fetchTotalJobsCount(signal);
      if (signal.aborted) throw new DOMException('Aborted during count fetch', 'AbortError');

      const from = (targetPage - 1) * PAGE_SIZE;
      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => { clearTimeout(id); reject(new Error(`Query for jobs (page ${targetPage}) timed out`)); }, TIMEOUT_DURATION);
      });

      let resultHolder: { data: JobDisplay[] | null; error: Error | null; count?: number | null } = { data: null, error: null };

      try {
        resultHolder = await Promise.race([directFetchJobs(signal, targetPage), timeoutPromise]);
      } catch (directFetchWrappedError: any) {
        resultHolder = { data: null, error: new Error(String(directFetchWrappedError.message || directFetchWrappedError)) };
      }

      if (signal.aborted) throw new DOMException('Aborted after direct fetch attempt', 'AbortError');

      if (!resultHolder.data || resultHolder.error) {
        if (resultHolder.error?.name === 'AbortError') throw resultHolder.error;
        console.log(`[JobsPage] Direct fetch unsuccessful. Falling back to Supabase client for page ${targetPage}...`);
        
        let lastSupabaseError: Error | null = null;
        // Only 1 attempt for Supabase client as a fallback
        try {
            if (signal.aborted) throw new DOMException('Aborted before Supabase client attempt', 'AbortError');
            const query = supabase
              .from('jobs')
              .select(JOBS_SELECT_QUERY, { count: 'exact' })
              .order(JOBS_ORDER_BY_COLUMN, { ascending: JOBS_ORDER_BY_ASCENDING })
              .range(from, from + PAGE_SIZE - 1)
              .abortSignal(signal);
            
            const { data: sbData, error: sbError, count: sbCount } = await Promise.race([query, timeoutPromise]);

            if (sbError) {
              lastSupabaseError = new Error(sbError.message || 'Supabase client query failed');
              if ((sbError as any).name === 'AbortError' || sbError.message.includes('aborted')) {
                lastSupabaseError = new DOMException(sbError.message, 'AbortError');
              }
              throw lastSupabaseError;
            }
            resultHolder = { data: sbData as JobDisplay[], error: null, count: sbCount };
          } catch (errorInRetry: any) {
            lastSupabaseError = errorInRetry;
            if (lastSupabaseError?.name === 'AbortError') throw lastSupabaseError; // Check for null before accessing name
            throw lastSupabaseError || new Error('Supabase fallback failed'); // Ensure an error is thrown
          }
      }

      if (signal.aborted) throw new DOMException('Aborted after all fetch attempts', 'AbortError');
      if (!resultHolder.data || resultHolder.error) throw resultHolder.error || new Error(`Failed to fetch jobs (page ${targetPage})`);
      
      const fetchedData = resultHolder.data as JobDisplay[]; // Ensure JobDisplay[] type
      const newTotalCount = resultHolder.count;

      // Thêm log để debug dữ liệu liên kết
      console.log('[JobsPage] Fetched jobs data:', fetchedData);
      if (fetchedData.length > 0) {
        console.log('Sample job.clients:', fetchedData[0].clients);
        console.log('Sample job.hr_contacts:', fetchedData[0].hr_contacts);
        console.log('Sample job.owner_details:', fetchedData[0].owner_details);
      }

      if (isMounted.current) {
        setJobs(prev => targetPage === 1 ? fetchedData : [...prev, ...fetchedData]);
        setHasMore(fetchedData.length === PAGE_SIZE);
        if (newTotalCount !== undefined && newTotalCount !== null) setTotalCount(newTotalCount);
        lastSuccessfulFetchRef.current = Date.now();
      }
    } catch (err: any) {
      fetchError = err;
      if (err.name === 'AbortError' || err.message?.includes('Aborted')) {
         console.log(`[JobsPage] Fetch operation for page ${targetPage} was aborted: ${err.message}.`);
      } else {
        console.error(`[JobsPage] Critical error during fetchJobs for page ${targetPage}:`, err.message);
        if (isMounted.current) setError(err.message || 'An unknown error occurred');
      }
    } finally {
      isCurrentlyFetching.current = false;
      if (isMounted.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, totalCount, session?.access_token]);

  const loadMoreJobs = useCallback(() => {
    if (!loading && hasMore && !isCurrentlyFetching.current) {
      setPage(prevPage => prevPage + 1);
    }
  }, [loading, hasMore]);

  const handleRefresh = useCallback(() => {
    fetchJobs(true, 1);
  }, [fetchJobs]); // fetchData should be stable now

  // Initial fetch and unmount
  useEffect(() => {
    isMounted.current = true;
    prevPathname.current = location.pathname;
    console.log(`[JobsPage] Component mounted. Path: ${location.pathname}. Fetching initial data.`);
    
    setJobs([]); // Clear previous data on mount/route change
    setPage(1);
    setHasMore(true);
    setError(null);
    setTotalCount(0);
    isCurrentlyFetching.current = false;
    lastSuccessfulFetchRef.current = 0;

    if (mountTimerId.current) clearTimeout(mountTimerId.current);
    mountTimerId.current = setTimeout(() => {
      if (isMounted.current) fetchJobs(true, 1);
    }, 50);

    return () => {
      console.log(`[JobsPage] Component unmounting. Path: ${location.pathname}`);
      if(mountTimerId.current) clearTimeout(mountTimerId.current);
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort('Component unmounted');
        abortControllerRef.current = null;
      }
      if (visibilityDebounceRef.current !== null) window.clearTimeout(visibilityDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Re-fetch if path changes, ensuring it's a "new instance" of the page

  // Fetch on page change (for loadMore)
  useEffect(() => {
    if (page > 1 && isMounted.current) { // Only if page changed beyond initial
      fetchJobs(false, page);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]); // Removed fetchJobs to avoid loop; page is the primary trigger.

  // Visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted.current && location.pathname.includes('/tables/jobs')) { // Check path
        if (visibilityDebounceRef.current !== null) window.clearTimeout(visibilityDebounceRef.current);
        visibilityDebounceRef.current = window.setTimeout(() => {
          if (isMounted.current) fetchJobs(true, 1);
          visibilityDebounceRef.current = null;
        }, 300);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityDebounceRef.current !== null) window.clearTimeout(visibilityDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Removed fetchJobs, depends on pathname for relevance

  // Handle success message from apply flow
  useEffect(() => {
    const state = location.state as { message?: string; type?: string } | null;
    if (state?.message) {
      alert(state.message);
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const handleApplyClick = (jobToApply: JobDisplay) => {
    setSelectedJobForModal(jobToApply);
    setShowApplyModal(true);
  };

  const handleApplyModalClose = () => {
    setShowApplyModal(false);
    setSelectedJobForModal(null);
  };

  const handleAddJob = () => {
    navigate('/tables/jobs/new');
  };

  const handleUpdateJob = (jobId: string) => {
    alert(`Update job function (ID: ${jobId}) will be added later!`);
  };

  const handleExpand = (jobId: string) => {
    if (expandedJobId === jobId) {
      setAnimatingJobId(jobId);
      setTimeout(() => {
        setExpandedJobId(null);
        setAnimatingJobId(null);
      }, 350);
    } else {
      setExpandedJobId(jobId);
      setAnimatingJobId(jobId);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const typedJob = job as JobDisplay;
    const clientName = getClientName(typedJob.clients);
    const ownerName = getOwnerName(typedJob.owner_details);
    const matchesSearch = searchTerm === '' || 
      typedJob.position_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      typedJob.work_location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPhase = selectedPhase === '' || typedJob.phase === selectedPhase;
    if (filterCategory && job.industry_category !== filterCategory) return false;
    if (filterJobType && job.job_category !== filterJobType) return false;
    if (filterLocation && job.work_location !== filterLocation) return false;
    if (filterClient && getClientName(job.clients) !== filterClient) return false;
    if (filterRanking && job.job_rank !== filterRanking) return false;
    return matchesSearch && matchesPhase;
  });

  if (loading && !jobs.length && page === 1) { // Show loading only for initial load
    return <p>Loading jobs...</p>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-red-500">Error loading jobs: {error}</p>
        <button 
          onClick={handleRefresh}
          className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-blue-800 tracking-tight">Open Jobs {totalCount > 0 ? `(${jobs.length}/${totalCount})` : ''}</h1>
      </div>
      <div className="space-y-6">
        {/* Filter UI */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 flex flex-wrap gap-6 items-center">
          <select className="border-2 border-blue-200 rounded-xl px-4 py-3 text-lg font-semibold" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="">Category</option>
            {[...new Set(jobs.map(j => j.industry_category).filter(Boolean))].map(cat => (
              <option key={cat || ''} value={cat || ''}>{cat}</option>
            ))}
          </select>
          <select className="border-2 border-blue-200 rounded-xl px-4 py-3 text-lg font-semibold" value={filterJobType} onChange={e => setFilterJobType(e.target.value)}>
            <option value="">Job Type</option>
            {[...new Set(jobs.map(j => j.job_category).filter(Boolean))].map(type => (
              <option key={type || ''} value={type || ''}>{type}</option>
            ))}
          </select>
          <select className="border-2 border-blue-200 rounded-xl px-4 py-3 text-lg font-semibold" value={filterLocation} onChange={e => setFilterLocation(e.target.value)}>
            <option value="">Location</option>
            {[...new Set(jobs.map(j => j.work_location).filter(Boolean))].map(loc => (
              <option key={loc || ''} value={loc || ''}>{loc}</option>
            ))}
          </select>
          <select className="border-2 border-blue-200 rounded-xl px-4 py-3 text-lg font-semibold" value={filterClient} onChange={e => setFilterClient(e.target.value)}>
            <option value="">Client</option>
            {[...new Set(jobs.map(j => getClientName(j.clients) || '').filter(Boolean))].map(client => (
              <option key={client || ''} value={client || ''}>{client}</option>
            ))}
          </select>
          <select className="border-2 border-blue-200 rounded-xl px-4 py-3 text-lg font-semibold" value={filterRanking} onChange={e => setFilterRanking(e.target.value)}>
            <option value="">Ranking</option>
            {[...new Set(jobs.map(j => j.job_rank).filter(Boolean))].map(rank => (
              <option key={rank || ''} value={rank || ''}>{rank}</option>
            ))}
          </select>
        </div>
            {filteredJobs.map((job) => (
          <div key={job.id} className="bg-white rounded-2xl shadow-lg p-8 mb-8 hover:bg-blue-50 transition">
            {/* Header card */}
            <div className="flex items-center justify-between cursor-pointer mb-2" onClick={() => handleExpand(job.id)}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-extrabold text-2xl text-blue-900">{job.position_title}</span>
                {/* Badge client */}
                {getClientName(job.clients) && (
                  <span className="px-4 py-2 rounded-full bg-purple-100 text-purple-800 text-base font-bold shadow-sm">
                    {getClientName(job.clients)}
                    {getClientWebsite(job.clients) && (
                      <a href={getClientWebsite(job.clients)} target="_blank" rel="noopener noreferrer" className="ml-2 underline text-sm text-purple-700">Website</a>
                    )}
                  </span>
                )}
                {/* Badge HR contact */}
                {getHrContactName(job.hr_contacts) && (
                  <span className="px-4 py-2 rounded-full bg-orange-100 text-orange-800 text-base font-bold shadow-sm">
                    {getHrContactName(job.hr_contacts)}
                      </span>
                )}
                {/* Badge owner */}
                {getOwnerName(job.owner_details) && (
                  <span className="px-4 py-2 rounded-full bg-gray-200 text-gray-800 text-base font-bold shadow-sm">
                    {getOwnerName(job.owner_details)}
                  </span>
                )}
                      {job.industry_category && (
                  <span className="px-4 py-2 rounded-full bg-yellow-100 text-yellow-800 text-base font-bold shadow-sm">{job.industry_category}</span>
                      )}
                      {job.job_category && (
                  <span className="px-4 py-2 rounded-full bg-green-100 text-green-800 text-base font-bold shadow-sm">{job.job_category}</span>
                )}
                {job.work_location && (
                  <span className="px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-base font-bold shadow-sm">{job.work_location}</span>
                )}
                {job.job_rank && (
                  <span className="px-4 py-2 rounded-full bg-pink-100 text-pink-800 text-base font-bold shadow-sm">{job.job_rank}</span>
                )}
              </div>
              <button type="button" tabIndex={-1} className="focus:outline-none">
                <span className={`transform transition-transform text-2xl text-blue-700 ${expandedJobId === job.id ? 'rotate-90' : ''}`}>▶</span>
              </button>
            </div>
            {/* Expand chi tiết với hiệu ứng mượt */}
            <div
              className={`transition-all duration-350 ease-in-out overflow-hidden ${expandedJobId === job.id ? 'max-h-[2000px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'} ${animatingJobId === job.id ? '' : ''}`}
            >
              {expandedJobId === job.id && (
                <div className="mt-6 border-t pt-6 grid grid-cols-1 md:grid-cols-3 gap-10">
                  {/* Cột trái: Description + Requirements */}
                  <div className="md:col-span-2">
                    <h2 className="font-bold text-2xl text-indigo-800 mb-3">Description</h2>
                    <div className="text-lg text-gray-800 whitespace-pre-line">
                      {job.job_summary || 'No description.'}
                    </div>
                    {job.requirements && (
                      <div className="mt-6">
                        <h3 className="font-bold text-xl text-indigo-700 mb-2">Requirements & Skills</h3>
                        <div className="text-lg text-gray-800 whitespace-pre-line">
                          {job.requirements}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Cột phải: Financial + Details + Apply */}
                  <div className="space-y-6">
                    {/* Financial Details Card */}
                    <div className="border-2 border-blue-200 bg-white rounded-2xl shadow-lg p-6 mb-3">
                      <h2 className="font-bold text-xl text-blue-700 mb-3">Financial Details</h2>
                      <div className="text-lg text-gray-800 space-y-2">
                        <div className="flex items-center gap-2 py-1"><span className="text-blue-700 font-semibold">Salary:</span> <span className="text-gray-900 font-bold">{job.min_monthly_salary && job.max_monthly_salary ? `${job.min_monthly_salary} - ${job.max_monthly_salary}` : 'N/A'}</span></div>
                        <div className="flex items-center gap-2 py-1"><span className="text-blue-700 font-semibold">Commission Rate:</span> <span className="text-gray-900 font-bold">{job.bonus ?? 'N/A'}</span></div>
                        <div className="flex items-center gap-2 py-1"><span className="text-blue-700 font-semibold">Contract Rate:</span> <span className="text-gray-900 font-bold">{job.allowance ?? 'N/A'}</span></div>
                        <div className="flex items-center gap-2 py-1"><span className="text-blue-700 font-semibold">Warranty Period:</span> <span className="text-gray-900 font-bold">{job.probation_period ?? 'N/A'}</span></div>
                      </div>
                    </div>
                    {/* Details Card */}
                    <div className="border-2 border-blue-100 bg-white rounded-2xl shadow p-6 mb-3">
                      <div className="flex items-center mb-3">
                        <span className="text-blue-500 mr-2"><svg xmlns='http://www.w3.org/2000/svg' className='inline h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z' /></svg></span>
                        <h2 className="font-bold text-lg text-blue-700">Details</h2>
                      </div>
                      <div className="text-base text-gray-800 space-y-2">
                        <div className="flex justify-between items-center"><span className="font-semibold">Category:</span><span>{job.industry_category ?? 'N/A'}</span></div>
                        <div className="flex justify-between items-center"><span className="font-semibold">Job Type:</span><span>{job.job_category ?? 'N/A'}</span></div>
                        <div className="flex justify-between items-center"><span className="font-semibold">Location:</span><span>{job.work_location ?? 'N/A'}</span></div>
                        <div className="flex justify-between items-center"><span className="font-semibold">Client:</span><span>{getClientName(job.clients) ?? 'N/A'}</span></div>
                        {getClientWebsite(job.clients) && (
                          <div className="flex justify-between items-center"><span className="font-semibold">Client Website:</span><a href={getClientWebsite(job.clients)} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold underline">{getClientWebsite(job.clients)}</a></div>
                        )}
                      </div>
                    </div>
                    {/* Timestamps Card */}
                    <div className="border-2 border-yellow-100 bg-white rounded-2xl shadow p-6 mb-3">
                      <div className="flex items-center mb-3">
                        <span className="text-yellow-500 mr-2"><svg xmlns='http://www.w3.org/2000/svg' className='inline h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15.232 5.232l3.536 3.536M9 13h6m2 2a2 2 0 11-4 0 2 2 0 014 0zm-6 2a2 2 0 11-4 0 2 2 0 014 0zm-2-2a2 2 0 11-4 0 2 2 0 014 0zm2-2a2 2 0 11-4 0 2 2 0 014 0zm2-2a2 2 0 11-4 0 2 2 0 014 0zm2-2a2 2 0 11-4 0 2 2 0 014 0zm2-2a2 2 0 11-4 0 2 2 0 014 0zm2-2a2 2 0 11-4 0 2 2 0 014 0z' /></svg></span>
                        <h2 className="font-bold text-lg text-yellow-700">Timestamps</h2>
                      </div>
                      <div className="text-base text-gray-800 space-y-2">
                        <div className="flex justify-between items-center"><span className="font-semibold">Created:</span><span>{job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'}</span></div>
                        <div className="flex justify-between items-center"><span className="font-semibold">Last Updated:</span><span>{job.updated_at ? new Date(job.updated_at).toLocaleDateString() : (job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A')}</span></div>
                      </div>
                    </div>
                    {/* Nút Apply */}
                    <div>
                      <button
                        onClick={() => handleApplyClick(job)}
                        className="w-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 text-lg shadow-xl transition-transform duration-200 hover:scale-110"
                      >
                        Apply for this job
                      </button>
                    </div>
                  </div>
                </div>
              )}
                </div>
              </div>
            ))}
          </div>
          {hasMore && !loading && (
            <div className="text-center mt-4">
          <button onClick={loadMoreJobs} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" disabled={loading}>
            {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
      )}
      {loading && jobs.length > 0 && page > 1 && (
        <p className="text-center mt-4 text-gray-600">Loading more jobs...</p>
      )}
      {showApplyModal && selectedJobForModal && (
        <ApplyJobModal
          isOpen={showApplyModal}
          onClose={handleApplyModalClose}
          jobId={selectedJobForModal.id}
        />
      )}
    </div>
  );
};

export default JobsPage; 