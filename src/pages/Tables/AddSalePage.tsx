import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

const PAYMENT_STATUS_OPTIONS = ['Pending', 'Paid', 'Partially_Paid', 'Overdue', 'Cancelled', 'Refunded'] as const;
const GUARANTEE_PERIOD_OPTIONS = ['30_Days', '60_Days', '90_Days', 'None', 'Other'] as const;

type PaymentStatus = typeof PAYMENT_STATUS_OPTIONS[number];
type GuaranteePeriod = typeof GUARANTEE_PERIOD_OPTIONS[number];

interface FormData {
  process_id: string;
  client_id: string;
  hr_contact_id: string;
  job_id: string;
  candidate_id: string;
  job_owner_id: string;
  candidate_owner_id: string;
  handled_by_id: string;
  entry_route: string;
  visa_type: string[];
  offered_monthly_salary: number;
  salary_calc_month: number;
  annual_salary: number;
  offered_allowance: number;
  allowance_calc_month: number;
  annual_allowance: number;
  total_invoice_salary: number;
  fee_percent: number;
  fee_amount: number;
  tax: number;
  total_with_tax: number;
  guarantee_period: GuaranteePeriod;
  start_date: string;
  payment_due_date: string;
  guarantee_end_date: string;
  invoice_date: string;
  payment_status: PaymentStatus;
  payment_received_date: string;
  hard_copy: boolean;
  accounting_no: string;
  billing_same_as_client: boolean;
  billing_name: string;
  billing_address: string;
  billing_email: string;
  billing_phone: string;
  billing_attention: string;
  credit_note_reason: string;
  credit_total_fee: number;
  refund_percent: number;
  refund_amount: number;
  credit_tax: number;
  credit_total_amount: number;
  credit_note_date: string;
}

const AddSalePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Array<{ id: string; client_name: string }>>([]);
  const [jobs, setJobs] = useState<Array<{ id: string; position_title: string }>>([]);
  const [candidates, setCandidates] = useState<Array<{ id: string; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [formData, setFormData] = useState<FormData>({
    process_id: '',
    client_id: '',
    hr_contact_id: '',
    job_id: '',
    candidate_id: '',
    job_owner_id: '',
    candidate_owner_id: '',
    handled_by_id: '',
    entry_route: '',
    visa_type: [],
    offered_monthly_salary: 0,
    salary_calc_month: 12,
    annual_salary: 0,
    offered_allowance: 0,
    allowance_calc_month: 12,
    annual_allowance: 0,
    total_invoice_salary: 0,
    fee_percent: 0,
    fee_amount: 0,
    tax: 0,
    total_with_tax: 0,
    guarantee_period: 'None',
    start_date: '',
    payment_due_date: '',
    guarantee_end_date: '',
    invoice_date: '',
    payment_status: 'Pending',
    payment_received_date: '',
    hard_copy: false,
    accounting_no: '',
    billing_same_as_client: true,
    billing_name: '',
    billing_address: '',
    billing_email: '',
    billing_phone: '',
    billing_attention: '',
    credit_note_reason: '',
    credit_total_fee: 0,
    refund_percent: 0,
    refund_amount: 0,
    credit_tax: 0,
    credit_total_amount: 0,
    credit_note_date: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch clients
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, client_name')
          .order('client_name');

        // Fetch jobs
        const { data: jobsData } = await supabase
          .from('jobs')
          .select('id, position_title')
          .order('position_title');

        // Fetch candidates
        const { data: candidatesData } = await supabase
          .from('candidates')
          .select('id, name')
          .order('name');

        // Fetch users
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name')
          .order('full_name');

        if (clientsData) setClients(clientsData);
        if (jobsData) setJobs(jobsData);
        if (candidatesData) setCandidates(candidatesData);
        if (usersData) setUsers(usersData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Error loading form data');
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !session) {
      toast.error('Bạn cần đăng nhập để thực hiện thao tác này');
      return;
    }

    setLoading(true);
    try {
      const saleDataToInsert = {
        client_id: formData.client_id,
        job_id: formData.job_id,
        owner_id: user.id,
        created_by_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('sales')
        .insert([saleDataToInsert]);

      if (error) throw error;

      toast.success('Sale created successfully');
      navigate('/sales');
    } catch (error: any) {
      console.error('Error creating sale:', error);
      toast.error(error.message || 'Failed to create sale');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Add New Sale</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Client *</label>
            <select
              name="client_id"
              value={formData.client_id}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-4 py-2"
            >
              <option value="">Select Client</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.client_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Job *</label>
            <select
              name="job_id"
              value={formData.job_id}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-4 py-2"
            >
              <option value="">Select Job</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>
                  {job.position_title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Candidate *</label>
            <select
              name="candidate_id"
              value={formData.candidate_id}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-4 py-2"
            >
              <option value="">Select Candidate</option>
              {candidates.map(candidate => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Handler *</label>
            <select
              name="handled_by_id"
              value={formData.handled_by_id}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-4 py-2"
            >
              <option value="">Select Handler</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Fee Amount *</label>
            <input
              type="number"
              name="fee_amount"
              value={formData.fee_amount}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="w-full border rounded-lg px-4 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Payment Status *</label>
            <select
              name="payment_status"
              value={formData.payment_status}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-4 py-2"
            >
              <option value="">Select Status</option>
              {PAYMENT_STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Invoice Date</label>
            <input
              type="date"
              name="invoice_date"
              value={formData.invoice_date}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-2"
            />
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={() => navigate('/tables/sales')}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSalePage; 