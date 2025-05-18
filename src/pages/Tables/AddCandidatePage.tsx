import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';

// ENUM values from your DB schema
const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer_Not_To_Say'];
const VISA_STATUS_OPTIONS = ['Citizen', 'Permanent_Resident', 'Work_Permit_Holder', 'Dependent_Pass_Holder', 'Student_Pass_Holder', 'Requires_Sponsorship', 'Not_Applicable'];
const CANDIDATE_PHASE_OPTIONS = ['New_Lead', 'Contacted', 'Screening', 'Qualified', 'Submitted_To_Client', 'Interview_Process', 'Offer_Stage', 'Placed', 'Archived_Not_Suitable', 'Archived_Not_Interested'];
const CANDIDATE_RANK_OPTIONS = ['Hot', 'Warm', 'Cold', 'A_List', 'B_List'];
const EMPLOYMENT_TYPE_OPTIONS = ['Full_Time_Permanent', 'Part_Time_Permanent', 'Contract', 'Temporary', 'Internship', 'Freelance'];
const ENGLISH_LEVEL_OPTIONS = ['Native', 'Fluent', 'Business', 'Conversational', 'Basic', 'None'];

interface CandidateFormData {
  name: string;
  email?: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string;
  visa_status?: string;
  ic_passport_no?: string;
  linkedin?: string;
  facebook?: string;
  address?: string;
  phase?: string;
  phase_date?: string;
  phase_memo?: string;
  cdd_rank?: string;
  entry_route?: string;
  preferred_industry?: string;
  preferred_job?: string;
  expected_monthly_salary?: number;
  expected_annual_salary?: number;
  preferred_location?: string;
  preferred_mrt?: string;
  notice_period?: string;
  employment_start_date?: string;
  employment_type?: string;
  experienced_industry?: string;
  experienced_job?: string;
  professional_summary?: string;
  professional_history?: any;
  current_employment_status?: string;
  current_monthly_salary?: number;
  current_salary_allowance?: string;
  highest_education?: string;
  course_training?: string;
  education_details?: string;
  english_level?: string;
  other_languages?: string[];
  cv_link?: string;
}

const AddCandidatePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { fromApply, jobId } = location.state || {};
  const { invalidateTableData } = useData();

  const [formData, setFormData] = useState<CandidateFormData>({
    name: '',
    cv_link: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form khi chuyển route
  useEffect(() => {
    setFormData({ name: '', cv_link: '' });
    setError(null);
    setLoading(false);
  }, [location.pathname]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Allow empty string or numbers
    if (value === '' || !isNaN(Number(value))) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!session) {
        throw new Error('User not authenticated');
      }

      if (!formData.name) {
        throw new Error('Please enter candidate name');
      }

      const candidateData = {
        name: formData.name,
        email: formData.email || null,
        gender: formData.gender || null,
        date_of_birth: formData.date_of_birth || null,
        visa_status: formData.visa_status || null,
        ic_passport_no: formData.ic_passport_no || null,
        linkedin: formData.linkedin || null,
        facebook: formData.facebook || null,
        address: formData.address || null,
        phase: formData.phase || null,
        phase_date: formData.phase_date || null,
        phase_memo: formData.phase_memo || null,
        cdd_rank: formData.cdd_rank || null,
        entry_route: formData.entry_route || null,
        preferred_industry: formData.preferred_industry || null,
        preferred_job: formData.preferred_job || null,
        expected_monthly_salary: formData.expected_monthly_salary || null,
        expected_annual_salary: formData.expected_annual_salary || null,
        preferred_location: formData.preferred_location || null,
        preferred_mrt: formData.preferred_mrt || null,
        notice_period: formData.notice_period || null,
        employment_start_date: formData.employment_start_date || null,
        employment_type: formData.employment_type || null,
        experienced_industry: formData.experienced_industry || null,
        experienced_job: formData.experienced_job || null,
        professional_summary: formData.professional_summary || null,
        professional_history: formData.professional_history || null,
        current_employment_status: formData.current_employment_status || null,
        current_monthly_salary: formData.current_monthly_salary || null,
        current_salary_allowance: formData.current_salary_allowance || null,
        highest_education: formData.highest_education || null,
        course_training: formData.course_training || null,
        education_details: formData.education_details || null,
        english_level: formData.english_level || null,
        other_languages: formData.other_languages || null,
        cv_link: formData.cv_link || null,
        owner_id: session.user.id,
        created_by_id: session.user.id
      };

      const res = await fetch('https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/candidates', {
        method: 'POST',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw',
          'Authorization': session.access_token ? `Bearer ${session.access_token}` : '',
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify([candidateData])
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Insert failed');

      if (fromApply && jobId && data && data[0]) {
        // Lấy thông tin job để có client_id và hr_contact_id
        const jobRes = await fetch(`https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/jobs?id=eq.${jobId}&select=client_id,hr_contact_id`, {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw',
            'Authorization': session.access_token ? `Bearer ${session.access_token}` : '',
            'Content-Type': 'application/json'
          }
        });
        const jobData = await jobRes.json();
        if (!jobRes.ok || !jobData[0]) throw new Error('Không lấy được thông tin job');

        // Tạo process mới (job application)
        const processRes = await fetch('https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/processes', {
          method: 'POST',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw',
            'Authorization': session.access_token ? `Bearer ${session.access_token}` : '',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify([{
            candidate_id: data[0].id,
            job_id: jobId,
            client_id: jobData[0].client_id,
            hr_contact_id: jobData[0].hr_contact_id,
            process_status: 'APPLIED',
            status_update_date: new Date().toISOString(),
            process_memo: 'Applied through job listing with new candidate',
            created_by_id: session.user.id,
            owner_id: session.user.id
          }])
        });
        if (!processRes.ok) throw new Error('Không thể tạo process ứng tuyển');
        navigate('/jobs', {
          state: {
            message: 'Candidate added and application submitted successfully!',
            type: 'success'
          }
        });
      } else {
        navigate('/candidates', {
          state: {
            message: 'Candidate added successfully!',
            type: 'success'
          }
        });
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi thêm candidate');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => navigate('/tables/candidates');

  // Helper for rendering select options
  const renderSelectOptions = (options: string[], includeEmpty: boolean = true) => (
    <>
      {includeEmpty && <option value="">Select...</option>}
      {options.map(opt => <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>)}
    </>
  );

  // Simple function to create label text from field name
  const formatLabel = (fieldName: string) => {
    return fieldName
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/\b(\w)/g, s => s.toUpperCase()); // Capitalize first letter of each word
  };

  // Group fields for better form layout
  const personalInfoFields: (keyof CandidateFormData)[] = ['name', 'gender', 'date_of_birth', 'email', 'phone', 'cv_link', 'visa_status', 'ic_passport_no', 'linkedin', 'facebook', 'address'];
  const applicationInfoFields: (keyof CandidateFormData)[] = ['phase', 'phase_date', 'phase_memo', 'cdd_rank', 'entry_route'];
  const jobPreferenceFields: (keyof CandidateFormData)[] = ['preferred_industry', 'preferred_job', 'expected_monthly_salary', 'expected_annual_salary', 'preferred_location', 'preferred_mrt', 'notice_period', 'employment_start_date', 'employment_type'];
  const experienceFields: (keyof CandidateFormData)[] = ['experienced_industry', 'experienced_job', 'professional_summary', 'professional_history', 'current_employment_status', 'current_monthly_salary', 'current_salary_allowance'];
  const educationFields: (keyof CandidateFormData)[] = ['highest_education', 'course_training', 'education_details', 'english_level', 'other_languages'];

  const renderFormField = (field: keyof CandidateFormData) => {
    const label = formatLabel(field);
    const value = formData[field] === undefined ? '' : formData[field];
    const commonProps = {
      name: field,
      id: field,
      onChange: handleChange,
      className: "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
    };

    let inputElement;
    switch (field) {
      case 'name':
        inputElement = <input type="text" {...commonProps} value={value as string} required />;
        break;
      case 'email':
        inputElement = <input type="email" {...commonProps} value={value as string} />;
        break;
      case 'gender':
        inputElement = <select {...commonProps} value={value as string}>{renderSelectOptions(GENDER_OPTIONS)}</select>;
        break;
      case 'date_of_birth': case 'phase_date': case 'employment_start_date':
        inputElement = <input type="date" {...commonProps} value={value as string} />;
        break;
      case 'visa_status':
        inputElement = <select {...commonProps} value={value as string}>{renderSelectOptions(VISA_STATUS_OPTIONS)}</select>;
        break;
      case 'address': case 'phase_memo': case 'professional_summary': case 'education_details':
        inputElement = <textarea {...commonProps} value={value as string} rows={3} />;
        break;
      case 'phase':
        inputElement = <select {...commonProps} value={value as string}>{renderSelectOptions(CANDIDATE_PHASE_OPTIONS)}</select>;
        break;
      case 'cdd_rank':
        inputElement = <select {...commonProps} value={value as string}>{renderSelectOptions(CANDIDATE_RANK_OPTIONS)}</select>;
        break;
      case 'expected_monthly_salary': case 'expected_annual_salary': case 'current_monthly_salary':
        inputElement = <input type="text" {...commonProps} onChange={handleNumericChange} value={value || ''} placeholder="Enter amount" />;
        break;
      case 'employment_type':
        inputElement = <select {...commonProps} value={value as string}>{renderSelectOptions(EMPLOYMENT_TYPE_OPTIONS)}</select>;
        break;
      case 'professional_history':
        inputElement = <textarea {...commonProps} value={typeof value === 'string' ? value : JSON.stringify(value || '')} rows={4} placeholder='Enter JSON or structured text' />;
        break;
      case 'other_languages':
        inputElement = <input type="text" {...commonProps} value={Array.isArray(value) ? value.join(', ') : ''} placeholder="e.g., Japanese, Mandarin, Spanish" />;
        break;
      case 'english_level':
        inputElement = <select {...commonProps} value={value as string}>{renderSelectOptions(ENGLISH_LEVEL_OPTIONS)}</select>;
        break;
      case 'cv_link':
        inputElement = <input type="url" {...commonProps} value={value as string} placeholder="https://drive.google.com/..." />;
        break;
      default:
        inputElement = <input type="text" {...commonProps} value={value as string} />;
    }

    return (
      <div key={field} className="mb-4">
        <label htmlFor={field} className="block text-sm font-medium text-gray-700">
          {label}{field === 'name' && <span className="text-red-500">*</span>}
        </label>
        {inputElement}
      </div>
    );
  };
  
  const renderSection = (title: string, fields: (keyof CandidateFormData)[]) => (
    <fieldset className="mb-6 p-4 border border-gray-300 rounded-md">
        <legend className="text-lg font-semibold text-gray-800 px-2">{title}</legend>
        {fields.map(field => renderFormField(field))}
    </fieldset>
  );

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Add New Candidate</h1>
        <button onClick={handleBack} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
          Back to List
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
        {renderSection('Personal Information', personalInfoFields)}
        {renderSection('Application & Status', applicationInfoFields)}
        {renderSection('Job Preferences', jobPreferenceFields)}
        {renderSection('Experience & Employment', experienceFields)}
        {renderSection('Education & Skills', educationFields)}
        
        {error && <p className="text-red-500 text-sm mt-4">Error: {error}</p>}
        {loading && !session && <p className="text-orange-500 text-sm mt-4">Fetching user information...</p>}

        <button 
          type="submit" 
          disabled={loading || !session}
          className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-gray-400"
        >
          {loading ? 'Saving...' : 'Save Candidate'}
        </button>
      </form>
    </div>
  );
};

export default AddCandidatePage; 