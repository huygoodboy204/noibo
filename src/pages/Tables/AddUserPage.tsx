import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const ROLES = ['admin', 'hr', 'client', 'candidate'];

const AddUserPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'hr',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Gửi request tạo user (REST API Supabase)
      const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || ''}`,
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
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }
      toast.success('User created successfully!');
      setFormData({ email: '', full_name: '', role: 'hr', password: '' });
      setTimeout(() => navigate('/tables/users'), 1000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Add User</h2>
      <form onSubmit={handleSubmit}>
        <input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} required className="mb-3 w-full border rounded px-3 py-2" />
        <input name="full_name" type="text" placeholder="Full Name" value={formData.full_name} onChange={handleChange} required className="mb-3 w-full border rounded px-3 py-2" />
        <select name="role" value={formData.role} onChange={handleChange} className="mb-3 w-full border rounded px-3 py-2">
          {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
        </select>
        <input name="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} required className="mb-3 w-full border rounded px-3 py-2" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add User'}
        </button>
        <button type="button" className="ml-2 px-4 py-2 rounded border" onClick={() => navigate('/tables/users')}>Cancel</button>
      </form>
    </div>
  );
};

export default AddUserPage; 