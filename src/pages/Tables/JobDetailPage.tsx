import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-toastify';
import ApplyJobModal from '../../components/modals/ApplyJobModal';
import { useAuth } from '../../contexts/AuthContext';

const JobDetailPage: React.FC = () => {
  const { id: jobId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Auth context
  const { isAuthenticated, userRole, loading: authLoading, session } = useAuth();

  // Refs for managing fetch lifecycle
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMounted = useRef(true);
  const lastFetchRef = useRef<number>(0);
  const isNavigatingRef = useRef(false);
  const prevPathname = useRef<string>('');
  const isFirstLoad = useRef(true);
  const visibilityDebounceRef = useRef<number | null>(null);

  // Function to fetch job data with retry and timeout
  const fetchJob = async (forceFetch = false) => {
    if (!jobId) {
      setError('Không tìm thấy ID công việc.');
      setLoading(false);
      return;
    }

    try {
      // Check if fetch is too soon after last successful fetch
      const now = Date.now();
      if (!forceFetch && lastFetchRef.current > 0 && (now - lastFetchRef.current < 2000)) {
        console.log('[JobDetailPage] Skipping fetch, too soon after last fetch');
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        console.log('[JobDetailPage] Cancelling previous request');
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setLoading(true);
      setError(null);

      // Setup timeout (tăng lên 10s)
      const timeoutDuration = 10000;
      const timeout = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error(`Query timed out after ${timeoutDuration}ms`));
        }, timeoutDuration);
      });

      // Lấy access token mới nhất từ session
      const accessToken = session?.access_token || '';

      // Try direct fetch first
      let result;
      let fetched = false;
      try {
        console.log('[JobDetailPage] Attempting direct fetch...');
        const response = await Promise.race([
          fetch(`https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/jobs?id=eq.${jobId}&select=*,clients(id,client_name,website_url),owner_details:owner_id(id,full_name,email),hr_contacts(id,name,email_1)`, {
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            signal
          }),
          timeout
        ]);

        if (!response.ok) throw new Error('Failed to fetch job');
        result = await response.json();
        if (Array.isArray(result)) {
          result = result[0] || null;
        }
        if (result) {
          fetched = true;
        }
      } catch (err) {
        console.log('[JobDetailPage] Direct fetch failed, will try fallback if needed');
      }

      // Nếu direct fetch không ra kết quả, fallback sang Supabase client
      if (!fetched) {
        try {
          console.log('[JobDetailPage] Fallback to Supabase client...');
          const { data, error } = await Promise.race([
            supabase
              .from('jobs')
              .select('*,clients(id,client_name,website_url),owner_details:owner_id(id,full_name,email),hr_contacts(id,name,email_1)')
              .eq('id', jobId)
              .single(),
            timeout
          ]);
          if (error) throw error;
          result = data;
        } catch (error) {
          console.log('[JobDetailPage] Fallback fetch error:', error);
        }
      }

      if (isMounted.current) {
        setJob(result);
        lastFetchRef.current = Date.now();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[JobDetailPage] Request was aborted');
        return;
      }

      console.error('[JobDetailPage] Error fetching job:', err);
      if (isMounted.current) {
        setError(err.message || 'Không lấy được thông tin job');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // Effect chính để fetch dữ liệu (chỉ fetch khi Auth đã sẵn sàng)
  useEffect(() => {
    isMounted.current = true;
    lastFetchRef.current = 0;
    if (!authLoading && isAuthenticated && userRole) {
      if (isFirstLoad.current) {
        console.log('[JobDetailPage] First load, delaying fetch');
        isFirstLoad.current = false;
        setTimeout(() => {
          fetchJob(true);
        }, 100);
      } else {
        fetchJob(true);
      }
    }
    return () => {
      console.log('[JobDetailPage] Cleaning up...');
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (visibilityDebounceRef.current !== null) {
        window.clearTimeout(visibilityDebounceRef.current);
        visibilityDebounceRef.current = null;
      }
    };
  }, [jobId, authLoading, isAuthenticated, userRole]);

  // Effect để xử lý visibility change (chỉ fetch khi Auth đã sẵn sàng)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !authLoading && isAuthenticated && userRole) {
        console.log('[JobDetailPage] Page became visible');
        if (visibilityDebounceRef.current !== null) {
          window.clearTimeout(visibilityDebounceRef.current);
        }
        // Delay 300ms trước khi fetch lại
        visibilityDebounceRef.current = window.setTimeout(() => {
          console.log('[JobDetailPage] Executing debounced fetch after visibility change');
          fetchJob(true);
          visibilityDebounceRef.current = null;
        }, 300);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityDebounceRef.current !== null) {
        window.clearTimeout(visibilityDebounceRef.current);
        visibilityDebounceRef.current = null;
      }
    };
  }, [authLoading, isAuthenticated, userRole]);

  // Effect để xử lý navigation
  useEffect(() => {
    if (location.pathname !== prevPathname.current) {
      console.log(`[JobDetailPage] Navigation detected. Previous: ${prevPathname.current}, Current: ${location.pathname}`);
      isNavigatingRef.current = true;
      prevPathname.current = location.pathname;

      // Reset navigation flag after a delay
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 300);
    }
  }, [location.pathname]);

  // Effect để check admin status
  useEffect(() => {
    const isFromAdminPage = location.pathname.includes('/admin/');
    setIsAdmin(isFromAdminPage);
  }, [location.pathname]);

  const handleDeleteJob = async () => {
    if (!jobId) return;
    
    if (window.confirm('Bạn có chắc chắn muốn xóa job này?')) {
      try {
        const { error } = await supabase
          .from('jobs')
          .delete()
          .eq('id', jobId);

        if (error) throw error;

        toast.success('Xóa job thành công!');
        navigate('/admin/jobs');
      } catch (error) {
        console.error('Error deleting job:', error);
        toast.error('Có lỗi xảy ra khi xóa job!');
      }
    }
  };

  const handleEditJob = () => {
    if (!jobId) return;
    navigate(`/admin/jobs/edit/${jobId}`);
  };

  if (loading) return <div className="text-center py-10">Đang tải thông tin công việc...</div>;
  if (error) return <div className="text-center text-red-500 py-10">{error}</div>;
  if (!job) return <div className="text-center text-red-500 py-10">Không tìm thấy công việc</div>;

  // Helper lấy thành phố
  const extractCity = (address: string | null | undefined) => {
    if (!address) return '';
    const parts = address.split(',').map(s => s.trim());
    return parts.length > 1 ? parts[parts.length - 1] : address;
  };

  return (
    <div className="min-h-screen bg-white font-outfit">
      {/* Header mới */}
      <header className="w-full py-10 px-2 bg-white flex flex-col items-center gap-4 border-b border-gray-100">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight text-center mb-2 leading-tight">{job.position_title}</h1>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          <span className="flex items-center gap-2 bg-pink-50 text-pink-600 px-4 py-1.5 rounded-full font-semibold text-base border border-pink-100"><i className="fas fa-dollar-sign"></i> {job.max_monthly_salary ? `Up to ${job.max_monthly_salary}M` : 'Negotiable'}</span>
          <span className="flex items-center gap-2 bg-blue-light-50 text-blue-600 px-4 py-1.5 rounded-full font-semibold text-base border border-blue-light-100"><i className="fas fa-map-marker-alt"></i> {extractCity(job.work_location)}</span>
          {job.clients && job.clients[0]?.client_name && <span className="flex items-center gap-2 bg-gray-50 text-gray-700 px-4 py-1.5 rounded-full font-semibold text-base border border-gray-200"><i className="fas fa-building"></i> {job.clients[0].client_name}</span>}
          {job.industry_category && <span className="flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-1.5 rounded-full font-semibold text-base border border-orange-100"><i className="fas fa-briefcase"></i> {job.industry_category}</span>}
          {job.job_category && <span className="flex items-center gap-2 bg-purple-50 text-purple-600 px-4 py-1.5 rounded-full font-semibold text-base border border-purple-100"><i className="fas fa-clock"></i> {job.job_category}</span>}
          {job.phase && <span className="flex items-center gap-2 bg-pink-100 text-pink-700 px-4 py-1.5 rounded-full font-semibold text-sm border border-pink-200"><i className="fas fa-flag"></i> {job.phase}</span>}
        </div>
      </header>
      {/* Main content mới */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 mt-12 px-4">
        {/* Cột trái: mô tả, yêu cầu, quyền lợi */}
        <section className="md:col-span-2 flex flex-col gap-10">
          <div className="bg-white rounded-3xl shadow-md p-10 border border-gray-100 flex flex-col gap-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 text-xl"><i className="fas fa-info-circle"></i></div>
                <h2 className="text-2xl font-bold text-gray-900">Mô tả công việc</h2>
              </div>
              <div className="text-gray-800 whitespace-pre-line leading-relaxed text-lg">{job.job_summary || job.description || 'Không có mô tả.'}</div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-light-50 flex items-center justify-center text-blue-500 text-xl"><i className="fas fa-list-check"></i></div>
                <h2 className="text-2xl font-bold text-gray-900">Yêu cầu ứng viên</h2>
              </div>
              <div className="text-gray-800 whitespace-pre-line leading-relaxed text-lg">{job.requirements || 'Không có yêu cầu.'}</div>
            </div>
          </div>
          {/* Card quyền lợi nếu có */}
          {job.benefits && (
            <div className="bg-white rounded-3xl shadow-md p-10 border border-gray-100 flex flex-col gap-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500 text-xl"><i className="fas fa-gift"></i></div>
                <h2 className="text-2xl font-bold text-gray-900">Quyền lợi</h2>
              </div>
              <div className="text-gray-800 whitespace-pre-line leading-relaxed text-lg">{job.benefits}</div>
            </div>
          )}
        </section>
        {/* Cột phải: card apply, info, trạng thái */}
        <aside className="flex flex-col gap-8">
          <div className="bg-gradient-to-br from-pink-50 to-blue-light-50 rounded-3xl shadow-xl p-10 flex flex-col gap-6 items-center border border-pink-100">
            <div className="w-20 h-20 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 text-4xl mb-2 shadow"><i className="fas fa-paper-plane"></i></div>
            <div className="flex flex-col gap-2 w-full">
              <button 
                onClick={() => setIsApplyModalOpen(true)}
                className="w-full bg-gradient-to-r from-pink-500 to-pink-400 text-white font-bold py-4 rounded-full shadow-lg hover:scale-105 transition text-center text-xl flex items-center justify-center gap-2"
              >
                <i className="fas fa-paper-plane"></i> Ứng tuyển ngay
              </button>
              {isAdmin && (
                <>
                  <button 
                    onClick={handleEditJob}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-400 text-white font-bold py-4 rounded-full shadow-lg hover:scale-105 transition text-center text-xl flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-edit"></i> Chỉnh sửa
                  </button>
                  <button 
                    onClick={handleDeleteJob}
                    className="w-full bg-gradient-to-r from-red-500 to-red-400 text-white font-bold py-4 rounded-full shadow-lg hover:scale-105 transition text-center text-xl flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-trash"></i> Xóa
                  </button>
                </>
              )}
            </div>
            <div className="w-full flex flex-col gap-3 mt-4">
              <div className="flex items-center gap-2 text-gray-700 text-base"><i className="fas fa-user-tie text-pink-400"></i> <span className="font-semibold">Chủ job:</span> {job.owner_details?.full_name || 'N/A'}</div>
              {job.owner_details?.email && <div className="flex items-center gap-2 text-gray-700 text-base"><i className="fas fa-envelope text-blue-400"></i> <span className="font-semibold">Email:</span> {job.owner_details.email}</div>}
              {job.clients && job.clients[0]?.website_url && <div className="flex items-center gap-2 text-gray-700 text-base"><i className="fas fa-globe-asia text-green-400"></i> <span className="font-semibold">Website:</span> <a href={job.clients[0].website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-bold">{job.clients[0].website_url}</a></div>}
              {job.hr_contacts && job.hr_contacts[0]?.name && <div className="flex items-center gap-2 text-gray-700 text-base"><i className="fas fa-user text-purple-400"></i> <span className="font-semibold">HR liên hệ:</span> {job.hr_contacts[0].name}</div>}
            </div>
          </div>
          <div className="bg-white rounded-3xl shadow p-6 flex flex-col gap-3 text-sm text-gray-500 border border-gray-100">
            <div className="flex items-center gap-2"><i className="fas fa-calendar-plus text-pink-300"></i> Ngày tạo: <span className="font-semibold text-gray-700">{job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'}</span></div>
            <div className="flex items-center gap-2"><i className="fas fa-calendar-check text-blue-300"></i> Cập nhật: <span className="font-semibold text-gray-700">{job.updated_at ? new Date(job.updated_at).toLocaleDateString() : 'N/A'}</span></div>
            {job.job_rank && <div className="flex items-center gap-2"><i className="fas fa-star text-yellow-400"></i> Ưu tiên: <span className="font-semibold text-pink-600">{job.job_rank.replace(/_/g, ' ')}</span></div>}
            {job.visa_support && <div className="flex items-center gap-2"><i className="fas fa-passport text-pink-400"></i> Hỗ trợ visa: <span className="font-semibold text-pink-600">{job.visa_support ? 'Có' : 'Không'}</span></div>}
          </div>
        </aside>
      </main>

      {isApplyModalOpen && (
        <ApplyJobModal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          jobId={jobId || ''}
          jobTitle={job?.position_title}
        />
      )}
    </div>
  );
};

export default JobDetailPage; 