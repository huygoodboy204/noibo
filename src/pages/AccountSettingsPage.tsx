import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

const AccountSettingsPage: React.FC = () => {
  const { user, userRole } = useAuth();
  const [formState, setFormState] = useState({
    newPassword: '',
    confirmPassword: '',
    loading: false,
    message: null as string | null,
  });
  const isSubmitting = useRef(false);

  // Reset form function
  const resetForm = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      newPassword: '',
      confirmPassword: '',
      message: null,
    }));
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    
    // Reset message and set loading
    setFormState(prev => ({
      ...prev,
      message: null,
      loading: true,
    }));
    
    try {
      // Validation
      if (formState.newPassword.length < 6) {
        setFormState(prev => ({
          ...prev,
          message: 'Mật khẩu phải có ít nhất 6 ký tự.',
          loading: false,
        }));
        isSubmitting.current = false;
        return;
      }
      if (formState.newPassword !== formState.confirmPassword) {
        setFormState(prev => ({
          ...prev,
          message: 'Mật khẩu xác nhận không khớp.',
          loading: false,
        }));
        isSubmitting.current = false;
        return;
      }

      console.log('Bắt đầu gọi API...');
      const { error } = await supabase.auth.updateUser({ password: formState.newPassword });
      console.log('API response:', error);

      if (error) {
        if (error.message?.toLowerCase().includes('same_password')) {
          setFormState(prev => ({
            ...prev,
            message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.',
            loading: false,
          }));
        } else {
          setFormState(prev => ({
            ...prev,
            message: 'Đổi mật khẩu thất bại: ' + error.message,
            loading: false,
          }));
        }
      } else {
        // Đợi một chút để AuthContext xử lý xong
        await new Promise(resolve => setTimeout(resolve, 500));
        setFormState(prev => ({
          ...prev,
          message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.',
          loading: false,
          newPassword: '',
          confirmPassword: '',
        }));

        // Xóa local storage và reload trang
        localStorage.clear();
        sessionStorage.clear();
        setTimeout(() => {
          window.location.reload();
        }, 1500); // Đợi 1.5s để người dùng đọc thông báo
      }
    } catch (err) {
      console.error('Lỗi khi đổi mật khẩu:', err);
      setFormState(prev => ({
        ...prev,
        message: err instanceof Error ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.',
        loading: false,
      }));
    } finally {
      isSubmitting.current = false;
    }
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      setFormState(prev => ({
        ...prev,
        loading: false,
        message: null,
      }));
      isSubmitting.current = false;
    };
  }, []);

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">Cài đặt tài khoản</h2>
      <div className="mb-6">
        <div className="mb-2"><b>Email:</b> {user?.email}</div>
        <div className="mb-2"><b>Tên:</b> {user?.user_metadata?.full_name || 'N/A'}</div>
        <div className="mb-2"><b>Vai trò:</b> {userRole || 'N/A'}</div>
      </div>
      <form onSubmit={handleChangePassword} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Mật khẩu mới</label>
          <input
            type="password"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 disabled:bg-gray-100"
            value={formState.newPassword}
            onChange={e => setFormState(prev => ({ ...prev, newPassword: e.target.value }))}
            required
            minLength={6}
            disabled={formState.loading}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Xác nhận mật khẩu mới</label>
          <input
            type="password"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 disabled:bg-gray-100"
            value={formState.confirmPassword}
            onChange={e => setFormState(prev => ({ ...prev, confirmPassword: e.target.value }))}
            required
            minLength={6}
            disabled={formState.loading}
          />
        </div>
        <button
          type="submit"
          className={`w-full py-2 px-4 rounded-lg transition ${
            formState.loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          disabled={formState.loading}
        >
          {formState.loading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang xử lý...
            </div>
          ) : 'Đổi mật khẩu'}
        </button>
        {formState.message && (
          <div className={`mt-2 text-center ${formState.message.includes('thành công') ? 'text-green-600' : 'text-red-600'}`}>
            {formState.message}
          </div>
        )}
      </form>
    </div>
  );
};

export default AccountSettingsPage;