import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabaseClient';

// Thêm type declaration cho import.meta.env
declare global {
  interface ImportMeta {
    env: {
      VITE_SUPABASE_URL: string;
      VITE_SUPABASE_ANON_KEY: string;
      VITE_SUPABASE_SERVICE_ROLE_KEY: string;
    }
  }
}

// Cập nhật lại ROLES theo enum user_role_enum trong database
const ROLES = ['BD', 'Headhunter', 'HR', 'Manager', 'Admin'] as const;
type UserRole = typeof ROLES[number];

interface FormData {
  email: string;
  full_name: string;
  role: UserRole;
}

const AddUserPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    full_name: '',
    role: 'BD',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Không có quyền truy cập');
      }

      const response = await fetch('https://dqnjtkbxtscjikalkajq.supabase.co/functions/v1/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Lỗi không xác định');
      }
      
      toast.success('Đã gửi invite thành công!');
      navigate('/tables/users');
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error(error.message || 'Gửi invite thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">Invite New User</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold mb-1 text-gray-700">Email <span className="text-red-500">*</span></label>
          <input name="email" id="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
        </div>
        <div>
          <label htmlFor="full_name" className="block text-sm font-semibold mb-1 text-gray-700">Full Name <span className="text-red-500">*</span></label>
          <input name="full_name" id="full_name" type="text" placeholder="Full Name" value={formData.full_name} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-semibold mb-1 text-gray-700">Role <span className="text-red-500">*</span></label>
          <select name="role" id="role" value={formData.role} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition">
            {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
          </select>
        </div>
        <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed">
          {isSubmitting ? 'Inviting...' : 'Invite User'}
        </button>
      </form>
    </div>
  );
};

export default AddUserPage; 