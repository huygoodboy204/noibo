import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useModalLayout } from '../../../src/contexts/ModalLayoutContext';

const CLIENT_RANK_OPTIONS = ['A', 'B', 'C', 'D'];
const CLIENT_PHASE_OPTIONS = ['Prospecting', 'Qualification', 'Needs_Analysis', 'Proposal_Sent', 'Negotiation', 'Closed_Won', 'Closed_Lost', 'On_Hold'];

type EditClientModalProps = {
  client: any;
  onClose: () => void;
  onSave: (client: any) => void;
};

const EditClientModal: React.FC<EditClientModalProps> = ({ client, onClose, onSave }) => {
  const { setIsModalOpen } = useModalLayout();
  const [formData, setFormData] = useState({ ...client });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsModalOpen(true);
    return () => setIsModalOpen(false);
  }, [setIsModalOpen]);

  const getAccessToken = () => {
    try {
      const tokenObj = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
      return tokenObj?.currentSession?.access_token || localStorage.getItem('access_token');
    } catch {
      return localStorage.getItem('access_token');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const patchData = {
        client_name: formData.client_name,
        registration_no: formData.registration_no,
        website_url: formData.website_url,
        client_category: formData.client_category,
        client_industry: formData.client_industry,
        location: formData.location,
        address: formData.address,
        client_rank: formData.client_rank,
        owner_id: formData.owner_id,
        phase: formData.phase,
        phase_date: formData.phase_date,
        phase_memo: formData.phase_memo,
        business_overview: formData.business_overview,
        working_hours: formData.working_hours,
        insurance: formData.insurance,
        medical_expense: formData.medical_expense,
        bonus: formData.bonus,
        allowance: formData.allowance,
        sick_leave: formData.sick_leave,
        annual_leave: formData.annual_leave,
        probation_period: formData.probation_period,
        updated_at: new Date().toISOString()
      };
      const res = await fetch(`https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/clients?id=eq.${client.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': String(import.meta.env.VITE_SUPABASE_ANON_KEY),
          'Authorization': `Bearer ${String(import.meta.env.VITE_SUPABASE_ANON_KEY)}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        } as Record<string, string>,
        body: JSON.stringify(patchData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      toast.success('Cập nhật client thành công!');
      onSave(data[0]);
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra khi cập nhật client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-black">×</button>
        <h2 className="text-xl font-bold mb-4">Chỉnh sửa Client</h2>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Tên Client *</label>
              <input type="text" value={formData.client_name ?? ''} onChange={e => setFormData({ ...formData, client_name: e.target.value })} required className="mt-1 block w-full border rounded px-2 py-1" />
            </div>
            <div>
              <label className="block text-sm font-medium">Rank *</label>
              <select value={formData.client_rank ?? ''} onChange={e => setFormData({ ...formData, client_rank: e.target.value })} required className="mt-1 block w-full border rounded px-2 py-1">
                <option value="">Chọn rank</option>
                {CLIENT_RANK_OPTIONS.map(rank => (<option key={rank} value={rank}>{rank}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Phase *</label>
              <select value={formData.phase ?? ''} onChange={e => setFormData({ ...formData, phase: e.target.value })} required className="mt-1 block w-full border rounded px-2 py-1">
                <option value="">Chọn phase</option>
                {CLIENT_PHASE_OPTIONS.map(p => (<option key={p} value={p}>{p.replace(/_/g, ' ')}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Loại Client</label>
              <input type="text" value={formData.client_category ?? ''} onChange={e => setFormData({ ...formData, client_category: e.target.value })} className="mt-1 block w-full border rounded px-2 py-1" />
            </div>
          </div>
          {/* Thêm các trường khác tương tự nếu cần */}
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded">Hủy</button>
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditClientModal; 