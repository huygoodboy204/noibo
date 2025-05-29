import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Job, ClientOption, HrContactOption, JobPhase, JobRank, EmploymentType } from '../../types/index';

// Constants for fetching, mirroring JobsPage
const PAGE_SIZE = 20;
const TIMEOUT_DURATION = 5000; // 5 seconds
const SUPABASE_URL = 'https://dqnjtkbxtscjikalkajq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw';

// Select query for admin jobs - CLEANED UP
const ADMIN_JOBS_SELECT_QUERY = "id,position_title,phase,job_rank,min_monthly_salary,max_monthly_salary,min_annual_salary,max_annual_salary,clients(id,client_name),hr_contacts(id,name),owner_details:owner_id(id,full_name),work_location,mrt_station,industry_category,job_category,report_to,english_level,other_languages,visa_support,working_hours,insurance,bonus,allowance,probation_period,annual_leave,sick_leave,created_at";
const ADMIN_JOBS_ORDER_BY_COLUMN = 'created_at';
const ADMIN_JOBS_ORDER_BY_ASCENDING = false;

// Interfaces for joined data (can be kept or moved to a shared location if identical to JobsPage)
interface ClientInfoAdmin { id: string; client_name: string | null; website_url?: string | null; }
interface HrContactInfoAdmin { id: string; name: string | null; }
interface UserInfoAdmin { id: string; full_name: string | null; }

// Helper function to safely get a property from a potentially single object or first element of an array
const getRelationalField = <T, K extends keyof T>(
  relation: T | T[] | null | undefined,
  field: K
): T[K] | null | undefined => {
  if (!relation) return null;
  const targetObject = Array.isArray(relation) ? relation[0] : relation;
  return targetObject ? targetObject[field] : undefined; // Return undefined if field not on targetObject
};

// Local interface for Admin Job data - adjust based on actual needs and if Supabase returns arrays for relations
interface JobDisplayAdmin {
  id: string;
  position_title?: string;
  clients: ClientInfoAdmin | ClientInfoAdmin[] | null;
  hr_contacts: HrContactInfoAdmin | HrContactInfoAdmin[] | null;
  owner_details: UserInfoAdmin | UserInfoAdmin[] | null;
  phase?: string; 
  job_rank?: string; 
  min_monthly_salary?: number;
  max_monthly_salary?: number;
  // ... other fields from ADMIN_JOBS_SELECT_QUERY ...
  work_location?: string; 
  mrt_station?: string; 
  industry_category?: string; 
  job_category?: string; 
  report_to?: string; 
  english_level?: string; 
  other_languages?: string[]; 
  visa_support?: boolean; 
  working_hours?: string; 
  insurance?: string; 
  bonus?: string; 
  allowance?: string; 
  probation_period?: string; 
  annual_leave?: string; 
  sick_leave?: string; 
  created_at?: string;
  updated_at?: string;
  // Fields from original JobDisplay in AdminJobsPage, ensure they are in selectQuery or handled
  min_annual_salary?: number;
  max_annual_salary?: number;
  priority?: string; 
  status?: string; // Note: selectQuery uses 'phase'. If 'status' is different, it needs to be fetched or derived.
  location?: string; // Note: selectQuery uses 'work_location'.
  job_type?: EmploymentType | string;
  category?: string; // Note: selectQuery uses 'industry_category' and 'job_category'. Clarify which 'category' this is.
  job_summary?: string; 
  requirements?: string; 
  isExpanded?: boolean; 
}

// Filter interface
interface FilterOptions {
  category: string;
  jobType: string;
  location: string;
  client: string;
  ranking: string;
  phase: string;
}

// Interface for a new job form
interface NewJobForm {
  position_title: string;
  client_id: string;
  hr_contact_id: string;
  phase: JobPhase;
  job_rank: JobRank;
  min_monthly_salary: number | null;
  max_monthly_salary: number | null;
  job_summary: string | null;
  requirements: string | null;
  work_location: string | null;
  industry_category: string | null;
  job_category: string | null;
}

// Filter options type
interface FilterOptionsState {
  categories: string[];
  jobTypes: EmploymentType[];
  locations: string[];
  clients: string[];
  rankings: JobRank[];
  phases: JobPhase[];
}

