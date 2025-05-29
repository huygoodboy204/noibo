import React, { useState, useEffect } from 'react';
import { Candidate } from '../../types/index';
import { useModalLayout } from "../../contexts/ModalLayoutContext";

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer_Not_To_Say'];
const VISA_STATUS_OPTIONS = ['Citizen', 'Permanent_Resident', 'Work_Permit_Holder', 'Dependent_Pass_Holder', 'Student_Pass_Holder', 'Requires_Sponsorship', 'Not_Applicable'];
const CANDIDATE_PHASE_OPTIONS = ['Open', 'Sourcing', 'Interviewing', 'Offer_Extended', 'Filled', 'On_Hold', 'Cancelled'];
const CANDIDATE_RANK_OPTIONS = ['Hot', 'Warm', 'Cold', 'A_List', 'B_List'];
const EMPLOYMENT_TYPE_OPTIONS = ['Full_Time_Permanent', 'Part_Time_Permanent', 'Contract', 'Temporary', 'Internship', 'Freelance'];
const ENGLISH_LEVEL_OPTIONS = ['Native', 'Fluent', 'Business', 'Conversational', 'Basic', 'None'];

interface EditCandidateModalProps {
  candidate: Candidate;
  onClose: () => void;
  onSave: (candidate: Candidate) => void;
}

const EditCandidateModal: React.FC<EditCandidateModalProps> = ({ candidate, onClose, onSave }) => {
  const { setIsModalOpen } = useModalLayout();
  const [form, setForm] = useState<Partial<Candidate>>(candidate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    setIsModalOpen(true);
    return () => setIsModalOpen(false);
  }, [setIsModalOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(undefined);
    try {
      const SUPABASE_URL = 'https://dqnjtkbxtscjikalkajq.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw';
      const updatedCandidate: Candidate = {
        ...candidate,
        ...form,
        phase: form.phase && CANDIDATE_PHASE_OPTIONS.includes(form.phase) ? form.phase : undefined
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/candidates?id=eq.${candidate.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(updatedCandidate),
      });
      const updatedArr = await res.json();
      const updated = updatedArr && updatedArr[0];
      if (updated && updated.id) {
        onSave(updated);
      } else if (res.status === 200) {
        onSave(updatedCandidate);
      } else {
        throw new Error('Update failed: No candidate returned');
      }
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

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
      .replace(/_/g, ' ')
      .replace(/\b(\w)/g, s => s.toUpperCase());
  };

  // Chỉ render một số trường cơ bản, có thể mở rộng thêm nếu muốn
  const fields: (keyof typeof form)[] = ['name', 'email', 'gender', 'date_of_birth', 'linkedin', 'address', 'current_employment_status', 'phase', 'other_languages', 'cv_link'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-fadeIn">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold">&times;</button>
        <h2 className="text-xl font-bold text-center mb-6">Edit Candidate</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          {fields.map(field => (
            <div key={field}>
              <label className="block font-semibold mb-1">{formatLabel(field)}</label>
              {field === 'gender' ? (
                <select name={field} value={form[field] ?? ''} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {renderSelectOptions(GENDER_OPTIONS)}
                </select>
              ) : field === 'phase' ? (
                <select name={field} value={form[field] ?? ''} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {renderSelectOptions(CANDIDATE_PHASE_OPTIONS)}
                </select>
              ) : (
                <input name={field} value={form[field] ?? ''} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400" />
              )}
              {field === 'cv_link' && <span className="text-xs text-gray-400 ml-2">(Link Google Drive, Dropbox...)</span>}
            </div>
          ))}
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg border font-semibold bg-gray-50 hover:bg-gray-100">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold shadow hover:bg-blue-700 transition-all disabled:opacity-60">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCandidateModal; 