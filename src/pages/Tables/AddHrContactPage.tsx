import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

interface Client {
  id: string;
  client_name: string;
}

interface NewHrContactData {
  client_id: string;
  name: string;
  position_title: string;
  zip_code: string;
  address: string;
  phone_1: string;
  phone_2: string;
  email_1: string;
  email_2: string;
  division: string;
  newsletter: string[];
  key_person: boolean;
  memo: string;
}

export default function AddHrContactPage() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState<NewHrContactData>({
    client_id: '',
    name: '',
    position_title: '',
    zip_code: '',
    address: '',
    phone_1: '',
    phone_2: '',
    email_1: '',
    email_2: '',
    division: '',
    newsletter: [],
    key_person: false,
    memo: ''
  });

  // Fetch clients for dropdown
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch('https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/clients', {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw',
            'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
            'Prefer': 'return=representation'
          }
        });
        const data = await res.json();
        if (!res.ok) throw new Error('Không thể tải danh sách clients');
        setClients(data || []);
      } catch (error) {
        console.error('Error fetching clients:', error);
        toast.error('Không thể tải danh sách clients');
      }
    };
    fetchClients();
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !session) {
      toast.error('Bạn cần đăng nhập để thực hiện thao tác này');
      return;
    }

    setLoading(true);
    try {
      const hrContactDataToInsert = {
        ...formData,
        created_by_id: user.id,
        updated_by_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const res = await fetch('https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/hr_contacts', {
        method: 'POST',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw',
          'Authorization': session.access_token ? `Bearer ${session.access_token}` : '',
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify([hrContactDataToInsert])
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Insert failed');
      toast.success('Thêm HR contact thành công!');
      navigate('/tables/hr-contacts');
    } catch (error: any) {
      console.error('Error adding HR contact:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi thêm HR contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Thêm HR Contact Mới</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="client_id" className="block text-sm font-medium text-gray-700">Client *</label>
            <select
              id="client_id"
              name="client_id"
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Chọn client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.client_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Tên *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="position_title" className="block text-sm font-medium text-gray-700">Chức vụ</label>
            <input
              type="text"
              id="position_title"
              name="position_title"
              value={formData.position_title}
              onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="division" className="block text-sm font-medium text-gray-700">Phòng ban</label>
            <input
              type="text"
              id="division"
              name="division"
              value={formData.division}
              onChange={(e) => setFormData({ ...formData, division: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="phone_1" className="block text-sm font-medium text-gray-700">Số điện thoại 1</label>
            <input
              type="tel"
              id="phone_1"
              name="phone_1"
              value={formData.phone_1}
              onChange={(e) => setFormData({ ...formData, phone_1: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="phone_2" className="block text-sm font-medium text-gray-700">Số điện thoại 2</label>
            <input
              type="tel"
              id="phone_2"
              name="phone_2"
              value={formData.phone_2}
              onChange={(e) => setFormData({ ...formData, phone_2: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="email_1" className="block text-sm font-medium text-gray-700">Email 1</label>
            <input
              type="email"
              id="email_1"
              name="email_1"
              value={formData.email_1}
              onChange={(e) => setFormData({ ...formData, email_1: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="email_2" className="block text-sm font-medium text-gray-700">Email 2</label>
            <input
              type="email"
              id="email_2"
              name="email_2"
              value={formData.email_2}
              onChange={(e) => setFormData({ ...formData, email_2: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700">Mã bưu điện</label>
            <input
              type="text"
              id="zip_code"
              name="zip_code"
              value={formData.zip_code}
              onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">Địa chỉ</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="memo" className="block text-sm font-medium text-gray-700">Ghi chú</label>
          <textarea
            id="memo"
            name="memo"
            rows={3}
            value={formData.memo}
            onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Nhập ghi chú về HR contact..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Newsletter đăng ký</label>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="newsletter_jobs"
                checked={formData.newsletter.includes('jobs')}
                onChange={(e) => {
                  const newNewsletter = e.target.checked
                    ? [...formData.newsletter, 'jobs']
                    : formData.newsletter.filter(n => n !== 'jobs');
                  setFormData({ ...formData, newsletter: newNewsletter });
                }}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="newsletter_jobs" className="ml-2 block text-sm text-gray-900">
                Thông tin việc làm
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="newsletter_events"
                checked={formData.newsletter.includes('events')}
                onChange={(e) => {
                  const newNewsletter = e.target.checked
                    ? [...formData.newsletter, 'events']
                    : formData.newsletter.filter(n => n !== 'events');
                  setFormData({ ...formData, newsletter: newNewsletter });
                }}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="newsletter_events" className="ml-2 block text-sm text-gray-900">
                Sự kiện
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="newsletter_updates"
                checked={formData.newsletter.includes('updates')}
                onChange={(e) => {
                  const newNewsletter = e.target.checked
                    ? [...formData.newsletter, 'updates']
                    : formData.newsletter.filter(n => n !== 'updates');
                  setFormData({ ...formData, newsletter: newNewsletter });
                }}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="newsletter_updates" className="ml-2 block text-sm text-gray-900">
                Cập nhật công ty
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="key_person"
            name="key_person"
            checked={formData.key_person}
            onChange={(e) => setFormData({ ...formData, key_person: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="key_person" className="ml-2 block text-sm text-gray-900">
            Là người liên hệ chính
          </label>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/tables/hr-contacts')}
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
} 