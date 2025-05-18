/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Đảm bảo bao gồm tất cả các file source của bạn
  ],
  darkMode: 'class', // Hoặc 'media' nếu bạn không dùng class-based dark mode
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#FFC0CB', // Placeholder: Light Pink
          DEFAULT: '#FF69B4', // Placeholder: HotPink
          dark: '#FF1493',  // Placeholder: DeepPink
        },
        // Bạn có thể thêm các màu tùy chỉnh khác ở đây
      },
      // Mở rộng các thuộc tính theme khác nếu cần (font, spacing, etc.)
    },
  },
  plugins: [
    // Thêm các plugin Tailwind nếu template của bạn có sử dụng
    // ví dụ: require('@tailwindcss/forms'), require('@tailwindcss/typography')
  ],
}; 