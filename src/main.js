import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import axios from 'axios'
import { useAuthStore } from './stores/auth'
import './config/amplify'
import 'aws-amplify/auth/enable-oauth-listener'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Attach Cognito id token to API requests when available
axios.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.idToken) config.headers.Authorization = `Bearer ${auth.idToken}`
  return config
})

// Log uncaught errors to admin error tracking (fire-and-forget)
const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
app.config.errorHandler = (err, instance, info) => {
  console.error(err, info)
  const url = apiBase ? `${apiBase}/errors` : '/api/errors'
  const payload = {
    message: err?.message || String(err),
    stack: err?.stack,
    url: typeof window !== 'undefined' ? window.location.href : null,
    context: { info },
  }
  const auth = useAuthStore()
  const token = auth?.idToken?.value ?? auth?.idToken
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  fetch(url, { method: 'POST', credentials: 'include', headers, body: JSON.stringify(payload) }).catch(() => {})
}

app.mount('#app')
