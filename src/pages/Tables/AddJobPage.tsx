import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useData, TableName } from '../../contexts/DataContext'; // Import TableName
import { Job, Client } from '../../types'; // Import Job and Client types

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
  const { user, session } = useAuth();
  // Assuming contextData is { [key: string]: { data: any[], ... } }
  const { data: contextDataAllTables, fetchTableData, invalidateTableData } = useData();
  const isMounted = useRef(true);
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    client_id: '',
    status: 'Open', // Default status
    job_type: 'Full_Time', // Default type
    required_skills: '', 
    salary_min: '', // Initialize as empty string for controlled input
    salary_max: '', // Initialize as empty string
  });
  const [clients, setClients] = useState<ClientLookup[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [hrContacts, setHrContacts] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingHrContacts, setIsLoadingHrContacts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      setCurrentUserId(user.id);
    }
  }, [user]);

  useEffect(() => {
    const fetchClients = async () => {
      setIsLoadingClients(true);
      const { data, error } = await supabase.from('clients').select('id, client_name').order('client_name');
      if (!error && data) setClients(data);
      setIsLoadingClients(false);
    };
    fetchClients();
  }, []);

  useEffect(() => {
    if (!formData.client_id) {
      setHrContacts([]);
      return;
    }
    const fetchHrContacts = async () => {
      setIsLoadingHrContacts(true);
      const { data, error } = await supabase
        .from('hr_contacts')
        .select('id, name')
        .eq('client_id', formData.client_id)
        .order('name');
      if (!error && data) setHrContacts(data);
      setIsLoadingHrContacts(false);
    };
    fetchHrContacts();
  }, [formData.client_id]);

  // Reset form khi component unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      setFormData({
        title: '',
        client_id: '',
        status: 'Open',
        job_type: 'Full_Time',
        required_skills: '',
        salary_min: '',
        salary_max: '',
      });
      setError(null);
      setIsSubmitting(false);
    };
  }, []);

  // Reset state when component mounts
  useEffect(() => {
    isMounted.current = true;
    setIsSubmitting(false);
    setError(null);
  }, []);

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!currentUserId) {
      setError("User ID not available. Cannot submit. Please log in.");
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
      owner_id: currentUserId,
      created_by_id: currentUserId,
      job_type: formData.job_type || null,
      min_monthly_salary: formData.salary_min === '' || formData.salary_min === undefined ? null : parseFloat(String(formData.salary_min)),
      max_monthly_salary: formData.salary_max === '' || formData.salary_max === undefined ? null : parseFloat(String(formData.salary_max)),
    };

    if (typeof processedData.min_monthly_salary === 'string') processedData.min_monthly_salary = parseFloat(processedData.min_monthly_salary);
    if (isNaN(processedData.min_monthly_salary as number)) processedData.min_monthly_salary = null;
    if (typeof processedData.max_monthly_salary === 'string') processedData.max_monthly_salary = parseFloat(processedData.max_monthly_salary);
    if (isNaN(processedData.max_monthly_salary as number)) processedData.max_monthly_salary = null;

    try {
      const res = await fetch('https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/jobs', {
        method: 'POST',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify([processedData])
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Insert failed');
        setIsSubmitting(false);
        return;
      }
      alert('Job added successfully!');
      invalidateTableData('jobs' as TableName);
      navigate('/tables/jobs');
    } catch (err: any) {
      setError(`Failed to add job: ${err.message}.`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleBack = () => navigate('/tables/jobs'); 

  const renderSelectOptions = (options: ReadonlyArray<string | undefined>, includeEmpty: boolean = true) => (
    <>
      {includeEmpty && <option value="">Select...</option>}
      {options.map(opt => opt && <option key={opt} value={opt}>{opt.replace(/_/g, ' ' )}</option>)}
    </>
  );

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Add New Job</h1>
        <button onClick={handleBack} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
          Back to Jobs List
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
        {/* Job Title */}
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Job Title <span className="text-red-500">*</span></label>
          <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required 
                 className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>

        {/* Client Selection */}
        <div className="mb-4">
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
        
        {/* Description */}
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <textarea name="description" id="description" value={formData.description || ''} onChange={handleChange} rows={4}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
            <select name="status" id="status" value={formData.status || ''} onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              {renderSelectOptions(JOB_STATUS_OPTIONS, false)}{/* No empty option for default value */}
            </select>
          </div>

          {/* Job Type */}
          <div>
            <label htmlFor="job_type" className="block text-sm font-medium text-gray-700">Job Type</label>
            <select name="job_type" id="job_type" value={formData.job_type || ''} onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              {renderSelectOptions(JOB_TYPE_OPTIONS, false)}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Salary Min */}
            <div>
                <label htmlFor="salary_min" className="block text-sm font-medium text-gray-700">Salary Min</label>
                <input type="text" name="salary_min" id="salary_min" value={formData.salary_min || ''} onChange={handleNumericChange} placeholder="e.g., 50000"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            {/* Salary Max */}
            <div>
                <label htmlFor="salary_max" className="block text-sm font-medium text-gray-700">Salary Max</label>
                <input type="text" name="salary_max" id="salary_max" value={formData.salary_max || ''} onChange={handleNumericChange} placeholder="e.g., 70000"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
        </div>
        
        {/* Location */}
        <div className="mb-4">
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
          <input type="text" name="location" id="location" value={formData.location || ''} onChange={handleChange} placeholder="e.g., Ho Chi Minh City, Remote"
                 className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>

        {/* Required Skills */}
        <div className="mb-4">
          <label htmlFor="required_skills" className="block text-sm font-medium text-gray-700">Required Skills (comma-separated)</label>
          <input type="text" name="required_skills" id="required_skills" value={formData.required_skills || ''} onChange={handleChange} placeholder="e.g., React, Node.js, PostgreSQL"
                 className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Experience Level */}
            <div>
                <label htmlFor="experience_level" className="block text-sm font-medium text-gray-700">Experience Level</label>
                <input type="text" name="experience_level" id="experience_level" value={formData.experience_level || ''} onChange={handleChange} placeholder="e.g., Senior, 3+ years"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            {/* Department */}
            <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700">Department</label>
                <input type="text" name="department" id="department" value={formData.department || ''} onChange={handleChange} placeholder="e.g., Engineering, Sales"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
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
          {isSubmitting ? 'Saving Job...' : 'Save Job'}
        </button>
      </form>
    </div>
  );
};

export default AddJobPage; 