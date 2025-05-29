import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

export default function SetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const token = params.get("token");
  const type = params.get("type");

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!token || type !== "invite") {
      setMessage("Link không hợp lệ hoặc đã hết hạn.");
      setLoading(false);
      return;
    }

    // Gọi Supabase API để đặt mật khẩu mới
    // Sử dụng API cũ cho token invite
    // @ts-ignore
    const { data, error } = await supabase.auth.api.updateUser(token, { password });

    if (error) {
      setMessage("Có lỗi xảy ra: " + error.message);
    } else {
      setMessage("Đặt mật khẩu thành công! Đang chuyển sang trang đăng nhập...");
      setTimeout(() => navigate("/signin"), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Đặt mật khẩu mới</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 mb-4"
            placeholder="Nhập mật khẩu mới"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded font-semibold"
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : "Đặt mật khẩu"}
          </button>
        </form>
        {message && (
          <div className="mt-4 text-center text-red-500">{message}</div>
        )}
      </div>
    </div>
  );
} 