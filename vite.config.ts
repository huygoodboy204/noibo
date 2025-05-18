import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/tdc/',
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        // This will transform your SVG to a React component
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  build: {
    // Bỏ qua lỗi TypeScript khi build
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'TS2307') return
        warn(warning)
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
