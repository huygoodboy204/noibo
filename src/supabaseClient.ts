import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dqnjtkbxtscjikalkajq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw'

// customFetch đã được loại bỏ để tránh vấn đề khi chuyển tab và quay lại
// Sử dụng fetch mặc định của trình duyệt để đảm bảo tính nhất quán

// noOpStorage to disable localStorage for auth tokens (as per previous setup if needed)
const noOpStorage = {
  getItem: (_key: string) => null,
  setItem: (_key: string, _value: string) => {},
  removeItem: (_key: string) => {},
};

// Define Supabase client options
// Sử dụng "public" làm schema mặc định nếu bạn không có schema khác
const options = {
  auth: {
    persistSession: true, // Cho phép lưu session vào localStorage
    autoRefreshToken: true, // Tự động refresh token
    detectSessionInUrl: true, // Hữu ích cho OAuth
    storage: noOpStorage,    // Quan trọng: giữ lại cài đặt này
  },
  db: {
    schema: 'public'
  },
  // Đã loại bỏ global.fetch config để tránh vấn đề khi chuyển tab
};

// Khởi tạo Supabase client với các options đã định nghĩa
export const supabase = createClient(supabaseUrl, supabaseAnonKey, options); 