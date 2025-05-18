import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const ROLES = ['BD', 'Headhunter', 'HR', 'Manager', 'Admin'];

const AddUserPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'hr',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submit Add User form', formData);
    console.log('Fetch URL:', SUPABASE_URL);
    console.log('API KEY:', SUPABASE_ANON_KEY);
    console.log('SERVICE ROLE KEY:', SUPABASE_SERVICE_ROLE_KEY);
    setIsSubmitting(true);
    try {
      // Gửi request tạo user (REST API Supabase)
      const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY || ''}`,
          'Content-Type': 'application/json'
        } as Record<string, string>,
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          user_metadata: {
            full_name: formData.full_name,
            role: formData.role
          }
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create user');
      }
      // Lấy id từ response
      const userId = data.user?.id || data.id;
      if (!userId) throw new Error('Cannot get user id from response');
      // Insert vào bảng public.users
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY || ''}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        } as Record<string, string>,
        body: JSON.stringify({
          id: userId,
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          is_active: true
        })
      });
      if (!insertRes.ok) {
        const insertErr = await insertRes.json();
        throw new Error(insertErr.message || 'User created in auth but failed to insert in public.users');
      }
      toast.success('User created successfully!');
      setFormData({ email: '', full_name: '', role: 'HR', password: '' });
      setTimeout(() => navigate('/tables/users'), 1000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">Add New User</h2>
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
        <div>
          <label htmlFor="password" className="block text-sm font-semibold mb-1 text-gray-700">Password <span className="text-red-500">*</span></label>
          <input name="password" id="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
        </div>
        <div className="flex items-center justify-between mt-6">
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center min-w-[120px] justify-center" disabled={isSubmitting}>
            {isSubmitting && <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>}
            {isSubmitting ? 'Adding...' : 'Add User'}
          </button>
          <button type="button" className="ml-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100" onClick={() => navigate('/tables/users')}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default AddUserPage; 