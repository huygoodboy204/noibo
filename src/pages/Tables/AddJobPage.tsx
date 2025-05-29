import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useData, TableName } from '../../contexts/DataContext'; // Import TableName
import { Job, Client } from '../../types/index'; // Import Job and Client types
import { toast } from 'react-hot-toast';

// Tiptap imports
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
// Bạn có thể tạo file CSS riêng cho editor hoặc thêm vào index.css
import '../../assets/css/editor.css'; // Updated path

// Basic Editor Toolbar Component
const MenuBar: React.FC<{ editor: Editor | null }> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="menu-bar bg-gray-100 p-2 rounded-t-md border border-gray-300 flex flex-wrap gap-x-2 gap-y-1 items-center">
      {/* Bold */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`px-2 py-1 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'is-active bg-gray-300' : ''}`}
        title="Bold"
      >
        <span style={{fontWeight: 'bold'}}>B</span>
      </button>
      {/* Italic */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`px-2 py-1 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'is-active bg-gray-300' : ''}`}
        title="Italic"
      >
        <span style={{fontStyle: 'italic'}}>I</span>
      </button>
      {/* Bullet List */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`px-2 py-1 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'is-active bg-gray-300' : ''}`}
        title="Bullet List"
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="6" cy="7" r="1.5" fill="currentColor"/><circle cx="6" cy="12" r="1.5" fill="currentColor"/><circle cx="6" cy="17" r="1.5" fill="currentColor"/><rect x="10" y="6" width="9" height="2" rx="1" fill="currentColor"/><rect x="10" y="11" width="9" height="2" rx="1" fill="currentColor"/><rect x="10" y="16" width="9" height="2" rx="1" fill="currentColor"/></svg>
      </button>
      {/* Ordered List */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`px-2 py-1 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'is-active bg-gray-300' : ''}`}
        title="Ordered List"
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><text x="3" y="9" fontSize="8" fill="currentColor">1.</text><text x="3" y="14" fontSize="8" fill="currentColor">2.</text><text x="3" y="19" fontSize="8" fill="currentColor">3.</text><rect x="10" y="6" width="9" height="2" rx="1" fill="currentColor"/><rect x="10" y="11" width="9" height="2" rx="1" fill="currentColor"/><rect x="10" y="16" width="9" height="2" rx="1" fill="currentColor"/></svg>
      </button>
      {/* Blockquote */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`px-2 py-1 rounded hover:bg-gray-200 ${editor.isActive('blockquote') ? 'is-active bg-gray-300' : ''}`}
        title="Blockquote"
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M7 7h7M7 12h7M7 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M4 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>
      {/* Link */}
      <button 
        type="button" 
        onClick={setLink}
        className={`px-2 py-1 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'is-active bg-gray-300' : ''}`}
        title="Insert Link"
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M17 7a5 5 0 0 0-7.07 0l-4 4a5 5 0 0 0 7.07 7.07l1-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 17a5 5 0 0 0 7.07 0l4-4a5 5 0 0 0-7.07-7.07l-1 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {/* Unlink */}
      <button 
        type="button" 
        onClick={() => editor.chain().focus().unsetLink().run()} 
        disabled={!editor.isActive('link')}
        className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-50"
        title="Remove Link"
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M17 7a5 5 0 0 0-7.07 0l-4 4a5 5 0 0 0 7.07 7.07l1-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 17a5 5 0 0 0 7.07 0l4-4a5 5 0 0 0-7.07-7.07l-1 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="2"/></svg>
      </button>
    </div>
  );
};

// Define interfaces for form data and client lookup
interface JobFormData {
  title: string;
  client_id: string; // Stores the selected client's UUID
  description?: string;
  status?: 'Open' | 'Closed' | 'On_Hold' | 'Draft'; 
  job_type?: 'Full_Time' | 'Part_Time' | 'Contract' | 'Temporary' | 'Internship';
  salary_min?: number | string; // Allow string for input, convert later
  salary_max?: number | string;
  currency?: string;
  location?: string;
  required_skills?: string; // Input as comma-separated string, convert to array on submit
  experience_level?: string;
  department?: string;
  application_deadline?: string; // Date string
  notes?: string;
  hr_contact_id?: string;
}

// For the client dropdown list
interface ClientLookup {
  id: string;
  client_name: string; // Changed from name to client_name based on user feedback
}

const JOB_STATUS_OPTIONS: NonNullable<JobFormData['status']>[] = ['Open', 'Closed', 'On_Hold', 'Draft'];
const JOB_TYPE_OPTIONS: NonNullable<JobFormData['job_type']>[] = ['Full_Time', 'Part_Time', 'Contract', 'Temporary', 'Internship'];

const AddJobPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session, isAuthenticated, userRole, loading: authLoading } = useAuth();
  const { data: contextDataAllTables, fetchTableData, invalidateTableData } = useData();
  const isMounted = useRef(true);
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const abortControllerJobRef = useRef<AbortController | null>(null);
  const abortControllerClientRef = useRef<AbortController | null>(null);
  const abortControllerHrContactRef = useRef<AbortController | null>(null);
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    client_id: '',
    description: '',
    status: 'Open',
    job_type: 'Full_Time',
    required_skills: '',
    salary_min: '',
    salary_max: '',
  });
  const [clients, setClients] = useState<ClientLookup[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [hrContacts, setHrContacts] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingHrContacts, setIsLoadingHrContacts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEditMode);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
    ],
    content: formData.description || '',
    onUpdate: ({ editor: currentEditor }) => {
      setFormData(prev => ({ ...prev, description: currentEditor.getHTML() }));
    },
  });

  // Cập nhật editor content khi formData.description thay đổi
  useEffect(() => {
    if (editor && formData.description !== editor.getHTML()) {
      editor.commands.setContent(formData.description || '');
    }
  }, [formData.description, editor]);

  useEffect(() => {
    if (user?.id) {
      setCurrentUserId(user.id);
    }
  }, [user]);

  const authReady = !authLoading && isAuthenticated && userRole && session;

  // --- FETCH CLIENTS ---
  const fetchClients = React.useCallback(async () => {
    if (!authReady) return;
    try {
      if (abortControllerClientRef.current) abortControllerClientRef.current.abort();
      abortControllerClientRef.current = new AbortController();
      const signal = abortControllerClientRef.current.signal;
      setIsLoadingClients(true);
      setError(null);
      const timeoutDuration = 10000;
      const timeout = new Promise<never>((_, reject) => {
        const idTimeout = setTimeout(() => {
          clearTimeout(idTimeout);
          reject(new Error(`Query timed out after ${timeoutDuration}ms`));
        }, timeoutDuration);
      });
      const accessToken = session?.access_token || '';
      let result;
      let fetched = false;
      try {
        const response = await Promise.race([
          fetch('https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/clients?select=id,client_name', {
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            signal
          }),
          timeout
        ]);
        if (!response.ok) throw new Error('Failed to fetch clients');
        result = await response.json();
        if (Array.isArray(result) && result.length > 0) {
          fetched = true;
        }
      } catch (err) {
        // REST fetch fail, fallback supabase
      }
      if (!fetched) {
        try {
          const { data, error } = await Promise.race([
            supabase
              .from('clients')
              .select('id, client_name')
              .order('client_name'),
            timeout
          ]);
          if (error) throw error;
          result = data;
        } catch (error) {
          // fallback fail
        }
      }
      if (result && isMounted.current) {
        setClients(result);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (isMounted.current) setError(err.message || 'Failed to load clients');
    } finally {
      if (isMounted.current) setIsLoadingClients(false);
    }
  }, [authReady, session]);

  useEffect(() => {
    if (authReady) fetchClients();
  }, [authReady, fetchClients]);

  useEffect(() => {
    return () => {
      if (abortControllerClientRef.current) abortControllerClientRef.current.abort();
    };
  }, []);

  // --- FETCH HR CONTACTS ---
  useEffect(() => {
    if (!formData.client_id) {
      setHrContacts([]);
      return;
    }
    console.log('[AddJobPage] Fetching HR contacts for client:', formData.client_id);
    const abortController = new AbortController();
    setIsLoadingHrContacts(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from('hr_contacts')
          .select('id, name')
          .eq('client_id', formData.client_id)
          .order('name');
        if (error) throw error;
        if (data) setHrContacts(data);
      } catch (err: any) {
        if (err.name !== 'AbortError') setError(err.message || 'Failed to load HR contacts');
      } finally {
        setIsLoadingHrContacts(false);
      }
    })();
    return () => {
      abortController.abort();
    };
  }, [formData.client_id]);

  // --- FETCH JOB DATA (EDIT MODE) ---
  const fetchJobData = React.useCallback(async () => {
    if (!id || !authReady) return;
    try {
      if (abortControllerJobRef.current) abortControllerJobRef.current.abort();
      abortControllerJobRef.current = new AbortController();
      const signal = abortControllerJobRef.current.signal;
      setIsLoading(true);
      setError(null);
      const timeoutDuration = 10000;
      const timeout = new Promise<never>((_, reject) => {
        const idTimeout = setTimeout(() => {
          clearTimeout(idTimeout);
          reject(new Error(`Query timed out after ${timeoutDuration}ms`));
        }, timeoutDuration);
      });
      const accessToken = session?.access_token || '';
      let result;
      let fetched = false;
      try {
        const response = await Promise.race([
          fetch(`https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/jobs?id=eq.${id}&select=*,clients(id,client_name,website_url),owner_details:owner_id(id,full_name,email),hr_contacts(id,name,email_1)`, {
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
        if (Array.isArray(result)) result = result[0] || null;
        if (result) fetched = true;
      } catch (err) {}
      if (!fetched) {
        try {
          const { data, error } = await Promise.race([
            supabase
              .from('jobs')
              .select('*,clients(id,client_name,website_url),owner_details:owner_id(id,full_name,email),hr_contacts(id,name,email_1)')
              .eq('id', id)
              .single(),
            timeout
          ]);
          if (error) throw error;
          result = data;
        } catch (error) {}
      }
      if (result && isMounted.current) {
        const jobData = {
          title: result.position_title || '',
          client_id: result.client_id || '',
          description: result.job_summary || '',
          status: result.phase || 'Open',
          job_type: result.job_type || 'Full_Time',
          required_skills: result.required_skills || '',
          salary_min: result.min_monthly_salary?.toString() || '',
          salary_max: result.max_monthly_salary?.toString() || '',
          location: result.work_location || '',
          department: result.industry_category || '',
          hr_contact_id: result.hr_contact_id || '',
        };
        setFormData(jobData);
        if (editor) editor.commands.setContent(jobData.description || '');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (isMounted.current) setError(err.message || 'Failed to load job data');
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [id, authReady, session, editor]);

  useEffect(() => {
    if (isEditMode && authReady) fetchJobData();
  }, [isEditMode, authReady, fetchJobData]);

  useEffect(() => {
    return () => {
      if (abortControllerJobRef.current) abortControllerJobRef.current.abort();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value === '' || !isNaN(Number(value))) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // --- HANDLE SUBMIT ---
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authReady) {
      setError('Auth chưa sẵn sàng!');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    if (editor) setFormData(prev => ({ ...prev, description: editor.getHTML() }));
    if (!currentUserId) {
      setError('User ID not available. Cannot submit. Please log in.');
      setIsSubmitting(false);
      return;
    }
    if (!formData.title.trim()) {
      setError('Job title is required.');
      setIsSubmitting(false);
      return;
    }
    if (!formData.client_id) {
      setError('Client is required.');
      setIsSubmitting(false);
      return;
    }
    const processedData = {
      position_title: formData.title,
      client_id: formData.client_id,
      description: formData.description === '<p></p>' ? '' : formData.description,
      owner_id: currentUserId,
      created_by_id: currentUserId,
      job_type: formData.job_type || null,
      min_monthly_salary: formData.salary_min === '' || formData.salary_min === undefined ? null : parseFloat(String(formData.salary_min)),
      max_monthly_salary: formData.salary_max === '' || formData.salary_max === undefined ? null : parseFloat(String(formData.salary_max)),
      work_location: formData.location,
      industry_category: formData.department,
      hr_contact_id: formData.hr_contact_id,
      phase: formData.status,
    };
    try {
      let res, data;
      if (isEditMode) {
        res = await fetch(`https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/jobs?id=eq.${id}`, {
          method: 'PATCH',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw',
            'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify([processedData])
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Update failed');
        toast.success('Job updated successfully');
        navigate(`/admin/jobs/detail/${id}`);
      } else {
        res = await fetch('https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/jobs', {
          method: 'POST',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw',
            'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify([processedData])
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Insert failed');
        toast.success('Job created successfully');
        navigate('/jobs');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to save job');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleBack = () => {
    if (isEditMode) {
      navigate(`/admin/jobs/detail/${id}`);
    } else {
      navigate('/tables/jobs');
    }
  };

  const renderSelectOptions = (options: ReadonlyArray<string | undefined>, includeEmpty: boolean = true) => (
    <>
      {includeEmpty && <option value="">Select...</option>}
      {options.map(opt => opt && <option key={opt} value={opt}>{opt.replace(/_/g, ' ' )}</option>)}
    </>
  );

  if (isLoading) {
    return <div className="container mx-auto p-4">Loading job data...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{isEditMode ? 'Edit Job' : 'Add New Job'}</h1>
        <button onClick={handleBack} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
          Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
        <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
        {/* Job Title and Ranking (Status) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Job Name <span className="text-red-500">*</span></label>
            <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required
                   className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Ranking <span className="text-red-500">*</span></label>
            <select name="status" id="status" value={formData.status || ''} onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              {renderSelectOptions(JOB_STATUS_OPTIONS, false)}
            </select>
          </div>
        </div>

        {/* Description using Tiptap Editor - Full Width and Taller */}
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description <span className="text-red-500">*</span></label>
          <MenuBar editor={editor} />
          <EditorContent editor={editor} className="mt-1 prose max-w-none border border-gray-300 rounded-b-md p-3 min-h-[250px] focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500" />
        </div>
        
        <h2 className="text-xl font-semibold mt-6 mb-4">Related Information</h2>
        {/* Client Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="client_id" className="block text-sm font-medium text-gray-700">Client <span className="text-red-500">*</span></label>
            {isLoadingClients ? (
              <p>Loading clients...</p>
            ) : (
              <select name="client_id" id="client_id" value={formData.client_id} onChange={handleChange} required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <option value="">Select a Client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.client_name}</option>
                ))}
              </select>
            )}
            {clients.length === 0 && !isLoadingClients && <p className="text-xs text-gray-500 mt-1">No clients found or still loading. Ensure 'client_name' column exists and is fetched.</p>}
          </div>
          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location <span className="text-red-500">*</span></label>
            <input type="text" name="location" id="location" value={formData.location || ''} onChange={handleChange} placeholder="e.g., Ho Chi Minh City, Remote" required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Job Type */}
          <div>
            <label htmlFor="job_type" className="block text-sm font-medium text-gray-700">Job Type <span className="text-red-500">*</span></label>
            <select name="job_type" id="job_type" value={formData.job_type || ''} onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              {renderSelectOptions(JOB_TYPE_OPTIONS, false)}
            </select>
          </div>
           {/* Category - Assuming this is Department */}
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700">Category <span className="text-red-500">*</span></label>
            <input type="text" name="department" id="department" value={formData.department || ''} onChange={handleChange} placeholder="e.g., Engineering, Sales" required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>
        
        <h2 className="text-xl font-semibold mt-6 mb-4">Financial Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Salary Min */}
            <div>
                <label htmlFor="salary_min" className="block text-sm font-medium text-gray-700">Salary <span className="text-red-500">*</span></label>
                <input type="text" name="salary_min" id="salary_min" value={formData.salary_min || ''} onChange={handleNumericChange} placeholder="Minimum" required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            {/* Salary Max */}
            <div>
                <label htmlFor="salary_max" className="block text-sm font-medium text-gray-700 invisible">Salary Max</label> {/* Label is there for spacing but invisible */}
                <input type="text" name="salary_max" id="salary_max" value={formData.salary_max || ''} onChange={handleNumericChange} placeholder="Maximum"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
             {/* Warranty Period - Placeholder, assuming this might be 'experience_level' or a new field */}
            <div>
                <label htmlFor="experience_level" className="block text-sm font-medium text-gray-700">Warranty Period</label>
                <input type="text" name="experience_level" id="experience_level" value={formData.experience_level || ''} onChange={handleChange} placeholder="e.g., 2 months, 1 year"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
        </div>
        
        {/* Optional: Other fields that were previously there but not explicitly in the image layout */}
        {/* Required Skills */}
        <div className="mb-4">
          <label htmlFor="required_skills" className="block text-sm font-medium text-gray-700">Required Skills (comma-separated)</label>
          <input type="text" name="required_skills" id="required_skills" value={formData.required_skills || ''} onChange={handleChange} placeholder="e.g., React, Node.js, PostgreSQL"
                 className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>

        {/* Application Deadline */}
        <div className="mb-4">
          <label htmlFor="application_deadline" className="block text-sm font-medium text-gray-700">Application Deadline</label>
          <input type="date" name="application_deadline" id="application_deadline" value={formData.application_deadline || ''} onChange={handleChange}
                 className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea name="notes" id="notes" value={formData.notes || ''} onChange={handleChange} rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>

        {/* HR Contact Selection */}
        <div className="mb-4">
          <label htmlFor="hr_contact_id" className="block text-sm font-medium text-gray-700">HR Contact</label>
          {isLoadingHrContacts ? (
            <p>Loading HR contacts...</p>
          ) : (
            <select name="hr_contact_id" id="hr_contact_id" value={formData.hr_contact_id || ''} onChange={handleChange} required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              <option value="">Select HR contact...</option>
              {hrContacts.map(hr => (
                <option key={hr.id} value={hr.id}>{hr.name}</option>
              ))}
            </select>
          )}
          {formData.client_id && hrContacts.length === 0 && !isLoadingHrContacts && <p className="text-xs text-gray-500 mt-1">No HR contacts found for this client.</p>}
        </div>

        {error && <p className="text-red-500 text-sm mt-4">Error: {error}</p>}
        {isLoadingClients && <p className="text-blue-500 text-sm mt-1">Loading client list...</p>}

        <button 
          type="submit" 
          disabled={isSubmitting || isLoadingClients || !currentUserId}
          className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-gray-400"
        >
          {isSubmitting ? 'Saving...' : isEditMode ? 'Update Job' : 'Save Job'}
        </button>
      </form>
    </div>
  );
};

export default AddJobPage; 