import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';

// Define enum types to match database
type ClientRank = 'A' | 'B' | 'C' | 'D';
type ClientPhase = 'Prospecting' | 'Qualification' | 'Needs_Analysis' | 'Proposal_Sent' | 'Negotiation' | 'Closed_Won' | 'Closed_Lost' | 'On_Hold';

interface NewClientData {
  client_name: string;
  owner_id: string;
  client_rank: ClientRank | null;
  phase: ClientPhase | null;
  client_category: string;
  client_industry: string;
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
    client_industry: '',
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
        client_industry: formData.client_industry || null,
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
        created_by_id: user.id,
        updated_at: new Date().toISOString(),
        updated_by_id: user.id
      };

      const { error } = await supabase
        .from('clients')
        .insert([clientDataToInsert]);

      if (error) throw error;

      toast.success('Client created successfully');
      navigate('/clients');
    } catch (error: any) {
      console.error('Error creating client:', error);
      toast.error(error.message || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="border-b border-gray-200 pb-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Thêm Client Mới</h1>
            <p className="mt-2 text-base text-gray-600">Vui lòng điền đầy đủ thông tin bên dưới</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Thông tin cơ bản */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3">1</span>
                Thông tin cơ bản
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-2">Tên Client *</label>
                  <input 
                    type="text" 
                    name="client_name" 
                    id="client_name" 
                    value={formData.client_name} 
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })} 
                    required 
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                    placeholder="Nhập tên client"
                  />
                </div>
                <div>
                  <label htmlFor="client_rank" className="block text-sm font-medium text-gray-700 mb-2">Rank *</label>
                  <select 
                    name="client_rank" 
                    id="client_rank" 
                    value={formData.client_rank || ''} 
                    onChange={(e) => setFormData({ ...formData, client_rank: e.target.value as ClientRank || null })} 
                    required 
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                  >
                    <option value="">Chọn rank</option>
                    {CLIENT_RANK_OPTIONS.map(rank => (<option key={rank} value={rank}>{rank}</option>))}
                  </select>
                </div>
                <div>
                  <label htmlFor="phase" className="block text-sm font-medium text-gray-700 mb-2">Phase *</label>
                  <select 
                    name="phase" 
                    id="phase" 
                    value={formData.phase || ''} 
                    onChange={(e) => setFormData({ ...formData, phase: e.target.value as ClientPhase || null })} 
                    required 
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                  >
                    <option value="">Chọn phase</option>
                    {CLIENT_PHASE_OPTIONS.map(p => (<option key={p} value={p}>{p.replace(/_/g, ' ')}</option>))}
                  </select>
                </div>
                <div>
                  <label htmlFor="client_category" className="block text-sm font-medium text-gray-700 mb-2">Loại Client</label>
                  <input 
                    type="text" 
                    name="client_category" 
                    id="client_category" 
                    value={formData.client_category} 
                    onChange={(e) => setFormData({ ...formData, client_category: e.target.value })} 
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                    placeholder="Nhập loại client"
                  />
                </div>
                <div>
                  <label htmlFor="client_industry" className="block text-sm font-medium text-gray-700 mb-2">Ngành nghề</label>
                  <input 
                    type="text" 
                    name="client_industry" 
                    id="client_industry" 
                    value={formData.client_industry} 
                    onChange={(e) => setFormData({ ...formData, client_industry: e.target.value })} 
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                    placeholder="Nhập ngành nghề"
                  />
                </div>
              </div>
            </div>

            {/* Thông tin liên hệ */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3">2</span>
                Thông tin liên hệ
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label htmlFor="website_url" className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                  <input 
                    type="url" 
                    name="website_url" 
                    id="website_url" 
                    value={formData.website_url} 
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })} 
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label htmlFor="registration_no" className="block text-sm font-medium text-gray-700 mb-2">Mã số đăng ký</label>
                  <input 
                    type="text" 
                    name="registration_no" 
                    id="registration_no" 
                    value={formData.registration_no} 
                    onChange={(e) => setFormData({ ...formData, registration_no: e.target.value })} 
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                    placeholder="Nhập mã số đăng ký"
                  />
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">Vị trí</label>
                  <input 
                    type="text" 
                    name="location" 
                    id="location" 
                    value={formData.location} 
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                    placeholder="Nhập vị trí"
                  />
                </div>
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ</label>
                  <input 
                    type="text" 
                    name="address" 
                    id="address" 
                    value={formData.address} 
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                    placeholder="Nhập địa chỉ"
                  />
                </div>
              </div>
            </div>

            {/* Thông tin phase */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3">3</span>
                Thông tin Phase
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label htmlFor="phase_date" className="block text-sm font-medium text-gray-700 mb-2">Ngày Phase</label>
                  <input 
                    type="date" 
                    name="phase_date" 
                    id="phase_date" 
                    value={formData.phase_date} 
                    onChange={(e) => setFormData({ ...formData, phase_date: e.target.value })} 
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                  />
                </div>
                <div>
                  <label htmlFor="phase_memo" className="block text-sm font-medium text-gray-700 mb-2">Ghi chú Phase</label>
                  <textarea 
                    name="phase_memo" 
                    id="phase_memo" 
                    value={formData.phase_memo} 
                    onChange={(e) => setFormData({ ...formData, phase_memo: e.target.value })} 
                    rows={3} 
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                    placeholder="Nhập ghi chú phase"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Tổng quan doanh nghiệp */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3">4</span>
                Tổng quan doanh nghiệp
              </h2>
              <div>
                <label htmlFor="business_overview" className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
                <textarea 
                  name="business_overview" 
                  id="business_overview" 
                  value={formData.business_overview} 
                  onChange={(e) => setFormData({ ...formData, business_overview: e.target.value })} 
                  rows={4} 
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                  placeholder="Nhập mô tả doanh nghiệp"
                ></textarea>
              </div>
            </div>
            
            {/* Thông tin phúc lợi */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3">5</span>
                Thông tin phúc lợi
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label htmlFor="working_hours" className="block text-sm font-medium text-gray-700 mb-2">Giờ làm việc</label>
                  <input 
                    type="text" 
                    name="working_hours" 
                    id="working_hours" 
                    value={formData.working_hours} 
                    onChange={(e) => setFormData({ ...formData, working_hours: e.target.value })} 
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                    placeholder="Nhập giờ làm việc"
                  />
                </div>
                <div>
                  <label htmlFor="insurance" className="block text-sm font-medium text-gray-700 mb-2">Bảo hiểm</label>
                  <input 
                    type="text" 
                    name="insurance" 
                    id="insurance" 
                    value={formData.insurance} 
                    onChange={(e) => setFormData({ ...formData, insurance: e.target.value })} 
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                    placeholder="Nhập thông tin bảo hiểm"
                  />
                </div>
                <div>
                  <label htmlFor="medical_expense" className="block text-sm font-medium text-gray-700 mb-2">Chi phí y tế</label>
                  <input 
                    type="text" 
                    name="medical_expense" 
                    id="medical_expense" 
                    value={formData.medical_expense} 
                    onChange={(e) => setFormData({ ...formData, medical_expense: e.target.value })} 
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                    placeholder="Nhập chi phí y tế"
                  />
                </div>
                <div>
                  <label htmlFor="bonus" className="block text-sm font-medium text-gray-700 mb-2">Thưởng</label>
                  <input 
                    type="text" 
                    name="bonus" 
                    id="bonus" 
                    value={formData.bonus} 
                    onChange={(e) => setFormData({ ...formData, bonus: e.target.value })} 
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                    placeholder="Nhập thông tin thưởng"
                  />
                </div>
                <div>
                  <label htmlFor="allowance" className="block text-sm font-medium text-gray-700 mb-2">Phụ cấp</label>
                  <input 
                    type="text" 
                    name="allowance" 
                    id="allowance" 
                    value={formData.allowance} 
                    onChange={(e) => setFormData({ ...formData, allowance: e.target.value })} 
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                    placeholder="Nhập thông tin phụ cấp"
                  />
                </div>
                <div>
                  <label htmlFor="sick_leave" className="block text-sm font-medium text-gray-700 mb-2">Nghỉ ốm</label>
                  <input 
                    type="text" 
                    name="sick_leave" 
                    id="sick_leave" 
                    value={formData.sick_leave} 
                    onChange={(e) => setFormData({ ...formData, sick_leave: e.target.value })} 
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                    placeholder="Nhập thông tin nghỉ ốm"
                  />
                </div>
                <div>
                  <label htmlFor="annual_leave" className="block text-sm font-medium text-gray-700 mb-2">Nghỉ phép năm</label>
                  <input 
                    type="text" 
                    name="annual_leave" 
                    id="annual_leave" 
                    value={formData.annual_leave} 
                    onChange={(e) => setFormData({ ...formData, annual_leave: e.target.value })} 
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                    placeholder="Nhập thông tin nghỉ phép"
                  />
                </div>
                <div>
                  <label htmlFor="probation_period" className="block text-sm font-medium text-gray-700 mb-2">Thời gian thử việc</label>
                  <input 
                    type="text" 
                    name="probation_period" 
                    id="probation_period" 
                    value={formData.probation_period} 
                    onChange={(e) => setFormData({ ...formData, probation_period: e.target.value })} 
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                    placeholder="Nhập thời gian thử việc"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/clients')}
                className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddClientPage; 