// Job phase enum type
type job_phase_enum = 'Open' | 'Sourcing' | 'Interviewing' | 'Offer_Extended' | 'Filled' | 'On_Hold' | 'Cancelled';

// Job rank enum type
type job_rank_enum = 'High_Priority' | 'Medium_Priority' | 'Low_Priority';

// Define constants for enum-like types if not using actual enums
const JOB_PHASE_VALUES: JobPhase[] = ['Open', 'Sourcing', 'Interviewing', 'Offer_Extended', 'Filled', 'On_Hold', 'Cancelled'];
const JOB_RANK_VALUES: JobRank[] = ['High_Priority', 'Medium_Priority', 'Low_Priority'];
const EMPLOYMENT_TYPE_VALUES: EmploymentType[] = ['Full_Time_Permanent', 'Part_Time_Permanent', 'Contract', 'Temporary', 'Internship', 'Freelance'];

// Helper lấy phase label
const PHASE_LABELS: Record<string, string> = {
  Open: 'Open',
  Sourcing: 'Sourcing',
  Interviewing: 'Interviewing',
  Offer_Extended: 'Offer Extended',
  Filled: 'Filled',
  On_Hold: 'On Hold',
  Cancelled: 'Cancelled',
};

// Helper lấy website_url từ clients (object hoặc array)
const getClientWebsite = (clients: ClientInfoAdmin | ClientInfoAdmin[] | null | undefined) => {
  if (!clients) return null;
  if (Array.isArray(clients)) return clients[0]?.website_url || null;
  return clients.website_url || null;
};

const AdminJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session, isAuthenticated, userRole, loading: authLoading } = useAuth();
  const searchDebounceRef = useRef<number | null>(null);

  // State for fetched admin jobs list
  const [adminJobsList, setAdminJobsList] = useState<JobDisplayAdmin[]>([]);
  const [loadingAdminJobs, setLoadingAdminJobs] = useState<boolean>(true);
  const [errorAdminJobs, setErrorAdminJobs] = useState<string | null>(null);
  const [pageAdminJobs, setPageAdminJobs] = useState<number>(1);
  const [hasMoreAdminJobs, setHasMoreAdminJobs] = useState<boolean>(true);
  const [totalAdminJobsCount, setTotalAdminJobsCount] = useState<number>(0);

  // Refs for fetch lifecycle management
  const isMounted = useRef(true);
  const isCurrentlyFetchingAdminJobs = useRef(false);
  const abortControllerAdminJobsRef = useRef<AbortController | null>(null);
  const lastSuccessfulFetchAdminJobsRef = useRef<number>(0);
  const visibilityDebounceAdminJobsRef = useRef<number | null>(null);
  const prevPathnameAdminJobs = useRef<string>('');
  const mountTimerAdminJobsRef = useRef<NodeJS.Timeout | null>(null);

  // Existing state from AdminJobsPage (modal, forms, filters etc.)
  const [filteredJobs, setFilteredJobs] = useState<JobDisplayAdmin[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobDisplayAdmin | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    category: '',
    jobType: '',
    location: '',
    client: '',
    ranking: '',
    phase: ''
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptionsState>({
    categories: ['Information Technology', 'Marketing', 'Sales', 'HR', 'Finance'],
    jobTypes: [...EMPLOYMENT_TYPE_VALUES],
    locations: ['Hà Nội', 'Đà Nẵng', 'TP HCM', 'Remote'],
    clients: ['Internal IT', 'Data Team', 'External Client'],
    rankings: [...JOB_RANK_VALUES],
    phases: [...JOB_PHASE_VALUES]
  });

  // --- START: Fetch logic for Admin Jobs List (adapted from JobsPage/CandidatesPage) ---
  const fetchTotalAdminJobsCount = useCallback(async (signal?: AbortSignal) => {
    console.log('[AdminJobsPage] Fetching total admin jobs count...');
    if (!isMounted.current || signal?.aborted) return 0;
    let countVal = 0;
    const accessToken = session?.access_token || '';
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/jobs?select=count`, { method: 'GET', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Prefer': 'count=exact' }, signal });
      if (response.ok) {
        const countData = await response.json();
        countVal = Array.isArray(countData) && countData.length > 0 && typeof countData[0].count === 'number' ? countData[0].count : (Array.isArray(countData) && countData.length > 0 && typeof countData[0].count === 'string' ? parseInt(countData[0].count, 10) : 0);
        if (isMounted.current) setTotalAdminJobsCount(countVal);
        return countVal;
      }
    } catch (err:any) { if (err.name === 'AbortError') console.log('[AdminJobsPage] Count fetch aborted.'); else console.warn('[AdminJobsPage] Direct count fetch error, falling back:', err.message); }
    try {
      let query = supabase.from('jobs').select('*', { count: 'exact', head: true });
      if (signal) query = query.abortSignal(signal);
      const { count: supabaseCount, error: supabaseError } = await query;
      if (supabaseError) return countVal;
      countVal = supabaseCount || 0;
      if (isMounted.current && supabaseCount !== null) setTotalAdminJobsCount(countVal);
      return countVal;
    } catch (err:any) { return countVal; }
  }, [session?.access_token]);

  const directFetchAdminJobs = useCallback(async (signal: AbortSignal, currentPage: number): Promise<{ data: JobDisplayAdmin[] | null, error: Error | null }> => {
    const from = (currentPage - 1) * PAGE_SIZE;
    let url = `${SUPABASE_URL}/rest/v1/jobs?select=${encodeURIComponent(ADMIN_JOBS_SELECT_QUERY)}`;
    url += `&order=${ADMIN_JOBS_ORDER_BY_COLUMN}.${ADMIN_JOBS_ORDER_BY_ASCENDING ? 'asc' : 'desc'}`;
    url += `&offset=${from}&limit=${PAGE_SIZE}`;
    const accessToken = session?.access_token || '';
    const timeoutDuration = 10000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error(`Query timed out after ${timeoutDuration}ms`));
      }, timeoutDuration);
    });
    try {
      const response = await Promise.race([
        fetch(url, { method: 'GET', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, signal }),
        timeoutPromise
      ]);
      if (!response.ok) { const errorBody = await response.text(); throw new Error(`Direct fetch for admin jobs failed: ${response.status} - ${errorBody}`); }
      const fetchedData = await response.json();
      return { data: fetchedData as JobDisplayAdmin[], error: null };
    } catch (err: any) { 
      if (err.name === 'AbortError') return { data: null, error: new Error('Request aborted') };
      return { data: null, error: err instanceof Error ? err : new Error(String(err.message || 'Direct fetch admin jobs failed')) };
    }
  }, [session?.access_token]);

  const fetchAdminJobs = useCallback(async (forceFetch = false, requestedPageOverride?: number) => {
    let fetchError: Error | null = null;
    const targetPage = requestedPageOverride ?? (forceFetch ? 1 : pageAdminJobs);
    if (!isMounted.current || (!forceFetch && isCurrentlyFetchingAdminJobs.current) || 
        (!forceFetch && lastSuccessfulFetchAdminJobsRef.current > 0 && (Date.now() - lastSuccessfulFetchAdminJobsRef.current < 2000))) {
      return;
    }
    if (abortControllerAdminJobsRef.current) abortControllerAdminJobsRef.current.abort('New fetch for admin jobs');
    abortControllerAdminJobsRef.current = new AbortController();
    const signal = abortControllerAdminJobsRef.current.signal;
    isCurrentlyFetchingAdminJobs.current = true; setLoadingAdminJobs(true); setErrorAdminJobs(null);
    if (forceFetch && pageAdminJobs !== 1) setPageAdminJobs(1);
    else if (requestedPageOverride && pageAdminJobs !== requestedPageOverride) setPageAdminJobs(requestedPageOverride);

    try {
      if (forceFetch || totalAdminJobsCount === 0) await fetchTotalAdminJobsCount(signal);
      if (signal.aborted) throw new DOMException('Aborted count fetch admin jobs', 'AbortError');
      const from = (targetPage - 1) * PAGE_SIZE;
      const timeoutPromise = new Promise<never>((_, reject) => { const id = setTimeout(() => { clearTimeout(id); reject(new Error(`Query for admin jobs (page ${targetPage}) timed out`)); }, TIMEOUT_DURATION); });
      let resultHolder: { data: JobDisplayAdmin[] | null; error: Error | null; count?: number | null } = { data: null, error: null };
      try {
        resultHolder = await Promise.race([directFetchAdminJobs(signal, targetPage), timeoutPromise]);
      } catch (directErr: any) { resultHolder = { data: null, error: new Error(String(directErr.message || directErr)) }; }
      if (signal.aborted) throw new DOMException('Aborted direct fetch admin jobs', 'AbortError');
      if (!resultHolder.data || resultHolder.error) {
        if (resultHolder.error?.name === 'AbortError') throw resultHolder.error;
        let lastSbError: Error | null = null;
        try {
            if (signal.aborted) throw new DOMException('Aborted before Supabase fallback admin jobs', 'AbortError');
            const query = supabase.from('jobs').select(ADMIN_JOBS_SELECT_QUERY, { count: 'exact' }).order(ADMIN_JOBS_ORDER_BY_COLUMN, { ascending: ADMIN_JOBS_ORDER_BY_ASCENDING }).range(from, from + PAGE_SIZE - 1).abortSignal(signal);
            const { data: sbData, error: sbError, count: sbCount } = await Promise.race([query, timeoutPromise]);
            if (sbError) { lastSbError = new Error(sbError.message || 'Supabase client query failed for admin jobs'); if ((sbError as any).name === 'AbortError' || sbError.message.includes('aborted')) lastSbError = new DOMException(sbError.message, 'AbortError'); throw lastSbError; }
            resultHolder = { data: sbData as JobDisplayAdmin[], error: null, count: sbCount };
        } catch (retryErr: any) { lastSbError = retryErr; if (lastSbError?.name === 'AbortError') throw lastSbError; throw lastSbError || new Error('Supabase fallback failed for admin jobs'); }
      }
      if (signal.aborted) throw new DOMException('Aborted all fetch attempts admin jobs', 'AbortError');
      if (!resultHolder.data || resultHolder.error) throw resultHolder.error || new Error(`Failed to fetch admin jobs (page ${targetPage})`);
      
      const fetchedData = resultHolder.data as JobDisplayAdmin[];
      console.log('[AdminJobsPage] fetchAdminJobs - Fetched Data (raw):', fetchedData);
      if (fetchedData && fetchedData.length > 0) {
        console.log('[AdminJobsPage] fetchAdminJobs - First job raw data:', JSON.parse(JSON.stringify(fetchedData[0])));
        console.log('[AdminJobsPage] fetchAdminJobs - First job clients field:', fetchedData[0].clients);
        console.log('[AdminJobsPage] fetchAdminJobs - First job hr_contacts field:', fetchedData[0].hr_contacts);
        console.log('[AdminJobsPage] fetchAdminJobs - First job owner_details field:', fetchedData[0].owner_details);
      }

      const newTotalCount = resultHolder.count;
      if (isMounted.current) {
        setAdminJobsList(prev => targetPage === 1 ? fetchedData : [...prev, ...fetchedData]);
        setHasMoreAdminJobs(fetchedData.length === PAGE_SIZE);
        if (newTotalCount !== undefined && newTotalCount !== null) setTotalAdminJobsCount(newTotalCount);
        lastSuccessfulFetchAdminJobsRef.current = Date.now();
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('Aborted')) console.log(`[AdminJobsPage] Fetch aborted: ${err.message}.`);
      else if (isMounted.current) setErrorAdminJobs(err.message || 'Unknown error fetching admin jobs');
    } finally {
      isCurrentlyFetchingAdminJobs.current = false;
      if (isMounted.current) setLoadingAdminJobs(false);
    }
  }, [pageAdminJobs, totalAdminJobsCount, session?.access_token, directFetchAdminJobs]);

  const loadMoreAdminJobs = useCallback(() => {
    if (!loadingAdminJobs && hasMoreAdminJobs && !isCurrentlyFetchingAdminJobs.current) {
      setPageAdminJobs(p => p + 1);
    }
  }, [loadingAdminJobs, hasMoreAdminJobs]);

  const refreshAdminJobs = useCallback(() => {
    setPageAdminJobs(1);
    fetchAdminJobs(true, 1);
  }, [fetchAdminJobs]);

  useEffect(() => {
    if (hasMoreAdminJobs) {
      fetchAdminJobs();
    }
  }, [pageAdminJobs, fetchAdminJobs, hasMoreAdminJobs]);

  useEffect(() => {
    if (session?.access_token) {
      fetchTotalAdminJobsCount();
    }
  }, [session?.access_token, fetchTotalAdminJobsCount]);

  useEffect(() => {
    if (location.pathname.includes('/admin/jobs')) {
            if (visibilityDebounceAdminJobsRef.current !== null) window.clearTimeout(visibilityDebounceAdminJobsRef.current); 
            visibilityDebounceAdminJobsRef.current = window.setTimeout(() => { 
                if (isMounted.current) {
                    console.log('[AdminJobsPage] Visibility change: Calling fetchAdminJobs(true, 1)');
                    fetchAdminJobs(true, 1); 
                }
                visibilityDebounceAdminJobsRef.current = null; 
            }, 300); 
        }
  }, [location.pathname, fetchAdminJobs]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
    }
    };
  }, []);

  useEffect(() => {
    let currentJobs = [...adminJobsList];
    if (searchQuery) {
      currentJobs = currentJobs.filter(job => 
        job.position_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getRelationalField(job.clients, 'client_name')?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filters.category) {
      currentJobs = currentJobs.filter(job => job.industry_category === filters.category);
        }
    if (filters.jobType) {
      currentJobs = currentJobs.filter(job => job.job_type === filters.jobType);
    }
    if (filters.location) {
      currentJobs = currentJobs.filter(job => job.work_location === filters.location);
    }
    if (filters.client) {
      currentJobs = currentJobs.filter(job => {
        const clientName = getRelationalField(job.clients, 'client_name');
        return clientName === filters.client;
      });
    }
    if (filters.ranking) {
      currentJobs = currentJobs.filter(job => job.job_rank === filters.ranking);
    }
    if (filters.phase) {
      currentJobs = currentJobs.filter(job => job.phase === filters.phase);
        }
    setFilteredJobs(currentJobs);
  }, [adminJobsList, filters, searchQuery]);

  const handleFilterChange = (filterName: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleJobClick = (job: JobDisplayAdmin) => {
    setSelectedJob(prevSelectedJob => 
      prevSelectedJob && prevSelectedJob.id === job.id 
        ? null 
        : job
    );
  };

  const handleUpdateAdminJob = async (jobId: string, newPhase: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ phase: newPhase })
        .eq('id', jobId);
      if (error) throw error;
      // Cập nhật lại UI (state)
      setAdminJobsList(prev => prev ? prev.map(job => job.id === jobId ? { ...job, phase: newPhase } : job) : prev);
      setSelectedJob(prev => prev && prev.id === jobId ? { ...prev, phase: newPhase } : prev);
      // Fetch lại danh sách job để đồng bộ dữ liệu
      fetchAdminJobs(true, 1);
      alert('Cập nhật trạng thái thành công!');
    } catch (err: any) {
      alert('Cập nhật trạng thái thất bại: ' + (err.message || err));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // setNewJob(prev => ({ ...prev, [name]: value })); 
    // if (formErrors[name]) { ... }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = window.setTimeout(() => {
      setSearchQuery(value);
      searchDebounceRef.current = null;
    }, 300);
  };

  console.log('[AdminJobsPage] Rendering. Loading:', loadingAdminJobs, 'Error:', errorAdminJobs, 'Filtered Jobs Count:', filteredJobs.length, 'AdminJobsList Count:', adminJobsList ? adminJobsList.length : 0, 'Total Count State:', totalAdminJobsCount);

  if (loadingAdminJobs && (!adminJobsList || adminJobsList.length === 0) && pageAdminJobs === 1) { return <p>Loading Jobs...</p>; }
  if (errorAdminJobs) { return ( <div className="container mx-auto p-4 text-center"> <p className="text-red-500">Error loading jobs: {errorAdminJobs}</p> <button onClick={refreshAdminJobs} className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"> Try Again </button> </div> ); }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header lớn */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-800 tracking-tight mb-1">Admin Jobs {totalAdminJobsCount > 0 ? `(${adminJobsList.length}/${totalAdminJobsCount})` : ''}</h1>
          <div className="flex gap-2 flex-wrap">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">Tổng: {totalAdminJobsCount}</span>
            {/* Có thể thêm badge phase, ranking tổng quan ở đây */}
          </div>
        </div>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow"
          onClick={() => navigate('/tables/jobs/add')}
        >
          + Tạo Job mới
        </button>
      </div>

      {/* Filter hiện đại */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4 items-center">
            <input 
              type="text" 
          placeholder="Tìm kiếm vị trí, client..."
          className="border rounded px-3 py-2 w-56"
              value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <select className="border rounded px-2 py-2" value={filters.phase} onChange={e => setFilters(f => ({...f, phase: e.target.value}))}>
          <option value="">Tất cả trạng thái</option>
          {filterOptions.phases.map(phase => <option key={phase} value={phase}>{phase}</option>)}
              </select>
        <select className="border rounded px-2 py-2" value={filters.ranking} onChange={e => setFilters(f => ({...f, ranking: e.target.value}))}>
          <option value="">Tất cả ranking</option>
          {filterOptions.rankings.map(rank => <option key={rank} value={rank}>{rank}</option>)}
              </select>
        <select className="border rounded px-2 py-2" value={filters.client} onChange={e => setFilters(f => ({...f, client: e.target.value}))}>
          <option value="">Tất cả client</option>
          {filterOptions.clients.map(client => <option key={client} value={client}>{client}</option>)}
              </select>
        {/* Thêm các filter khác nếu muốn */}
      </div>

      {/* Danh sách job dạng card đẹp */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredJobs.map(job => (
          <div
            key={job.id}
            className="bg-white rounded-xl shadow-lg p-5 hover:shadow-2xl transition-shadow border border-gray-100 relative group"
              >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-blue-700 truncate max-w-[70%]">{job.position_title}</h2>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${job.phase === 'Open' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{job.phase}</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {job.job_rank && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">{job.job_rank}</span>}
              {job.priority && <span className="bg-pink-100 text-pink-700 text-xs px-2 py-0.5 rounded">{job.priority}</span>}
              {getRelationalField(job.clients, 'client_name') && <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded">{getRelationalField(job.clients, 'client_name')}</span>}
              {job.work_location && <span className="bg-gray-50 text-gray-700 text-xs px-2 py-0.5 rounded">{job.work_location}</span>}
            </div>
            <div className="text-sm text-gray-600 mb-2">Lương: {job.min_monthly_salary} - {job.max_monthly_salary} triệu</div>
            <div className="text-xs text-gray-400 mb-2">Ngày tạo: {job.created_at ? new Date(job.created_at).toLocaleDateString('vi-VN') : ''}</div>
            {/* Expand chi tiết */}
            <button
              className="text-blue-500 hover:underline text-xs mb-2"
              onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
            >
              {selectedJob?.id === job.id ? 'Ẩn chi tiết' : 'Xem chi tiết'}
            </button>
            {selectedJob?.id === job.id && (
              <div className="mt-2 border-t pt-2 text-sm text-gray-700 space-y-1 animate-fade-in">
                <div><b>Tóm tắt:</b> {job.job_summary || 'Không có'}</div>
                <div><b>Yêu cầu:</b> {job.requirements || 'Không có'}</div>
                <div><b>HR Contact:</b> {getRelationalField(job.hr_contacts, 'name') || 'Không có'}</div>
                <div><b>Owner:</b> {getRelationalField(job.owner_details, 'full_name') || 'Không có'}</div>
                {/* Thêm các trường khác nếu muốn */}
              </div>
            )}
            {/* Nút chỉnh status */}
            <div className="flex gap-2 mt-3">
                <select
                className="border rounded px-2 py-1 text-xs"
                value={job.phase}
                onChange={e => handleUpdateAdminJob(job.id, e.target.value)}
              >
                {filterOptions.phases.map(phase => <option key={phase} value={phase}>{phase}</option>)}
                  </select>
                <button
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-1 rounded"
                onClick={() => navigate(`/admin/jobs/detail/${job.id}`)}
                >
                Xem chi tiết</button>
              </div>
          </div>
        ))}
        </div>
      {/* Loading, error, empty state */}
      {loadingAdminJobs && <div className="text-center py-8 text-blue-600 font-semibold">Đang tải danh sách job...</div>}
      {!loadingAdminJobs && filteredJobs.length === 0 && <div className="text-center py-8 text-gray-500">Không có job nào phù hợp.</div>}
      {errorAdminJobs && <div className="text-center py-8 text-red-500">{errorAdminJobs}</div>}
    </div>
  );
};

export default AdminJobsPage; 