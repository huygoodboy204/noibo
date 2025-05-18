import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

interface AddSaleModalProps {
  onClose: () => void;
  onAdded: () => void;
}

// Enum options (có thể lấy từ scripts hoặc hardcode)
const PAYMENT_STATUS_OPTIONS = [
  'Pending', 'Paid', 'Partially_Paid', 'Overdue', 'Cancelled', 'Refunded',
];
const GUARANTEE_PERIOD_OPTIONS = [
  '30_Days', '60_Days', '90_Days', 'None', 'Other',
];

// Interface cho dropdown options
interface ClientOption {
  id: string;
  client_name: string;
}
interface JobOption {
  id: string;
  position_title: string;
}
interface CandidateOption {
  id: string;
  name: string;
}
interface UserOption {
  id: string;
  full_name: string;
}

const AddSaleModal: React.FC<AddSaleModalProps> = ({ onClose, onAdded }) => {
  const { session } = useAuth();
  const [form, setForm] = useState<any>({
    process_id: '',
    client_id: '',
    hr_contact_id: '',
    job_id: '',
    candidate_id: '',
    job_owner_id: '',
    candidate_owner_id: '',
    handled_by_id: '',
    entry_route: '',
    visa_type: '',
    offered_monthly_salary: '',
    salary_calc_month: '',
    annual_salary: '',
    offered_allowance: '',
    allowance_calc_month: '',
    annual_allowance: '',
    total_invoice_salary: '',
    fee_percent: '',
    fee_amount: '',
    tax: '',
    total_with_tax: '',
    guarantee_period: '',
    start_date: '',
    payment_due_date: '',
    guarantee_end_date: '',
    invoice_date: '',
    payment_status: '',
    payment_received_date: '',
    hard_copy: false,
    accounting_no: '',
    billing_same_as_client: false,
    billing_name: '',
    billing_address: '',
    billing_email: '',
    billing_phone: '',
    billing_attention: '',
    credit_note_reason: '',
    credit_total_fee: '',
    refund_percent: '',
    refund_amount: '',
    credit_tax: '',
    credit_total_amount: '',
    credit_note_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State cho dropdown options
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  // Fetch dropdown options khi component mount hoặc khi session.access_token thay đổi
  useEffect(() => {
    if (!session?.access_token) return;
    const fetchOptions = async () => {
      try {
        const headers = {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        };
        // Fetch clients
        const clientsRes = await fetch('https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/clients?select=id,client_name', { headers });
        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          setClients(clientsData);
        }
        // Fetch jobs
        const jobsRes = await fetch('https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/jobs?select=id,position_title', { headers });
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          setJobs(jobsData);
        }
        // Fetch candidates
        const candidatesRes = await fetch('https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/candidates?select=id,name', { headers });
        if (candidatesRes.ok) {
          const candidatesData = await candidatesRes.json();
          setCandidates(candidatesData);
        }
        // Fetch users
        const usersRes = await fetch('https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/users?select=id,full_name', { headers });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        }
      } catch (err) {
        console.error('Error fetching dropdown options:', err);
      }
    };
    fetchOptions();
  }, [session?.access_token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let fieldValue: any = value;
    if (type === 'checkbox' && 'checked' in e.target) {
      fieldValue = (e.target as HTMLInputElement).checked;
    }
    setForm((prev: any) => ({ ...prev, [name]: fieldValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Validate cơ bản
      if (!form.client_id || !form.job_id || !form.candidate_id) {
        setError('Client, Job, Candidate là bắt buộc');
        setLoading(false);
        return;
      }
      // Chuẩn hóa dữ liệu
      const body = { ...form };
      // Loại bỏ các trường UUID rỗng
      [
        'client_id', 'job_id', 'candidate_id', 'handled_by_id', 'hr_contact_id', 'job_owner_id', 'candidate_owner_id', 'process_id'
      ].forEach(key => {
        if (!body[key] || body[key] === '') {
          delete body[key];
        }
      });
      // Loại bỏ các trường rỗng khác
      Object.keys(body).forEach(key => {
        if (
          body[key] === '' ||
          body[key] === null ||
          (Array.isArray(body[key]) && body[key].length === 0)
        ) {
          delete body[key];
        }
      });
      // Xử lý kiểu số
      [
        'offered_monthly_salary', 'salary_calc_month', 'annual_salary', 'offered_allowance', 'allowance_calc_month', 'annual_allowance', 'total_invoice_salary', 'fee_percent', 'fee_amount', 'tax', 'total_with_tax', 'credit_total_fee', 'refund_percent', 'refund_amount', 'credit_tax', 'credit_total_amount'
      ].forEach(key => {
        if (body[key] !== undefined && body[key] !== null && body[key] !== '') body[key] = Number(body[key]);
        else delete body[key];
      });
      // Xử lý kiểu boolean
      ['hard_copy', 'billing_same_as_client'].forEach(key => {
        if (typeof body[key] !== 'boolean') body[key] = !!body[key];
      });
      // Xử lý mảng visa_type
      if (body.visa_type && typeof body.visa_type === 'string') {
        body.visa_type = body.visa_type.split(',').map((v: string) => v.trim()).filter(Boolean);
      }
      // Gửi request
      const res = await fetch('https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/sales', {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify([body]),
      });
      if (!res.ok) throw new Error('Tạo sale thất bại');
      onAdded();
    } catch (err: any) {
      setError(err.message || 'Tạo sale thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">×</button>
        <h2 className="text-xl font-bold mb-4">Add Sale</h2>
        <form onSubmit={handleSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Client *</label>
              <select name="client_id" value={form.client_id} onChange={handleChange} className="w-full border rounded px-2 py-1" required>
                <option value="">Chọn client</option>
                {clients.map(client => <option key={client.id} value={client.id}>{client.client_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Job *</label>
              <select name="job_id" value={form.job_id} onChange={handleChange} className="w-full border rounded px-2 py-1" required>
                <option value="">Chọn job</option>
                {jobs.map(job => <option key={job.id} value={job.id}>{job.position_title}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Candidate *</label>
              <select name="candidate_id" value={form.candidate_id} onChange={handleChange} className="w-full border rounded px-2 py-1" required>
                <option value="">Chọn candidate</option>
                {candidates.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Handler</label>
              <select name="handled_by_id" value={form.handled_by_id} onChange={handleChange} className="w-full border rounded px-2 py-1">
                <option value="">Chọn handler</option>
                {users.map(user => <option key={user.id} value={user.id}>{user.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Fee Amount</label>
              <input name="fee_amount" value={form.fee_amount} onChange={handleChange} className="w-full border rounded px-2 py-1" type="number" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Payment Status</label>
              <select name="payment_status" value={form.payment_status} onChange={handleChange} className="w-full border rounded px-2 py-1">
                <option value="">Chọn trạng thái</option>
                {PAYMENT_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Invoice Date</label>
              <input name="invoice_date" value={form.invoice_date} onChange={handleChange} className="w-full border rounded px-2 py-1" type="date" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Guarantee Period</label>
              <select name="guarantee_period" value={form.guarantee_period} onChange={handleChange} className="w-full border rounded px-2 py-1">
                <option value="">Chọn</option>
                {GUARANTEE_PERIOD_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            {/* Thêm các trường khác nếu muốn */}
          </div>
          {/* Có thể mở rộng thêm các trường khác ở đây */}
          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          <div className="flex gap-2 mt-4 justify-end">
            <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded">Cancel</button>
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">{loading ? 'Saving...' : 'Add Sale'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSaleModal; 