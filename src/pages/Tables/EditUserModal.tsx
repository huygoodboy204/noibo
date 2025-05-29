import React, { useState, useEffect } from 'react';
import { useModalLayout } from '../../contexts/ModalLayoutContext';

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

interface UserEdit {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface EditUserModalProps {
  user: UserEdit;
  onClose: () => void;
  onSave: (updated: UserEdit) => void;
}

const ROLES = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Manager', label: 'Manager' },
  { value: 'HR', label: 'HR' },
  { value: 'Headhunter', label: 'Headhunter' },
  { value: 'BD', label: 'BD' },
  { value: 'Employee', label: 'Employee' },
];

const STATUS = [
  { value: true, label: 'Active' },
  { value: false, label: 'Inactive' },
];

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSave }) => {
  const { setIsModalOpen } = useModalLayout();
  const [form, setForm] = useState({
    full_name: user.full_name || '',
    email: user.email || '',
    role: user.role || '',
    is_active: user.is_active,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'is_active' ? value === 'true' : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      // Request 1: Update user metadata trong auth
      const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_metadata: {
            full_name: form.full_name,
            role: form.role
          },
          app_metadata: {
            role: form.role
          }
        })
      });

      if (!authRes.ok) {
        const authErr = await authRes.json();
        throw new Error(authErr.message || 'Failed to update user metadata');
      }

      // Request 2: Update user trong bảng users
      const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          role: form.role,
          is_active: form.is_active,
        }),
      });

      if (!dbRes.ok) {
        const dbErr = await dbRes.json();
        throw new Error(dbErr.message || 'Failed to update user in database');
      }

      const updatedArr = await dbRes.json();
      const updated = updatedArr && updatedArr[0];
      if (updated && updated.id) {
        onSave(updated);
      } else if (dbRes.status === 200) {
        onSave({ ...user, ...form });
      } else {
        throw new Error('Update failed: No user returned');
      }
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsModalOpen(true);
    return () => setIsModalOpen(false);
  }, [setIsModalOpen]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-fadeIn">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold">&times;</button>
        <h2 className="text-xl font-bold text-center mb-6">Edit User</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-semibold mb-1">Name</label>
            <input name="full_name" value={form.full_name} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="block font-semibold mb-1">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="block font-semibold mb-1">Role</label>
            <select name="role" value={form.role} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400" required>
              <option value="">Select role</option>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Status</label>
            <select name="is_active" value={String(form.is_active)} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400">
              {STATUS.map(s => <option key={String(s.value)} value={String(s.value)}>{s.label}</option>)}
            </select>
          </div>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg border font-semibold bg-gray-50 hover:bg-gray-100">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold shadow hover:bg-blue-700 transition-all disabled:opacity-60">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal; 