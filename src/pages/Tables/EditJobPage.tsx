import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useData, TableName } from '../../contexts/DataContext';
import { Job, Client } from '../../types/index'; 

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
// import '../../styles/editor.css'; // Đảm bảo bạn có file CSS này hoặc style trong index.css

interface JobFormData {
  id?: string; // Thêm id cho edit
  title: string;
  client_id: string; 
  description?: string;
  status?: 'Open' | 'Closed' | 'On_Hold' | 'Draft'; 
  job_type?: 'Full_Time' | 'Part_Time' | 'Contract' | 'Temporary' | 'Internship';
  salary_min?: number | string; 
  salary_max?: number | string;
  currency?: string;
  location?: string;
  required_skills?: string; 
  experience_level?: string;
  department?: string;
  application_deadline?: string; 
  notes?: string;
  hr_contact_id?: string;
}

interface ClientLookup {
  id: string;
  client_name: string;
}

const JOB_STATUS_OPTIONS: NonNullable<JobFormData['status']>[] = ['Open', 'Closed', 'On_Hold', 'Draft'];
const JOB_TYPE_OPTIONS: NonNullable<JobFormData['job_type']>[] = ['Full_Time', 'Part_Time', 'Contract', 'Temporary', 'Internship'];

// Basic Editor Toolbar Component (Tương tự như trong AddJobPage)
const MenuBar: React.FC<{ editor: Editor | null }> = ({ editor }) => {
  if (!editor) return null;
  return (
    <div className="menu-bar bg-gray-100 p-2 rounded-t-md border border-gray-300 flex flex-wrap gap-1">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''}>Bold</button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''}>Italic</button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'is-active' : ''}>Strike</button>
      <button type="button" onClick={() => editor.chain().focus().setHardBreak().run()}>New Line</button>
      <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>Undo</button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>Redo</button>
    </div>
  );
};

const JobDetailPage: React.FC = () => {
  const { id: jobId } = useParams<{ id: string }>();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, userRole, loading: authLoading, session } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMounted = useRef(true);
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) {
        setError('Không tìm thấy ID công việc.');
        setLoading(false);
        return;
      }
      try {
        // Check if fetch is too soon after last successful fetch
        const now = Date.now();
        if (lastFetchRef.current > 0 && (now - lastFetchRef.current < 2000)) {
          return;
        }
        // Cancel previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;
        setLoading(true);
        setError(null);
        const timeoutDuration = 10000;
        const timeout = new Promise<never>((_, reject) => {
          const id = setTimeout(() => {
            clearTimeout(id);
            reject(new Error(`Query timed out after ${timeoutDuration}ms`));
          }, timeoutDuration);
        });
        const accessToken = session?.access_token || '';
        let result;
        let fetched = false;
        try {
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
          // Direct fetch fail, will fallback
        }
        if (!fetched) {
          try {
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
            // fallback fail
          }
        }
        if (isMounted.current) {
          setJob(result);
          lastFetchRef.current = Date.now();
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        if (isMounted.current) setError(err.message || 'Không lấy được thông tin job');
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };
    if (!authLoading && isAuthenticated && userRole && jobId) {
      fetchJob();
    }
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [jobId, authLoading, isAuthenticated, userRole, session]);

  if (loading) return <div className="text-center py-10">Đang tải thông tin công việc...</div>;
  if (error || !job) return <div className="text-center text-red-500 py-10">{error || 'Không tìm thấy công việc'}</div>;

  // Helper lấy thành phố
  const extractCity = (address: string | null | undefined) => {
    if (!address) return '';
    const parts = address.split(',').map(s => s.trim());
    return parts.length > 1 ? parts[parts.length - 1] : address;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-white pb-16">
      <div className="max-w-5xl mx-auto pt-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-pink-300 rounded-2xl shadow-lg p-8 flex flex-col md:flex-row items-center gap-6 mb-8">
          <img src="/logo192.png" alt="Logo" className="w-24 h-24 rounded-full bg-white shadow-md object-contain" />
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">{job.position_title}</h1>
            <div className="flex flex-wrap gap-4 items-center">
              <span className="flex items-center gap-2 bg-white/80 text-pink-700 px-4 py-2 rounded-full font-semibold"><i className="fas fa-dollar-sign"></i> Salary {job.max_monthly_salary ? `Up to ${job.max_monthly_salary}M` : 'Negotiable'}</span>
              <span className="flex items-center gap-2 bg-white/80 text-pink-700 px-4 py-2 rounded-full font-semibold"><i className="fas fa-map-marker-alt"></i> Location {extractCity(job.work_location)}, Viet Nam</span>
              <span className="flex items-center gap-2 bg-white/80 text-pink-700 px-4 py-2 rounded-full font-semibold"><i className="fas fa-briefcase"></i> Category {job.industry_category || 'N/A'}</span>
              <span className="flex items-center gap-2 bg-white/80 text-pink-700 px-4 py-2 rounded-full font-semibold"><i className="fas fa-clock"></i> Job Type {job.job_category || 'Full-time'}</span>
            </div>
          </div>
          <a href="#apply" className="bg-white text-pink-600 font-bold px-6 py-3 rounded-full shadow hover:bg-pink-50 transition">Become Headhunter</a>
        </div>
        {/* Main content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: Job description */}
          <div className="md:col-span-2 bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-pink-700 mb-4">MÔ TẢ CÔNG VIỆC</h2>
            <div className="text-gray-800 whitespace-pre-line mb-8">{job.job_summary || job.description || 'Không có mô tả.'}</div>
            <h2 className="text-2xl font-bold text-pink-700 mb-4">YÊU CẦU</h2>
            <div className="text-gray-800 whitespace-pre-line">{job.requirements || 'Không có yêu cầu.'}</div>
          </div>
          {/* Right: Info card */}
          <div className="bg-pink-50 rounded-2xl shadow-lg p-8 flex flex-col gap-6">
            <a id="apply" href="#" className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-full text-center text-lg shadow">Apply now</a>
            <div className="bg-white rounded-xl p-4 shadow flex flex-col gap-2">
              <div className="flex items-center gap-2"><img src="/logo192.png" alt="Owner" className="w-8 h-8 rounded-full" /><span className="font-semibold text-pink-700">Owner Info</span></div>
              <div className="text-gray-700 font-bold">{job.owner_details?.full_name || 'N/A'}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow flex flex-col gap-2">
              <div className="flex items-center gap-2"><i className="fas fa-envelope text-pink-400"></i><span className="font-semibold text-pink-700">Email</span></div>
              <div className="text-gray-700 font-bold">{job.owner_details?.email || 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetailPage; 