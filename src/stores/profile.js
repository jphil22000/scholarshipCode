import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const defaultProfile = () => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  highSchool: '',
  gpa: '',
  graduationYear: '',
  intendedMajor: '',
  ethnicity: '',
  gender: '',
  bio: '',
  plan: 'free', // 'free' | 'pro' – only pro can use application tracking
  isAdmin: false, // set to true in DynamoDB or via admin to grant dashboard access
})

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const API_PROFILE = API_BASE ? `${API_BASE}/profile` : '/api/profile'

function parseJsonOrThrow(res, context) {
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(
      context === 'save'
        ? 'Profile service unavailable. The server returned a page instead of data. If running locally, start the backend with: npm start (port 3003).'
        : 'Profile service unavailable. If running locally, start the backend with: npm start (port 3003).'
    )
  }
  return res.json()
}

async function getAuthHeaders() {
  try {
    const { useAuthStore } = await import('./auth')
    const auth = useAuthStore()
    const token = auth?.idToken?.value ?? auth?.idToken
    if (token && typeof token === 'string') return { Authorization: `Bearer ${token}` }
    if (auth?.isAuthenticated) {
      await auth.loadSession()
      const t = auth.idToken?.value ?? auth.idToken
      if (t && typeof t === 'string') return { Authorization: `Bearer ${t}` }
    }
  } catch {
    // auth store not ready or no Cognito
  }
  return {}
}

export const useProfileStore = defineStore('profile', () => {
  const profile = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const hasProfile = computed(() => {
    const p = profile.value
    if (!p) return false
    return !!(p.firstName?.trim() && p.lastName?.trim() && p.email?.trim())
  })

  const plan = computed(() => profile.value?.plan === 'pro' ? 'pro' : 'free')
  const isPaid = computed(() => plan.value === 'pro')
  const isAdmin = computed(() => profile.value?.isAdmin === true)

  async function getProfile() {
    loading.value = true
    error.value = null
    try {
      let headers = await getAuthHeaders()
      let res = await fetch(API_PROFILE, {
        credentials: 'omit',
        headers: { ...headers, Accept: 'application/json' },
      })
      if ((res.status === 401 || res.status === 503) && !headers.Authorization) {
        const { useAuthStore } = await import('./auth')
        const auth = useAuthStore()
        await auth.loadSession()
        headers = await getAuthHeaders()
        if (headers.Authorization) {
          res = await fetch(API_PROFILE, {
            credentials: 'omit',
            headers: { ...headers, Accept: 'application/json' },
          })
        }
      }
      if (res.status === 401 || res.status === 503) {
        profile.value = null
        return { ...defaultProfile() }
      }
      if (!res.ok) throw new Error(res.statusText)
      const data = await parseJsonOrThrow(res, 'get')
      const merged = { ...defaultProfile(), ...(data && typeof data === 'object' ? data : {}) }
      profile.value = merged
      return merged
    } catch (err) {
      const msg = err instanceof SyntaxError ? 'Profile service unavailable. Is the backend running? (npm start on port 3003)' : err.message
      error.value = msg
      profile.value = null
      return { ...defaultProfile() }
    } finally {
      loading.value = false
    }
  }

  async function saveProfile(data) {
    loading.value = true
    error.value = null
    try {
      const headers = await getAuthHeaders()
      const body = { ...defaultProfile(), ...data }
      const res = await fetch(API_PROFILE, {
        method: 'PUT',
        credentials: 'omit',
        headers: { ...headers, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        let errBody = {}
        try {
          const ct = res.headers.get('content-type') || ''
          if (ct.includes('application/json')) errBody = await res.json()
        } catch {
          // ignore
        }
        throw new Error(errBody.message || errBody.error || res.statusText)
      }
      const saved = await parseJsonOrThrow(res, 'save')
      profile.value = { ...defaultProfile(), ...saved }
      return profile.value
    } catch (err) {
      const msg = err instanceof SyntaxError
        ? 'Profile service unavailable. The server returned a page instead of data. If running locally, start the backend with: npm start (port 3003).'
        : err.message
      error.value = msg
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    profile,
    loading,
    error,
    hasProfile,
    plan,
    isPaid,
    isAdmin,
    getProfile,
    saveProfile,
  }
})
