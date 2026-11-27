import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

const devSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(self)',
  'Content-Security-Policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://api.razorpay.com https://www.gstatic.com https://apis.google.com https://*.firebaseapp.com https://maps.googleapis.com https://maps.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://maps.gstatic.com https://maps.googleapis.com https://*.googleusercontent.com https://checkout.razorpay.com http://localhost:* http://127.0.0.1:*",
    "connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:* https://api.razorpay.com https://lumberjack.razorpay.com https://*.razorpay.com https://res.cloudinary.com https://*.googleapis.com https://maps.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://fcm.googleapis.com",
    "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.firebaseapp.com https://maps.google.com https://www.google.com",
    "worker-src 'self' blob:"
  ].join('; ')
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: false,
    headers: devSecurityHeaders,
  },
  preview: {
    headers: devSecurityHeaders,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@tanstack/react-router': fileURLToPath(new URL('./src/utils/tanstack-router-mock.jsx', import.meta.url))
    },
  },
})
