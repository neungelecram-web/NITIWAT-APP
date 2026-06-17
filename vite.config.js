import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' = ใช้ path แบบสัมพัทธ์ ทำให้ใช้งานได้ทั้งบนเครื่อง
// และบน GitHub Pages (เสิร์ฟที่ user.github.io/ชื่อ-repo/) โดยไม่ต้องระบุชื่อ repo
export default defineConfig({
  plugins: [react()],
  base: './',
})
