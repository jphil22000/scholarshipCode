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
})

const API_PROFILE = '/api/profile'

async function getAuthHeaders() {
  try {
    const { useAuthStore } = await import('./auth')
    const auth = useAuthStore()
    if (auth?.idToken) return { Authorization: `Bearer ${auth.idToken}` }
    if (auth?.isAuthenticated && !auth?.idToken) {
      await auth.loadSession()
      if (auth.idToken) return { Authorization: `Bearer ${auth.idToken}` }
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

  async function getProfile() {
    loading.value = true
    error.value = null
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(API_PROFILE, {
        credentials: 'include',
        headers: { ...headers, Accept: 'application/json' },
      })
      if (res.status === 401 || res.status === 503) {
        profile.value = null
        return { ...defaultProfile() }
      }
      if (!res.ok) throw new Error(res.statusText)
      const data = await res.json()
      const merged = { ...defaultProfile(), ...(data && typeof data === 'object' ? data : {}) }
      profile.value = merged
      return merged
    } catch (err) {
      error.value = err.message
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
        credentials: 'include',
        headers: { ...headers, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.message || errBody.error || res.statusText)
      }
      const saved = await res.json()
      profile.value = { ...defaultProfile(), ...saved }
      return profile.value
    } catch (err) {
      error.value = err.message
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
    getProfile,
    saveProfile,
  }
})
