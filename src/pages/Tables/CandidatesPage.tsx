import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Candidate } from '../../types/index';
import EditCandidateModal from './EditCandidateModal';

// ENUM values from DB schema
const CANDIDATE_PHASE_OPTIONS = ['New_Lead', 'Contacted', 'Screening', 'Qualified', 'Submitted_To_Client', 'Interview_Process', 'Offer_Stage', 'Placed', 'Archived_Not_Suitable', 'Archived_Not_Interested'];
const CANDIDATE_RANK_OPTIONS = ['Hot', 'Warm', 'Cold', 'A_List', 'B_List'];
const VISA_STATUS_OPTIONS = ['Citizen', 'Permanent_Resident', 'Work_Permit_Holder', 'Dependent_Pass_Holder', 'Student_Pass_Holder', 'Requires_Sponsorship', 'Not_Applicable'];

// Test Supabase connection directly
const testSupabaseConnection = async (signal?: AbortSignal) => {
  try {
    console.log('[ConnectionTest] Testing direct connection to Supabase...');
    const controller = signal ? undefined : new AbortController();
    const requestSignal = signal || controller?.signal;
    
    const response = await fetch('https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/candidates?select=count', {
      method: 'GET',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw',
        'Content-Type': 'application/json'
      },
      signal: requestSignal
    });
    
    const status = response.status;
    const text = await response.text();
    console.log(`[ConnectionTest] Direct connection result: status=${status}, response=${text}`);
    return { status, text };
  } catch (error: unknown) {
    // Don't log error if it's an abort
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('[ConnectionTest] Connection test aborted');
      return { status: 'aborted', text: 'Request aborted' };
    }
    
    console.error('[ConnectionTest] Direct connection failed:', error);
    return { status: 'error', text: error instanceof Error ? error.toString() : String(error) };
  }
};

// Định nghĩa type mở rộng cho candidate có owner
interface CandidateWithOwner extends Candidate {
  owner?: {
    full_name?: string;
    email?: string;
  };
}

const CandidatesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();

  // Local state for candidates data, loading, and error
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const PAGE_SIZE = 20;
  
  // Track if the component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  // Track if we've already fetched data to prevent duplicate fetches
  const hasFetched = useRef(false);
  // Track if we're currently in the process of fetching
  const isCurrentlyFetching = useRef(false);
  // Store the previous pathname to detect actual navigation to this component
  const prevPathname = useRef<string>('');
  // AbortController reference for cancellation of in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);
  // Debounce timer for visibility changes
  const visibilityDebounceRef = useRef<number | null>(null);
  // Keep track of navigation state
  const isNavigatingRef = useRef(false);
  // Last successful fetch timestamp
  const lastSuccessfulFetchRef = useRef<number>(0);
  // Counter for visibility changes
  const visibilityChangeCountRef = useRef<number>(0);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);

  // Check if we're coming from the Apply Job flow
  const { fromApply, jobId } = location.state || {};

  // Filter state
  const [filterOwner, setFilterOwner] = useState('');
  const [filterEmploymentStatus, setFilterEmploymentStatus] = useState('');
  const [filterExperiencedJob, setFilterExperiencedJob] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');

  // Debugging function
  const debugSupabase = async () => {
    if (!supabase) {
      console.error('[CandidatesPage] DEBUG: supabase client is undefined');
      return;
    }
    
    try {
      // Log only what's safe to access in the Supabase client
      console.log('[CandidatesPage] DEBUG: Supabase client available:', !!supabase);
      console.log('[CandidatesPage] DEBUG: Supabase from method exists:', typeof supabase.from === 'function');
      console.log('[CandidatesPage] DEBUG: Supabase auth exists:', !!supabase.auth);
      console.log('[CandidatesPage] DEBUG: Supabase auth session:', !!session);
      
      // Test a simple table exists query
      console.log('[CandidatesPage] DEBUG: Testing simple query to get schema info...');
      try {
        const { data, error } = await supabase.from('candidates').select('count').limit(1);
        console.log('[CandidatesPage] DEBUG: Simple query result:', { data, error });
        if (error) {
          console.error('[CandidatesPage] DEBUG: Simple query error:', error);
        }
      } catch (error) {
        console.error('[CandidatesPage] DEBUG: Simple query error:', error);
      }
    } catch (err) {
      console.error('[CandidatesPage] DEBUG: Error inspecting supabase client:', err);
    }
  };

  // Function to get total count of candidates
  const fetchTotalCount = async (signal?: AbortSignal) => {
    try {
      console.log('[CandidatesPage] Fetching total count...');
      
      if (!isMounted.current) {
        console.log('[CandidatesPage] Component not mounted during count fetch, aborting');
        return 0;
      }
      
      // Check if signal is already aborted
      if (signal?.aborted) {
        console.log('[CandidatesPage] Count fetch aborted before execution');
        return 0;
      }
      
      if (!supabase) {
        console.error('[CandidatesPage] CRITICAL: supabase client is undefined!');
        throw new Error('Supabase client is undefined');
      }
      
      // Using a separate direct fetch for count to bypass any potential Supabase client issues
      try {
        console.log('[CandidatesPage] Trying direct fetch for count...');
        const response = await fetch('https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/candidates?select=count', {
          method: 'GET',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          signal: signal
        });
        
        if (response.ok) {
          const countData = await response.json();
          const count = Array.isArray(countData) && countData.length > 0 ? parseInt(countData[0].count, 10) : 0;
          console.log(`[CandidatesPage] Direct count fetch result: ${count}`);
          
          if (isMounted.current) {
            setTotalCount(count);
          }
          return count;
        }
      } catch (err) {
        console.log('[CandidatesPage] Direct count fetch failed, falling back to Supabase client');
      }
      
      // Fallback to using the Supabase client
      const { count, error } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.error('[CandidatesPage] Error fetching count:', error);
        return 0;
      }
      
      console.log(`[CandidatesPage] Total count: ${count}`);
      if (isMounted.current) {
        setTotalCount(count || 0);
      }
      return count || 0;
    } catch (err) {
      // Check if this is an abort error
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('[CandidatesPage] Count fetch aborted');
        return 0;
      }
      
      console.error('[CandidatesPage] Error getting count:', err);
      return 0;
    }
  };

  // Simple, direct fetch for candidates that bypasses Supabase client
  const directFetchCandidates = async (signal?: AbortSignal, page = 1, pageSize = PAGE_SIZE) => {
    try {
      console.log(`[CandidatesPage] Attempting direct fetch for candidates (page ${page})...`);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      // Lấy tất cả các trường cần thiết (hoặc dùng * nếu muốn lấy hết)
      const url = `https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/candidates?select=*,owner:owner_id(full_name,email)&order=created_at.desc&offset=${from}&limit=${pageSize}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        signal: signal
      });
      if (!response.ok) {
        throw new Error(`Direct fetch failed with status: ${response.status}`);
      }
      const data = await response.json();
      console.log(`[CandidatesPage] Direct fetch success, got ${data.length} candidates`);
      return { data, error: null };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('[CandidatesPage] Direct fetch aborted');
        return { data: null, error: new Error('Request aborted') };
      }
      console.error('[CandidatesPage] Direct fetch error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  // Function to fetch candidates
  const fetchCandidates = async (forceFetch = false) => {
    let fetchError: Error | null = null;
    
    try {
      console.log('[CandidatesPage] fetchCandidates called, forceFetch:', forceFetch);
      
      if (!isMounted.current) {
        console.log('[CandidatesPage] Component not mounted, skipping fetch');
        return;
      }
      
      // Always fetch if forcing, otherwise check conditions
      if (!forceFetch) {
        if (isCurrentlyFetching.current) {
          console.log('[CandidatesPage] Already fetching, skipping');
          return;
        }

        // Check if we've just had a successful fetch (within last 2 seconds)
        const now = Date.now();
        if (lastSuccessfulFetchRef.current > 0 && (now - lastSuccessfulFetchRef.current < 2000)) {
          console.log('[CandidatesPage] Skipping fetch, too soon after last successful fetch');
          return;
        }
      }

      // Cancel any previous request
      if (abortControllerRef.current) {
        console.log('[CandidatesPage] Cancelling previous request');
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Mark that we're currently fetching
      isCurrentlyFetching.current = true;
      setLoading(true);
      setError(null);

      // If forcing fetch, reset to page 1
      if (forceFetch) {
        setPage(1);
      }

      // Get total count first
      if (forceFetch || totalCount === 0) {
        await fetchTotalCount(signal);
      }

      // Calculate range for pagination
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Setup timeout
      const timeoutDuration = 5000;
      const timeout = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error(`Query timed out after ${timeoutDuration}ms`));
        }, timeoutDuration);
      });

      // Try direct fetch first, then fall back to Supabase client if needed
      let result;
      try {
        console.log('[CandidatesPage] Attempting direct fetch...');
        result = await Promise.race([
          directFetchCandidates(signal, page),
          timeout
        ]);
      } catch (directError) {
        console.log('[CandidatesPage] Direct fetch failed, falling back to Supabase client');
        // Fall back to Supabase client with retries
        const maxRetries = 3;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`[CandidatesPage] Supabase client attempt ${attempt}/${maxRetries}`);
            result = await Promise.race([
              supabase
                .from('candidates')
                .select('id, name, date_of_birth, email, linkedin, phase, current_employment_status, cv_link, created_at')
                .order('created_at', { ascending: false })
                .range(from, to),
              timeout
            ]);
            break;
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (signal.aborted || attempt === maxRetries) {
              throw lastError;
            }
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }

      // Ensure result is defined before destructuring
      if (typeof result === 'undefined') {
        // This should ideally not happen if the logic is correct and all paths assign to result or throw.
        console.error('[CandidatesPage] Internal error: result is undefined before processing.');
        throw new Error('Internal error: Failed to get data fetching result.');
      }

      const { data, error: supabaseError } = result;

      if (supabaseError) {
        throw supabaseError;
      }

      if (!data) {
        throw new Error('No data received from server');
      }

      if (isMounted.current) {
        if (forceFetch) {
          setCandidates(data);
        } else {
          setCandidates(prev => page === 1 ? data : [...prev, ...data]);
        }
        
        setHasMore(data.length === PAGE_SIZE);
        hasFetched.current = true;
        lastSuccessfulFetchRef.current = Date.now();
      }
    } catch (err: any) {
      fetchError = err;
      if (err.name === 'AbortError' || err.message === 'Query aborted') {
        console.log('[CandidatesPage] Request was aborted, skipping error handling');
        return;
      }

      console.error("[CandidatesPage] Error during fetch:", err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : String(err));
        if (page === 1) {
          setCandidates([]);
        }
      }
    } finally {
      if (isMounted.current && (!fetchError || (fetchError.name !== 'AbortError' && fetchError.message !== 'Query aborted'))) {
        setLoading(false);
      }
      isCurrentlyFetching.current = false;
    }
  };

  // Load more candidates when user clicks "Load More"
  const loadMoreCandidates = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prevPage => prevPage + 1);
    }
  }, [loading, hasMore]);

  // Watch for page changes to load more data
  useEffect(() => {
    if (page > 1) {
      fetchCandidates();
    }
  }, [page]);

  // Add visibility change listener to force fetch when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && location.pathname === '/tables/candidates') {
        console.log('[CandidatesPage] Page/tab became visible while on candidates tab');
        
        // Increment visibility change counter
        visibilityChangeCountRef.current += 1;
        
        // Clear any existing debounce timer
        if (visibilityDebounceRef.current !== null) {
          window.clearTimeout(visibilityDebounceRef.current);
        }
        
        // Debounce the visibility change to prevent multiple rapid calls
        visibilityDebounceRef.current = window.setTimeout(() => {
          console.log('[CandidatesPage] Executing debounced force fetch after visibility change');
          fetchCandidates(true);
          visibilityDebounceRef.current = null;
        }, 500); // Increased to 500ms
      }
    };

    // Add event listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      // Remove event listener on cleanup
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Clear any existing debounce timer
      if (visibilityDebounceRef.current !== null) {
        window.clearTimeout(visibilityDebounceRef.current);
        visibilityDebounceRef.current = null;
      }
    };
  }, [location.pathname]);

  // Force fetch when location changes AND it's a new navigation to this page (not just a state update)
  useEffect(() => {
    if (isMounted.current && location.pathname === '/tables/candidates') {
      // If we're coming from a different path (not just app initialization)
      if (prevPathname.current && prevPathname.current !== location.pathname) {
        console.log(`[CandidatesPage] Tab clicked/navigated to. Previous path: ${prevPathname.current}, Current: ${location.pathname}`);
        
        // Mark that we are navigating
        isNavigatingRef.current = true;
        
        // Schedule force fetch with a small delay to allow any unmount operations to complete
        setTimeout(() => {
          // Only execute if we're still mounted
          if (isMounted.current) {
            fetchCandidates(true);
            isNavigatingRef.current = false;
          }
        }, 200); // Increased from 100ms
      }
      // Update previous pathname
      prevPathname.current = location.pathname;
    }
  }, [location]);

  // Run once on component mount
  useEffect(() => {
    console.log(`[CandidatesPage] Component mounted. Path: ${location.pathname}`);
    
    // Reset our ref flags
    isMounted.current = true;
    hasFetched.current = false;
    isCurrentlyFetching.current = false;
    isNavigatingRef.current = false;
    visibilityChangeCountRef.current = 0;
    lastSuccessfulFetchRef.current = 0;
    
    // Debug supabase on mount
    debugSupabase();
    
    // Important: Fetch with a small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      console.log('[CandidatesPage] Executing fetchCandidates after mount');
      fetchCandidates();
    }, 100);
    
    // Cleanup on unmount
    return () => {
      console.log('[CandidatesPage] Component unmounting - cleaning up resources');
      clearTimeout(timer);
      
      // Clear any visibility debounce timer
      if (visibilityDebounceRef.current !== null) {
        window.clearTimeout(visibilityDebounceRef.current);
        visibilityDebounceRef.current = null;
      }
      
      isMounted.current = false;
      
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        console.log('[CandidatesPage] Aborting any in-flight requests on unmount');
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [location.pathname]);
  
  const handleAddCandidate = () => {
    navigate('/tables/candidates/new');
  };

  const handleUpdateCandidate = (candidateId: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    console.log('[DEBUG] handleUpdateCandidate', { candidateId, candidate });
    if (candidate) setEditingCandidate(candidate);
    else console.warn('[DEBUG] Không tìm thấy candidate với id:', candidateId);
  };

  const handleCloseEditModal = () => setEditingCandidate(null);

  const handleSaveEditCandidate = (updated: Candidate) => {
    setCandidates(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    setEditingCandidate(null);
  };
  
  // Function to manually refresh data on user request
  const handleRefresh = () => {
    console.log('[CandidatesPage] Manual refresh requested');
    fetchCandidates(true); // Force fetch from server
  };

  // Check for network connectivity issues
  useEffect(() => {
    const handleOnline = () => {
      console.log('[CandidatesPage] Browser is online, refreshing data');
      fetchCandidates(true);
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleApplyWithCandidate = async (candidateId: string) => {
    try {
      setLoading(true);

      if (!session?.user?.id) {
        throw new Error('User not authenticated');
      }
      
      // Lấy thông tin job để có client_id và hr_contact_id
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('client_id, hr_contact_id')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;

      // Tạo process mới (job application)
      const { data: processData, error: processError } = await supabase
        .from('processes')
        .insert([
          {
            candidate_id: candidateId,
            job_id: jobId,
            client_id: jobData.client_id,
            hr_contact_id: jobData.hr_contact_id,
            process_status: 'APPLIED',
            status_update_date: new Date().toISOString(),
            process_memo: 'Applied through job listing',
            created_by_id: session.user.id,
            owner_id: session.user.id
          }
        ])
        .select()
        .single();

      if (processError) throw processError;

      // Redirect back to the job page with success message
      navigate('/jobs', {
        state: { 
          message: 'Application submitted successfully!',
          type: 'success'
        }
      });
    } catch (error) {
      console.error('Error applying for job:', error);
      setError('Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  // Hàm clear filter
  const handleClearFilters = () => {
    setFilterOwner('');
    setFilterEmploymentStatus('');
    setFilterExperiencedJob('');
    setMinSalary('');
    setMaxSalary('');
  };

  // Hàm apply filter (nếu có logic filter cũ thì giữ nguyên, nếu không thì chỉ set lại state để re-render)
  const handleApplyFilters = () => {
    // Nếu filter thực sự fetch lại từ server thì gọi fetchCandidates();
    // Nếu chỉ filter trên client thì không cần làm gì, vì filteredCandidates sẽ tự động cập nhật
  };

  // Hàm xóa ứng viên (gọi API Supabase trước khi xoá ở UI)
  const handleDeleteCandidate = async (candidateId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ứng viên này?')) return;
    try {
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', candidateId);
      if (error) {
        alert('Xoá ứng viên thất bại: ' + error.message);
        return;
      }
      setCandidates(prev => prev.filter(c => c.id !== candidateId));
    } catch (err: any) {
      alert('Có lỗi xảy ra khi xoá ứng viên: ' + (err.message || err));
    }
  };

  // Filter candidates theo các filter đã chọn (chỉ dùng property có thật trong Candidate)
  const filteredCandidates = (candidates as CandidateWithOwner[]).filter(candidate => {
    // Nếu đang ở chế độ apply job, chỉ lấy candidate do user hiện tại tạo
    if (fromApply && jobId && candidate.owner_id !== session?.user?.id) return false;
    // Lọc lương
    const salary = candidate.expected_monthly_salary || 0;
    const min = minSalary ? parseFloat(minSalary) : null;
    const max = maxSalary ? parseFloat(maxSalary) : null;
    const salaryOk = (!min || salary >= min) && (!max || salary <= max);
    // Lọc theo owner name/email
    const ownerName = (candidate.owner && candidate.owner.full_name) ? candidate.owner.full_name : '';
    const ownerEmail = (candidate.owner && candidate.owner.email) ? candidate.owner.email : '';
    const ownerOk = !filterOwner || ownerName.toLowerCase().includes(filterOwner.toLowerCase()) || ownerEmail.toLowerCase().includes(filterOwner.toLowerCase());
    // Lọc experienced_job: chỉ cần 1 mục trong list chứa từ khoá
    let experiencedJobOk = true;
    if (filterExperiencedJob) {
      let jobs: string[] = [];
      if (candidate.experienced_job) {
        try {
          const arr = JSON.parse(candidate.experienced_job);
          if (Array.isArray(arr)) jobs = arr.map(j => String(j));
          else jobs = [String(candidate.experienced_job)];
        } catch {
          jobs = [String(candidate.experienced_job)];
        }
      }
      experiencedJobOk = jobs.some(j => j.toLowerCase().includes(filterExperiencedJob.toLowerCase()));
    }
    return (
      ownerOk &&
      (!filterEmploymentStatus || (candidate.current_employment_status || '').toLowerCase().includes(filterEmploymentStatus.toLowerCase())) &&
      experiencedJobOk &&
      salaryOk
    );
  });

  if (loading && !candidates.length) { 
    return <p>Loading candidates...</p>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-red-500">Error loading candidates: {error}</p>
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
    <main id="contentCandidates" className="main-content-section flex-1 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-slate-800">Danh sách Ứng viên <span className="text-sky-600">({totalCount})</span></h1>
          {fromApply && jobId && (
            <div className="bg-pink-50 text-pink-700 px-4 py-2 rounded-full text-sm font-medium border border-pink-100">
              <i className="fas fa-paper-plane mr-2"></i>
              Đang chọn ứng viên cho job
            </div>
          )}
        </div>
        <button
          onClick={handleAddCandidate}
          className="mt-3 sm:mt-0 bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-lg transition-colors duration-150"
        >
          <i className="fas fa-user-plus"></i> Thêm ứng viên
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-slate-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Người sở hữu (Tên hoặc Email)</label>
            <input className="filter-select w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-sky-400" value={filterOwner} onChange={e => setFilterOwner(e.target.value)} placeholder="Tên hoặc email người sở hữu" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tình trạng công việc hiện tại</label>
            <input className="filter-select w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-sky-400" value={filterEmploymentStatus} onChange={e => setFilterEmploymentStatus(e.target.value)} placeholder="Nhập tình trạng công việc" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Kinh nghiệm công việc</label>
            <input className="filter-select w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-sky-400" value={filterExperiencedJob} onChange={e => setFilterExperiencedJob(e.target.value)} placeholder="Nhập từ khoá kinh nghiệm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Lương mong muốn (từ)</label>
            <input className="filter-select w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-sky-400" type="number" value={minSalary} onChange={e => setMinSalary(e.target.value)} placeholder="Tối thiểu" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Lương mong muốn (đến)</label>
            <input className="filter-select w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-sky-400" type="number" value={maxSalary} onChange={e => setMaxSalary(e.target.value)} placeholder="Tối đa" />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 justify-end">
          <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors duration-150" onClick={handleClearFilters}>
            <i className="fas fa-times-circle"></i> Xóa bộ lọc
          </button>
          <button className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-150" onClick={handleApplyFilters}>
            <i className="fas fa-filter"></i> Áp dụng
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {filteredCandidates.map(candidate => (
          <div key={candidate.id} className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100 hover:shadow-xl transition-shadow duration-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{candidate.name}</h3>
                <p className="text-slate-500">{candidate.email}</p>
              </div>
              {fromApply && jobId ? (
                <button
                  onClick={() => handleApplyWithCandidate(candidate.id)}
                  disabled={loading}
                  className="bg-gradient-to-r from-pink-500 to-pink-400 hover:from-pink-600 hover:to-pink-500 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i>
                      <span>Ứng tuyển</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateCandidate(candidate.id)}
                    className="text-sky-600 hover:text-sky-700"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    onClick={() => handleDeleteCandidate(candidate.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2 text-sm mb-4 flex-grow">
              <p className="text-slate-600 flex items-center gap-2"><i className="fas fa-envelope w-4 text-slate-400"></i>{candidate.email}</p>
              <p className="text-slate-600 flex items-center gap-2"><i className="fas fa-graduation-cap w-4 text-slate-400"></i>{candidate.highest_education || ''}</p>
              <p className="text-slate-600 flex items-center gap-2"><i className="fas fa-briefcase w-4 text-slate-400"></i>{(() => {
                if (!candidate.experienced_job) return '';
                try {
                  const arr = JSON.parse(candidate.experienced_job);
                  if (Array.isArray(arr)) return arr.join(', ');
                  return candidate.experienced_job;
                } catch {
                  return candidate.experienced_job;
                }
              })()}</p>
              {candidate.linkedin && <p className="text-slate-600 flex items-center gap-2"><i className="fab fa-linkedin w-4 text-slate-400"></i><a href={candidate.linkedin} className="hover:underline">LinkedIn</a></p>}
              {candidate.cv_link && <p className="text-slate-600 flex items-center gap-2"><i className="fas fa-file-alt w-4 text-slate-400"></i><a href={candidate.cv_link} className="hover:underline">Xem CV</a></p>}
            </div>
            <div className="pt-4 border-t border-slate-200 flex justify-between items-center mt-auto">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold shadow-sm">{candidate.phase}</span>
            </div>
          </div>
        ))}
      </div>
      {editingCandidate && (
        <EditCandidateModal
          candidate={editingCandidate as any}
          onClose={handleCloseEditModal}
          onSave={handleSaveEditCandidate as any}
        />
      )}
    </main>
  );
};

export default CandidatesPage; 