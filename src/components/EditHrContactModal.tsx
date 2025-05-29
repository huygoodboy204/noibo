import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';

interface ClientInfoForHrContact {
  id: string;
  client_name: string | null;
}

interface HrContact {
  id: string;
  name: string;
  position_title?: string | null;
  email_1?: string | null;
  phone_1?: string | null;
  client_id?: string | null;
  client: ClientInfoForHrContact | ClientInfoForHrContact[] | null;
}

interface EditHrContactModalProps {
  hrContact: HrContact;
  onClose: () => void;
  onSave: (updatedHrContact: HrContact) => void;
}

const EditHrContactModal: React.FC<EditHrContactModalProps> = ({ hrContact, onClose, onSave }) => {
  const [formData, setFormData] = useState<HrContact>(hrContact);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Array<{ id: string; client_name: string }>>([]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('id, client_name')
          .order('client_name');

        if (error) throw error;
        setClients(data || []);
      } catch (error: any) {
        console.error('Error fetching clients:', error);
        toast.error('Không thể tải danh sách khách hàng');
      }
    };

    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('hr_contacts')
        .update({
          name: formData.name,
          position_title: formData.position_title,
          email_1: formData.email_1,
          phone_1: formData.phone_1,
          client_id: formData.client_id
        })
        .eq('id', formData.id);

      if (error) throw error;

      toast.success('Cập nhật thông tin liên hệ thành công');
      onSave(formData);
    } catch (error: any) {
      console.error('Error updating HR contact:', error);
      toast.error(error.message || 'Không thể cập nhật thông tin liên hệ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Chỉnh sửa thông tin liên hệ</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tên</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Chức vụ</label>
              <input
                type="text"
                value={formData.position_title || ''}
                onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.email_1 || ''}
                onChange={(e) => setFormData({ ...formData, email_1: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
              <input
                type="tel"
                value={formData.phone_1 || ''}
                onChange={(e) => setFormData({ ...formData, phone_1: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Khách hàng</label>
              <select
                value={formData.client_id || ''}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Chọn khách hàng</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.client_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditHrContactModal; 