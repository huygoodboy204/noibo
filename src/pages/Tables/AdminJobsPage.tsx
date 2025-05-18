import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Job, ClientOption, HrContactOption, JobPhase, JobRank, EmploymentType } from '../../types';

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
  const { user, session } = useAuth();
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [clientsForForm, setClientsForForm] = useState<ClientOption[]>([]);
  const [hrContactsForForm, setHrContactsForForm] = useState<HrContactOption[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobDisplayAdmin | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newJob, setNewJob] = useState<NewJobForm>({
    position_title: '',
    client_id: '',
    hr_contact_id: '',
    phase: 'Open',
    job_rank: 'Medium_Priority',
    min_monthly_salary: null,
    max_monthly_salary: null,
    job_summary: null,
    requirements: null,
    work_location: null,
    industry_category: null,
    job_category: null
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
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
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/jobs?select=count`, { method: 'GET', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json', 'Prefer': 'count=exact' }, signal });
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
    try {
      const response = await fetch(url, { method: 'GET', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' }, signal });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageAdminJobs, totalAdminJobsCount, session?.access_token]);

  const loadMoreAdminJobs = useCallback(() => {
    if (!loadingAdminJobs && hasMoreAdminJobs && !isCurrentlyFetchingAdminJobs.current) {
      setPageAdminJobs(p => p + 1);
    }
  }, [loadingAdminJobs, hasMoreAdminJobs]);

  const refreshAdminJobs = useCallback(() => {
    console.log('[AdminJobsPage] Refresh admin jobs...');
    fetchAdminJobs(true, 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fetchAdminJobs is in closure, will use the version from initial render or when session changes if fetchAdminJobs itself is re-memoized

  useEffect(() => { // Mount/unmount for admin jobs list
    isMounted.current = true; 
    prevPathnameAdminJobs.current = location.pathname; 
    console.log(`[AdminJobsPage] Component mounted or path changed: ${location.pathname}. Initializing job list.`);
    setAdminJobsList([]); setPageAdminJobs(1); setHasMoreAdminJobs(true); setErrorAdminJobs(null); setTotalAdminJobsCount(0);
    isCurrentlyFetchingAdminJobs.current = false; lastSuccessfulFetchAdminJobsRef.current = 0;
    if (mountTimerAdminJobsRef.current) clearTimeout(mountTimerAdminJobsRef.current);
    mountTimerAdminJobsRef.current = setTimeout(() => { 
        if (isMounted.current) { 
            console.log('[AdminJobsPage] Mount useEffect: Calling fetchAdminJobs(true, 1)');
            fetchAdminJobs(true, 1); 
        }
    }, 50);
    return () => { 
        if(mountTimerAdminJobsRef.current) clearTimeout(mountTimerAdminJobsRef.current); 
        isMounted.current = false; 
        if (abortControllerAdminJobsRef.current) { abortControllerAdminJobsRef.current.abort('AdminJobsPage unmounted/path changed'); abortControllerAdminJobsRef.current = null; } 
        if (visibilityDebounceAdminJobsRef.current !== null) window.clearTimeout(visibilityDebounceAdminJobsRef.current); 
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Only location.pathname. fetchAdminJobs will be called from closure.

  useEffect(() => { // Page change for admin jobs list
    if (pageAdminJobs > 1 && isMounted.current) {
        console.log(`[AdminJobsPage] Page changed to ${pageAdminJobs}, fetching data.`);
        fetchAdminJobs(false, pageAdminJobs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageAdminJobs]); // Only pageAdminJobs. fetchAdminJobs from closure.

  useEffect(() => { // Visibility change for admin jobs list
    const handleVisibilityChange = () => { 
        if (document.visibilityState === 'visible' && isMounted.current && location.pathname.includes('/admin/jobs')) { 
            if (visibilityDebounceAdminJobsRef.current !== null) window.clearTimeout(visibilityDebounceAdminJobsRef.current); 
            visibilityDebounceAdminJobsRef.current = window.setTimeout(() => { 
                if (isMounted.current) {
                    console.log('[AdminJobsPage] Visibility change: Calling fetchAdminJobs(true, 1)');
                    fetchAdminJobs(true, 1); 
                }
                visibilityDebounceAdminJobsRef.current = null; 
            }, 300); 
        }
    }; 
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => { document.removeEventListener('visibilitychange', handleVisibilityChange); if (visibilityDebounceAdminJobsRef.current !== null) window.clearTimeout(visibilityDebounceAdminJobsRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Only location.pathname. fetchAdminJobs from closure.

  // useEffect to update filterOptions
  useEffect(() => {
    if (adminJobsList.length > 0) {
      const uniqueCategories = [...new Set(adminJobsList.map(job => job.industry_category).filter(Boolean) as string[])];
      const uniqueLocations = [...new Set(adminJobsList.map(job => job.work_location).filter(Boolean) as string[])];
      const uniqueClients = [...new Set(adminJobsList.map(job => getRelationalField(job.clients, 'client_name')).filter(Boolean) as string[])];
      const uniqueRankings = [...new Set(adminJobsList.map(job => job.job_rank).filter(Boolean) as JobRank[])];
      const uniquePhases = [...new Set(adminJobsList.map(job => job.phase).filter(Boolean) as JobPhase[])];
      setFilterOptions(prev => ({
        ...prev,
        categories: uniqueCategories.length > 0 ? uniqueCategories : prev.categories,
        locations: uniqueLocations.length > 0 ? uniqueLocations : prev.locations,
        clients: uniqueClients.length > 0 ? uniqueClients : prev.clients,
        rankings: uniqueRankings.length > 0 ? uniqueRankings : prev.rankings,
        phases: uniquePhases.length > 0 ? uniquePhases : prev.phases
      }));
    }
  }, [adminJobsList]);

  // useEffect to filter jobs
  useEffect(() => {
    if (adminJobsList && adminJobsList.length > 0) { 
      let result = [...adminJobsList];
      if (searchQuery.trim() || filters.category || filters.location || filters.client || filters.ranking || filters.phase) {
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          result = result.filter(job => {
            const clientName = getRelationalField(job.clients, 'client_name');
            return (
            job.position_title?.toLowerCase().includes(query) || 
              clientName?.toLowerCase().includes(query) || 
            job.industry_category?.toLowerCase().includes(query) ||
            job.work_location?.toLowerCase().includes(query)
          );
          });
        }
        if (filters.category) result = result.filter(job => job.industry_category === filters.category);
        if (filters.location) result = result.filter(job => job.work_location === filters.location);
        if (filters.client) result = result.filter(job => getRelationalField(job.clients, 'client_name') === filters.client);
        if (filters.ranking) result = result.filter(job => job.job_rank === filters.ranking);
        if (filters.phase) result = result.filter(job => job.phase === filters.phase);
        }
      setFilteredJobs(result);
    } else {
      setFilteredJobs([]);
    }
  }, [adminJobsList, filters, searchQuery]);

  // Fetch clients for dropdown (keep as is - simple Supabase client fetch)
  const fetchClientsForForm = async () => {
    try {
      const { data, error } = await supabase.from('clients').select('id, client_name').order('client_name');
      if (error) throw error;
      console.log('Fetched clients:', data); // Debug log
      setClientsForForm(data || []);
    } catch (err) {
      console.error('Error fetching clients for form:', err);
    }
  };
  
  // Fetch HR contacts for the selected client (keep as is)
  const fetchHrContactsForForm = async (clientId: string) => {
    if (!clientId) {
      setHrContactsForForm([]);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('hr_contacts')
        .select('id, name, client_id')
        .eq('client_id', clientId)
        .order('name');
        
      if (error) throw error;
      console.log('Fetched hr_contacts:', data); // Debug log
      setHrContactsForForm(data || []);
    } catch (err) {
      console.error('Error fetching hr contacts for form:', err);
    }
  };
  
  // Handle client change in form
  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value;
    setNewJob(prev => ({ ...prev, client_id: clientId, hr_contact_id: '' }));
    fetchHrContactsForForm(clientId);
  };

  const handleAddAdminJob = () => {
    setShowAddModal(true);
    fetchClientsForForm();
  };

  const handleUpdateAdminJob = (jobId: string) => {
    alert(`Update job function (ID: ${jobId}) will be added later!`);
  };

  // Handle input changes in the form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewJob(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user edits it
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle search with debounce
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

  const handleFilterChange = (filterName: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };
  
  // Validate the form
  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    if (!newJob.position_title.trim()) {
      errors.position_title = 'Job title is required';
    }
    if (!newJob.client_id) {
      errors.client_id = 'Client is required';
    }
    if (!newJob.hr_contact_id) {
      errors.hr_contact_id = 'HR contact is required';
    }
    if (!newJob.phase) {
      errors.phase = 'Phase is required';
    }
    if (!newJob.job_rank) {
      errors.job_rank = 'Job rank is required';
    }
    
    return errors;
  };
  
  // Submit new job
  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMounted.current) return;

    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      if (isMounted.current) {
        setFormErrors(errors);
        setIsSubmitting(false);
      }
      return;
    }
    
    if (!isMounted.current) return;
    setIsSubmitting(true);
    setFormErrors({});
    console.log('[AddJob] Submitting job:', newJob);
    console.log('[AddJob] user:', user);
    console.log('[AddJob] supabase:', supabase);
    console.log('[AddJob] session:', session);

    let didTimeout = false;
    const timeoutId = setTimeout(() => {
      didTimeout = true;
      if (isMounted.current) {
        setFormErrors({ submit: 'Request timed out. Please try again.' });
        setIsSubmitting(false);
      }
    }, 7000);

    try {
      console.log('[AddJob] Before insert (REST fetch)...');
      const jobData = {
        position_title: newJob.position_title,
        client_id: newJob.client_id,
        hr_contact_id: newJob.hr_contact_id,
        phase: newJob.phase,
        job_rank: newJob.job_rank,
        min_monthly_salary: newJob.min_monthly_salary,
        max_monthly_salary: newJob.max_monthly_salary,
        job_summary: newJob.job_summary,
        requirements: newJob.requirements,
        work_location: newJob.work_location,
        industry_category: newJob.industry_category,
        job_category: newJob.job_category,
        owner_id: user?.id,
        created_by_id: user?.id
      };
      const res = await fetch('https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/jobs', {
        method: 'POST',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify([jobData])
      });
      clearTimeout(timeoutId);
      if (didTimeout) return;
      const data = await res.json();
      console.log('[AddJob] After insert (REST fetch):', { status: res.status, data });
      if (!isMounted.current) return;
      if (!res.ok) {
        setFormErrors({ submit: data.message || 'Insert failed' });
        setIsSubmitting(false);
        return;
      }
      // Reset form and close modal
      setNewJob({
        position_title: '',
        client_id: '',
        hr_contact_id: '',
        phase: 'Open',
        job_rank: 'Medium_Priority',
        min_monthly_salary: null,
        max_monthly_salary: null,
        job_summary: null,
        requirements: null,
        work_location: null,
        industry_category: null,
        job_category: null
      });
      setFormErrors({});
      setShowAddModal(false);
      // Refresh jobs list
      await fetchAdminJobs(true, 1);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (!isMounted.current) return;
      setFormErrors({ submit: err.message || 'Unknown error' });
      setIsSubmitting(false);
    } finally {
      if (isMounted.current) {
      setIsSubmitting(false);
      }
    }
  };

  const handleJobClick = (job: JobDisplayAdmin) => {
    setSelectedJob(prevSelectedJob => 
      prevSelectedJob && prevSelectedJob.id === job.id 
        ? null 
        : job
    );
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const handleChangeJobPhase = async (jobId: string, newPhase: string) => {
    try {
      const { error } = await supabase.from('jobs').update({ phase: newPhase }).eq('id', jobId);
      if (error) throw error;
      setAdminJobsList(prev => prev.map(j => j.id === jobId ? { ...j, phase: newPhase } : j));
      setFilteredJobs(prev => prev.map(j => j.id === jobId ? { ...j, phase: newPhase } : j));
    } catch (err) {
      alert('Failed to update status!');
    }
  };

  // Đóng modal và reset form khi chuyển route
  useEffect(() => {
    setShowAddModal(false);
    setNewJob({
      position_title: '',
      client_id: '',
      hr_contact_id: '',
      phase: 'Open',
      job_rank: 'Medium_Priority',
      min_monthly_salary: null,
      max_monthly_salary: null,
      job_summary: null,
      requirements: null,
      work_location: null,
      industry_category: null,
      job_category: null
    });
    setFormErrors({});
    setIsSubmitting(false);
  }, [location.pathname]);

  // Thêm hàm test fetch
  const testFetch = async () => {
    try {
      const res = await fetch('https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/jobs?select=*', {
        headers: {
          apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw',
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
        }
      });
      const data = await res.json();
      console.log('Test fetch result:', data);
    } catch (err) {
      console.error('Test fetch error:', err);
    }
  };

  // console.log just before the return statement
  console.log('[AdminJobsPage] Rendering. Loading:', loadingAdminJobs, 'Error:', errorAdminJobs, 'Filtered Jobs Count:', filteredJobs.length, 'AdminJobsList Count:', adminJobsList ? adminJobsList.length : 0, 'Total Count State:', totalAdminJobsCount);

  if (loadingAdminJobs && (!adminJobsList || adminJobsList.length === 0) && pageAdminJobs === 1) { return <p>Loading Jobs...</p>; }
  if (errorAdminJobs) { return ( <div className="container mx-auto p-4 text-center"> <p className="text-red-500">Error loading jobs: {errorAdminJobs}</p> <button onClick={refreshAdminJobs} className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"> Try Again </button> </div> ); }

  return (
    <div className="container mx-auto p-4">
       <h1 className="text-2xl font-bold">
          Admin Jobs {totalAdminJobsCount > 0 ? ` (${adminJobsList ? adminJobsList.length : 0}/${totalAdminJobsCount})` : ''}
        </h1>
      <div className="flex justify-between items-center mb-4">
        <div>
          <button 
            onClick={refreshAdminJobs} 
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
            disabled={loadingAdminJobs}
          >
            {loadingAdminJobs ? 'Refreshing...' : 'Refresh'}
          </button>
          <button 
            onClick={handleAddAdminJob}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Add Job
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      {!selectedJob && (
        <>
          <div className="mb-6">
            <input 
              type="text" 
              className="w-full p-3 border rounded"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>

          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-medium mb-3">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Phase Filter */}
              <select
                className="border rounded px-3 py-2"
                value={filters.phase}
                onChange={e => handleFilterChange('phase', e.target.value)}
              >
                <option value="">All Phases</option>
                {filterOptions.phases.map(phase => (
                  <option key={phase} value={phase}>{PHASE_LABELS[phase]}</option>
                ))}
              </select>
              {/* Rank Filter */}
              <select
                className="border rounded px-3 py-2"
                value={filters.ranking}
                onChange={e => handleFilterChange('ranking', e.target.value)}
              >
                <option value="">All Ranks</option>
                {filterOptions.rankings.map(rank => (
                  <option key={rank} value={rank}>{rank.replace(/_/g, ' ')}</option>
                ))}
              </select>
              {/* Location Filter */}
              <select
                className="border rounded px-3 py-2"
                value={filters.location}
                onChange={e => handleFilterChange('location', e.target.value)}
              >
                <option value="">All Locations</option>
                {filterOptions.locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              {/* Client Filter */}
              <select
                className="border rounded px-3 py-2"
                value={filters.client}
                onChange={e => handleFilterChange('client', e.target.value)}
              >
                <option value="">All Clients</option>
                {filterOptions.clients.map(client => (
                  <option key={client} value={client}>{client}</option>
                ))}
              </select>
              {/* Category Filter */}
              <select
                className="border rounded px-3 py-2"
                value={filters.category}
                onChange={e => handleFilterChange('category', e.target.value)}
              >
                <option value="">All Categories</option>
                {filterOptions.categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      {/* Jobs List */}
      {filteredJobs.length === 0 && !loadingAdminJobs ? (
        <div className="text-center p-4">
          <p>No jobs found.</p>
          <p className="text-sm text-gray-500">Try adjusting your filters or click "Add Job" to create a new one.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-2xl shadow-lg p-8 mb-8 hover:bg-blue-50 transition">
                {/* Header card */}
                <div className="flex items-center justify-between cursor-pointer mb-2" onClick={() => handleJobClick(job)}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-extrabold text-2xl text-blue-900">{job.position_title}</span>
                    {/* Badge client */}
                    {getRelationalField(job.clients, 'client_name') && (
                      <span className="px-4 py-2 rounded-full bg-purple-100 text-purple-800 text-base font-bold shadow-sm">
                        {getRelationalField(job.clients, 'client_name')}
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
                    <span className={`transform transition-transform text-2xl text-blue-700 ${selectedJob && selectedJob.id === job.id ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                </div>
                {/* Expand chi tiết với hiệu ứng mượt */}
                <div className={`transition-all duration-350 ease-in-out overflow-hidden ${selectedJob && selectedJob.id === job.id ? 'max-h-[2000px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}`}>
                  {selectedJob && selectedJob.id === job.id && (
                    <div className="mt-6 border-t pt-6 grid grid-cols-1 md:grid-cols-3 gap-10">
                      {/* Cột trái: Financial Details */}
                      <div className="border-2 border-blue-200 bg-white rounded-2xl shadow-lg p-6 mb-3">
                        <div className="flex items-center mb-3">
                          <span className="text-blue-500 mr-2"><svg xmlns='http://www.w3.org/2000/svg' className='inline h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z' /></svg></span>
                          <h2 className="font-bold text-lg text-blue-700">Financial Details</h2>
                        </div>
                        <div className="text-base text-gray-800 space-y-2">
                          <div className="flex justify-between items-center"><span className="font-semibold">Salary:</span><span>{job.min_monthly_salary && job.max_monthly_salary ? `${job.min_monthly_salary} - ${job.max_monthly_salary}` : 'N/A'}</span></div>
                          <div className="flex justify-between items-center"><span className="font-semibold">Commission Rate:</span><span>{job.bonus ?? 'N/A'}</span></div>
                          <div className="flex justify-between items-center"><span className="font-semibold">Contract Rate:</span><span>{job.allowance ?? 'N/A'}</span></div>
                          <div className="flex justify-between items-center"><span className="font-semibold">Warranty Period:</span><span>{job.probation_period ?? 'N/A'}</span></div>
                        </div>
                      </div>
                      {/* Cột giữa: Details + Dropdown chỉnh status */}
                      <div className="border-2 border-blue-100 bg-white rounded-2xl shadow p-6 mb-3 flex flex-col gap-4">
                        <div className="flex items-center mb-3">
                          <span className="text-blue-500 mr-2"><svg xmlns='http://www.w3.org/2000/svg' className='inline h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z' /></svg></span>
                          <h2 className="font-bold text-lg text-blue-700">Details</h2>
                        </div>
                        <div className="text-base text-gray-800 space-y-2">
                          <div className="flex justify-between items-center"><span className="font-semibold">Category:</span><span>{job.industry_category ?? 'N/A'}</span></div>
                          <div className="flex justify-between items-center"><span className="font-semibold">Job Type:</span><span>{job.job_category ?? 'N/A'}</span></div>
                          <div className="flex justify-between items-center"><span className="font-semibold">Location:</span><span>{job.work_location ?? 'N/A'}</span></div>
                          <div className="flex justify-between items-center"><span className="font-semibold">Client:</span><span>{getRelationalField(job.clients, 'client_name') ?? 'N/A'}</span></div>
                          {getClientWebsite(job.clients) && (
                            <div className="flex justify-between items-center"><span className="font-semibold">Client Website:</span><a href={getClientWebsite(job.clients) || undefined} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold underline">{getClientWebsite(job.clients)}</a></div>
                          )}
                        </div>
                        {/* Dropdown chỉnh status */}
                        <div className="flex justify-between items-center mt-4">
                          <span className="font-semibold text-blue-700">Status:</span>
                          <select
                            className="border-2 border-blue-300 rounded-xl px-4 py-2 text-base font-semibold bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={job.phase || ''}
                            onChange={e => handleChangeJobPhase(job.id, e.target.value)}
                          >
                            {Object.keys(PHASE_LABELS).map(phase => (
                              <option key={phase} value={phase}>{PHASE_LABELS[phase]}</option>
                            ))}
                          </select>
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
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {hasMoreAdminJobs && !loadingAdminJobs && (
            <div className="text-center mt-4">
              <button 
                onClick={loadMoreAdminJobs}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}

      {loadingAdminJobs && adminJobsList && adminJobsList.length > 0 && (
        <p className="text-center mt-4 text-gray-600">Updating jobs list...</p>
      )}

      {/* Add Job Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl"
              onClick={() => setShowAddModal(false)}
              aria-label="Close"
            >×</button>
            <h2 className="text-2xl font-bold mb-6">Add New Job</h2>
            <form onSubmit={handleSubmitJob}>
              {/* Position Title */}
              <div className="mb-4">
                <label className="block font-semibold mb-1">Position Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="position_title"
                  value={newJob.position_title}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
                {formErrors.position_title && <div className="text-red-500 text-sm">{formErrors.position_title}</div>}
              </div>
              {/* Client */}
              <div className="mb-4">
                <label className="block font-semibold mb-1">Client <span className="text-red-500">*</span></label>
                <select
                  name="client_id"
                  value={newJob.client_id}
                  onChange={handleClientChange}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select client...</option>
                  {clientsForForm.map(client => (
                    <option key={client.id} value={client.id}>{client.client_name}</option>
                  ))}
                </select>
                {formErrors.client_id && <div className="text-red-500 text-sm">{formErrors.client_id}</div>}
              </div>
              {/* HR Contact */}
              <div className="mb-4">
                <label className="block font-semibold mb-1">HR Contact <span className="text-red-500">*</span></label>
                <select
                  name="hr_contact_id"
                  value={newJob.hr_contact_id}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select HR contact...</option>
                  {hrContactsForForm.map(hr => (
                    <option key={hr.id} value={hr.id}>{hr.name}</option>
                  ))}
                </select>
                {formErrors.hr_contact_id && <div className="text-red-500 text-sm">{formErrors.hr_contact_id}</div>}
              </div>
              {/* Phase & Rank */}
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Phase <span className="text-red-500">*</span></label>
                  <select
                    name="phase"
                    value={newJob.phase}
                    onChange={handleInputChange}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    {JOB_PHASE_VALUES.map(phase => (
                      <option key={phase} value={phase}>{phase.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  {formErrors.phase && <div className="text-red-500 text-sm">{formErrors.phase}</div>}
                </div>
                <div>
                  <label className="block font-semibold mb-1">Job Rank <span className="text-red-500">*</span></label>
                  <select
                    name="job_rank"
                    value={newJob.job_rank}
                    onChange={handleInputChange}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    {JOB_RANK_VALUES.map(rank => (
                      <option key={rank} value={rank}>{rank.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  {formErrors.job_rank && <div className="text-red-500 text-sm">{formErrors.job_rank}</div>}
                </div>
              </div>
              {/* Salary */}
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Min Monthly Salary</label>
                  <input
                    type="number"
                    name="min_monthly_salary"
                    value={newJob.min_monthly_salary ?? ''}
                    onChange={handleInputChange}
                    className="w-full border rounded px-3 py-2"
                    min={0}
                  />
                  {formErrors.min_monthly_salary && <div className="text-red-500 text-sm">{formErrors.min_monthly_salary}</div>}
                </div>
                <div>
                  <label className="block font-semibold mb-1">Max Monthly Salary</label>
                  <input
                    type="number"
                    name="max_monthly_salary"
                    value={newJob.max_monthly_salary ?? ''}
                    onChange={handleInputChange}
                    className="w-full border rounded px-3 py-2"
                    min={0}
                  />
                </div>
              </div>
              {/* Job Summary */}
              <div className="mb-4">
                <label className="block font-semibold mb-1">Job Summary</label>
                <textarea
                  name="job_summary"
                  value={newJob.job_summary || ''}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="Mô tả công việc, có thể xuống dòng/gạch đầu dòng..."
                />
              </div>
              {/* Requirements */}
              <div className="mb-4">
                <label className="block font-semibold mb-1">Requirements & Skills</label>
                <textarea
                  name="requirements"
                  value={newJob.requirements || ''}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="Yêu cầu, kỹ năng, kinh nghiệm..."
                />
              </div>
              {/* Location, Category, Job Type */}
              <div className="mb-4 grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Location</label>
                  <input
                    type="text"
                    name="work_location"
                    value={newJob.work_location || ''}
                    onChange={handleInputChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Industry Category</label>
                  <input
                    type="text"
                    name="industry_category"
                    value={newJob.industry_category || ''}
                    onChange={handleInputChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Job Category</label>
                  <input
                    type="text"
                    name="job_category"
                    value={newJob.job_category || ''}
                    onChange={handleInputChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Nút test fetch debug */}
      <button onClick={testFetch} className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded mb-4">Test fetch Supabase REST</button>
    </div>
  );
};

export default AdminJobsPage; 