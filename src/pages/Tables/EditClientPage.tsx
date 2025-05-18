import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Client } from '../../types';

const CLIENT_PHASE_OPTIONS = ['Prospecting', 'Qualification', 'Needs_Analysis', 'Proposal_Sent', 'Negotiation', 'Closed_Won', 'Closed_Lost', 'On_Hold'];
const CLIENT_RANK_OPTIONS = ['A', 'B', 'C', 'D'];

const EditClientPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<Partial<Client> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/clients?id=eq.${id}`, {
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
      .catch(() => setError('Failed to fetch client'));
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
      const res = await fetch(`https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/clients?id=eq.${id}`, {
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
      navigate('/tables/clients');
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!form) return <div>Client not found</div>;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h2 className="text-2xl font-bold mb-4">Edit Client</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Basic Information */}
          <div>
            <label className="block font-semibold mb-1">Client Name *</label>
            <input name="client_name" value={(form as any).client_name || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block font-semibold mb-1">Registration No</label>
            <input name="registration_no" value={(form as any).registration_no || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Website URL</label>
            <input name="website_url" value={(form as any).website_url || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Client Category</label>
            <input name="client_category" value={(form as any).client_category || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Client Industry</label>
            <input name="client_industry" value={(form as any).client_industry || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Location</label>
            <input name="location" value={(form as any).location || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Address</label>
            <input name="address" value={(form as any).address || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Rank</label>
            <select name="client_rank" value={(form as any).client_rank || ''} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option value="">Select rank</option>
              {CLIENT_RANK_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Phase</label>
            <select name="phase" value={(form as any).phase || ''} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option value="">Select phase</option>
              {CLIENT_PHASE_OPTIONS.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Phase Date</label>
            <input type="date" name="phase_date" value={(form as any).phase_date || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
        </div>

        {/* Business Details */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Business Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Business Overview</label>
              <textarea name="business_overview" value={(form as any).business_overview || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" rows={4} />
            </div>
            <div>
              <label className="block font-semibold mb-1">Phase Memo</label>
              <textarea name="phase_memo" value={(form as any).phase_memo || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" rows={4} />
            </div>
          </div>
        </div>

        {/* Benefits & Policies */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Benefits & Policies</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Working Hours</label>
              <input name="working_hours" value={(form as any).working_hours || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Insurance</label>
              <input name="insurance" value={(form as any).insurance || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Medical Expense</label>
              <input name="medical_expense" value={(form as any).medical_expense || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Bonus</label>
              <input name="bonus" value={(form as any).bonus || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Allowance</label>
              <input name="allowance" value={(form as any).allowance || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Sick Leave</label>
              <input name="sick_leave" value={(form as any).sick_leave || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Annual Leave</label>
              <input name="annual_leave" value={(form as any).annual_leave || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Probation Period</label>
              <input name="probation_period" value={(form as any).probation_period || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
          </div>
        </div>

        {error && <div className="text-red-500 text-sm mt-4">{error}</div>}
        <div className="flex gap-2 mt-6">
          <button type="button" onClick={() => navigate('/tables/clients')} className="bg-gray-200 px-4 py-2 rounded">Cancel</button>
          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded">{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </form>
    </div>
  );
};

export default EditClientPage; 