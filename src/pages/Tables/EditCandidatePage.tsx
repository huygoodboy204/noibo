import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Candidate } from '../../types';

const CANDIDATE_PHASE_OPTIONS = ['New_Lead', 'Contacted', 'Screening', 'Qualified', 'Submitted_To_Client', 'Interview_Process', 'Offer_Stage', 'Placed', 'Archived_Not_Suitable', 'Archived_Not_Interested'];

const EditCandidatePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<Partial<Candidate> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/candidates?id=eq.${id}`, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    })
      .then(res => res.json())
      .then(data => {
        setForm(data[0]);
        setLoading(false);
      })
      .catch(() => setError('Failed to fetch candidate'));
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev!, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const patchData = { ...form };
      const res = await fetch(`https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/candidates?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(patchData),
      });
      if (!res.ok) throw new Error('Update failed');
      navigate('/tables/candidates');
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!form) return <div>Candidate not found</div>;

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">Edit Candidate</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-semibold mb-1">Name</label>
          <input name="name" value={form.name || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block font-semibold mb-1">Email</label>
          <input name="email" value={form.email || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block font-semibold mb-1">Phase</label>
          <select name="phase" value={form.phase || ''} onChange={handleChange} className="w-full border rounded px-3 py-2">
            <option value="">Select phase</option>
            {CANDIDATE_PHASE_OPTIONS.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        {/* Thêm các trường khác nếu muốn */}
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate('/tables/candidates')} className="bg-gray-200 px-4 py-2 rounded">Cancel</button>
          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded">{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </form>
    </div>
  );
};

export default EditCandidatePage; 