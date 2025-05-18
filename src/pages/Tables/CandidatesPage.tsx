import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Candidate } from '../../types/index';
import EditCandidateModal from './EditCandidateModal';

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
      
      // Build the Supabase REST API URL with proper parameters
      const url = `https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/candidates?select=id,name,date_of_birth,email,linkedin,phase,current_employment_status,cv_link,created_at&order=created_at.desc&offset=${from}&limit=${pageSize}`;
      
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
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          {fromApply ? 'Select Candidate to Apply' : `Candidates${totalCount > 0 ? ` (${candidates.length}/${totalCount})` : ''}`}
        </h1>
        <div>
          <button 
            onClick={handleRefresh} 
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button 
            onClick={handleAddCandidate}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Add Candidate
          </button>
        </div>
      </div>
      
      {candidates.length === 0 && !loading ? (
        <div className="text-center p-4">
          <p>No candidates found.</p>
          <p className="text-sm text-gray-500">Click "Add Candidate" to get started or "Refresh" to try loading again.</p>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {candidates.map((candidate) => (
              <li key={candidate.id} className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-blue-600 hover:text-blue-800 cursor-pointer" onClick={() => navigate(`/tables/candidates/view/${candidate.id}`)}>{candidate.name}</h2>
                    {candidate.current_employment_status && <p className="text-md text-gray-700">{candidate.current_employment_status}</p>}
                    {candidate.email && <p className="text-sm text-gray-600">Email: {candidate.email}</p>}
                    {candidate.phase && <p className="text-sm font-medium"><span className={`px-2 py-1 text-xs rounded-full ${candidate.phase === 'New_Lead' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{String(candidate.phase).replace(/_/g, ' ')}</span></p>}
                  </div>
                  <div className="flex gap-2">
                    {fromApply ? (
                      <button 
                        onClick={() => handleApplyWithCandidate(candidate.id)}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm self-start"
                      >
                        Apply with this Candidate
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleUpdateCandidate(candidate.id)}
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm self-start"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
                {candidate.linkedin && <p className="text-sm text-gray-500 mt-1">LinkedIn: <a href={candidate.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{candidate.linkedin}</a></p>}
                {candidate.cv_link && <p className="text-sm text-gray-500 mt-1">CV: <a href={candidate.cv_link} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">{candidate.cv_link}</a></p>}
                {candidate.date_of_birth && <p className="text-sm text-gray-500">Date of Birth: {candidate.date_of_birth}</p>}
              </li>
            ))}
          </ul>
          
          {hasMore && !loading && (
            <div className="text-center mt-4">
              <button 
                onClick={loadMoreCandidates}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}
      {loading && candidates.length > 0 && <p className="text-center mt-4 text-gray-600">Updating candidates list...</p>}
      {editingCandidate && (
        (console.log('[DEBUG] Render EditCandidateModal', editingCandidate),
        <EditCandidateModal
          candidate={editingCandidate}
          onClose={handleCloseEditModal}
          onSave={handleSaveEditCandidate}
        />)
      )}
    </div>
  );
};

export default CandidatesPage; 