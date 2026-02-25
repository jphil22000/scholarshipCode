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

app.mount('#app')
