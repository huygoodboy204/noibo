import { createClient } from '@supabase/supabase-js'

// Lấy URL và Anon Key từ biến môi trường (Vite)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Kiểm tra xem các biến môi trường đã được định nghĩa chưa
if (!supabaseUrl) {
  throw new Error("Supabase URL is not defined. Please check your .env file or environment variables.");
}
if (!supabaseAnonKey) {
  throw new Error("Supabase Anon Key is not defined. Please check your .env file or environment variables.");
}

// // Đối tượng storage giả không thực hiện hành động gì (no-operation)
// const noOpStorage = {
//   getItem: (key) => {
//     return null;
//   },
//   setItem: (key, value) => {
//   },
//   removeItem: (key) => {
//   },
// };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // storage: noOpStorage, // Bỏ tùy chọn storage đi
    autoRefreshToken: true,
    persistSession: false,  // Chỉ dựa vào persistSession: false
    detectSessionInUrl: true,
  },
});

// console.log('[SupabaseClient] Initialized with persistSession: false and no custom storage.'); 