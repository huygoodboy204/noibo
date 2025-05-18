import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

// Define enum types to match database
type ClientRank = 'A' | 'B' | 'C' | 'D';
type ClientPhase = 'Prospecting' | 'Qualification' | 'Needs_Analysis' | 'Proposal_Sent' | 'Negotiation' | 'Closed_Won' | 'Closed_Lost' | 'On_Hold';

interface NewClientData {
  client_name: string;
  owner_id: string;
  client_rank: ClientRank | null;
  phase: ClientPhase | null;
  client_category: string;
  website_url: string;
  registration_no: string;
  location: string;
  address: string;
  phase_date: string;
  phase_memo: string;
  business_overview: string;
  working_hours: string;
  insurance: string;
  medical_expense: string;
  bonus: string;
  allowance: string;
  sick_leave: string;
  annual_leave: string;
  probation_period: string;
}

const CLIENT_RANK_OPTIONS: ClientRank[] = ['A', 'B', 'C', 'D'];
const CLIENT_PHASE_OPTIONS: ClientPhase[] = ['Prospecting', 'Qualification', 'Needs_Analysis', 'Proposal_Sent', 'Negotiation', 'Closed_Won', 'Closed_Lost', 'On_Hold'];

const AddClientPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<NewClientData>({
    client_name: '',
    owner_id: user?.id || '',
    client_rank: null,
    phase: null,
    client_category: '',
    website_url: '',
    registration_no: '',
    location: '',
    address: '',
    phase_date: '',
    phase_memo: '',
    business_overview: '',
    working_hours: '',
    insurance: '',
    medical_expense: '',
    bonus: '',
    allowance: '',
    sick_leave: '',
    annual_leave: '',
    probation_period: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !session) {
      toast.error('Bạn cần đăng nhập để thực hiện thao tác này');
      return;
    }

    setLoading(true);
    try {
      const clientDataToInsert = {
        client_name: formData.client_name,
        owner_id: user.id,
        client_rank: formData.client_rank,
        phase: formData.phase,
        client_category: formData.client_category || null,
        website_url: formData.website_url || null,
        registration_no: formData.registration_no || null,
        location: formData.location || null,
        address: formData.address || null,
        phase_date: formData.phase_date || null,
        phase_memo: formData.phase_memo || null,
        business_overview: formData.business_overview || null,
        working_hours: formData.working_hours || null,
        insurance: formData.insurance || null,
        medical_expense: formData.medical_expense || null,
        bonus: formData.bonus || null,
        allowance: formData.allowance || null,
        sick_leave: formData.sick_leave || null,
        annual_leave: formData.annual_leave || null,
        probation_period: formData.probation_period || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const res = await fetch('https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/clients', {
        method: 'POST',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw',
          'Authorization': session.access_token ? `Bearer ${session.access_token}` : '',
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify([clientDataToInsert])
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Insert failed');
      toast.success('Thêm client thành công!');
      navigate('/tables/clients');
    } catch (error: any) {
      console.error('Error adding client:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi thêm client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Thêm Client Mới</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="client_name" className="block text-sm font-medium text-gray-700">Tên Client *</label>
            <input type="text" name="client_name" id="client_name" value={formData.client_name} onChange={(e) => setFormData({ ...formData, client_name: e.target.value })} required className="mt-1 block w-full" />
          </div>
          <div>
            <label htmlFor="client_rank" className="block text-sm font-medium text-gray-700">Rank *</label>
            <select name="client_rank" id="client_rank" value={formData.client_rank || ''} onChange={(e) => setFormData({ ...formData, client_rank: e.target.value as ClientRank || null })} required className="mt-1 block w-full">
              <option value="">Chọn rank</option>
              {CLIENT_RANK_OPTIONS.map(rank => (<option key={rank} value={rank}>{rank}</option>))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="phase" className="block text-sm font-medium text-gray-700">Phase *</label>
            <select name="phase" id="phase" value={formData.phase || ''} onChange={(e) => setFormData({ ...formData, phase: e.target.value as ClientPhase || null })} required className="mt-1 block w-full">
              <option value="">Chọn phase</option>
              {CLIENT_PHASE_OPTIONS.map(p => (<option key={p} value={p}>{p.replace(/_/g, ' ')}</option>))}
            </select>
          </div>
          <div>
            <label htmlFor="client_category" className="block text-sm font-medium text-gray-700">Loại Client</label>
            <input type="text" name="client_category" id="client_category" value={formData.client_category} onChange={(e) => setFormData({ ...formData, client_category: e.target.value })} className="mt-1 block w-full" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="website_url" className="block text-sm font-medium text-gray-700">Website</label>
            <input type="url" name="website_url" id="website_url" value={formData.website_url} onChange={(e) => setFormData({ ...formData, website_url: e.target.value })} className="mt-1 block w-full" placeholder="https://example.com"/>
          </div>
          <div>
            <label htmlFor="registration_no" className="block text-sm font-medium text-gray-700">Mã số đăng ký</label>
            <input type="text" name="registration_no" id="registration_no" value={formData.registration_no} onChange={(e) => setFormData({ ...formData, registration_no: e.target.value })} className="mt-1 block w-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Vị trí</label>
            <input type="text" name="location" id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="mt-1 block w-full" />
          </div>
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">Địa chỉ</label>
            <input type="text" name="address" id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="mt-1 block w-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="phase_date" className="block text-sm font-medium text-gray-700">Ngày Phase</label>
            <input type="date" name="phase_date" id="phase_date" value={formData.phase_date} onChange={(e) => setFormData({ ...formData, phase_date: e.target.value })} className="mt-1 block w-full" />
          </div>
          <div>
            <label htmlFor="phase_memo" className="block text-sm font-medium text-gray-700">Ghi chú Phase</label>
            <textarea name="phase_memo" id="phase_memo" value={formData.phase_memo} onChange={(e) => setFormData({ ...formData, phase_memo: e.target.value })} rows={3} className="mt-1 block w-full"></textarea>
          </div>
        </div>

        <div>
          <label htmlFor="business_overview" className="block text-sm font-medium text-gray-700">Tổng quan doanh nghiệp</label>
          <textarea name="business_overview" id="business_overview" value={formData.business_overview} onChange={(e) => setFormData({ ...formData, business_overview: e.target.value })} rows={4} className="mt-1 block w-full"></textarea>
        </div>
        
        <fieldset className="mt-6">
          <legend className="text-base font-medium text-gray-900 mb-2">Thông tin phúc lợi</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label htmlFor="working_hours">Giờ làm việc</label><input type="text" name="working_hours" id="working_hours" value={formData.working_hours} onChange={(e) => setFormData({ ...formData, working_hours: e.target.value })} className="mt-1 block w-full" /></div>
            <div><label htmlFor="insurance">Bảo hiểm</label><input type="text" name="insurance" id="insurance" value={formData.insurance} onChange={(e) => setFormData({ ...formData, insurance: e.target.value })} className="mt-1 block w-full" /></div>
            <div><label htmlFor="medical_expense">Chi phí y tế</label><input type="text" name="medical_expense" id="medical_expense" value={formData.medical_expense} onChange={(e) => setFormData({ ...formData, medical_expense: e.target.value })} className="mt-1 block w-full" /></div>
            <div><label htmlFor="bonus">Thưởng</label><input type="text" name="bonus" id="bonus" value={formData.bonus} onChange={(e) => setFormData({ ...formData, bonus: e.target.value })} className="mt-1 block w-full" /></div>
            <div><label htmlFor="allowance">Phụ cấp</label><input type="text" name="allowance" id="allowance" value={formData.allowance} onChange={(e) => setFormData({ ...formData, allowance: e.target.value })} className="mt-1 block w-full" /></div>
            <div><label htmlFor="sick_leave">Nghỉ ốm</label><input type="text" name="sick_leave" id="sick_leave" value={formData.sick_leave} onChange={(e) => setFormData({ ...formData, sick_leave: e.target.value })} className="mt-1 block w-full" /></div>
            <div><label htmlFor="annual_leave">Nghỉ phép năm</label><input type="text" name="annual_leave" id="annual_leave" value={formData.annual_leave} onChange={(e) => setFormData({ ...formData, annual_leave: e.target.value })} className="mt-1 block w-full" /></div>
            <div><label htmlFor="probation_period">Thời gian thử việc</label><input type="text" name="probation_period" id="probation_period" value={formData.probation_period} onChange={(e) => setFormData({ ...formData, probation_period: e.target.value })} className="mt-1 block w-full" /></div>
          </div>
        </fieldset>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/tables/clients')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddClientPage; 