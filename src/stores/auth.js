import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth'

function parseIdTokenEmail(token) {
  if (!token || typeof token !== 'string') return null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.email || payload.preferred_username || null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const idToken = ref(null)
  const userEmail = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!user.value)

  async function loadSession() {
    if (!import.meta.env.VITE_COGNITO_USER_POOL_ID) return
    loading.value = true
    error.value = null
    try {
      const currentUser = await getCurrentUser()
      user.value = currentUser
      const session = await fetchAuthSession()
      const token = session.tokens?.idToken?.toString() ?? null
      idToken.value = token
      userEmail.value = token ? parseIdTokenEmail(token) : null
      return currentUser
    } catch {
      user.value = null
      idToken.value = null
      userEmail.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  async function login(email, password) {
    loading.value = true
    error.value = null
    try {
      await signIn({
        username: email,
        password,
        options: { authFlowType: 'USER_PASSWORD_AUTH' },
      })
      await loadSession()
      return true
    } catch (err) {
      const message = err.message || err.name || 'Sign in failed'
      error.value = message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    loading.value = true
    error.value = null
    try {
      await signOut()
      user.value = null
      idToken.value = null
      userEmail.value = null
    } catch (err) {
      error.value = err.message
      user.value = null
      idToken.value = null
      userEmail.value = null
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    idToken,
    userEmail,
    loading,
    error,
    isAuthenticated,
    loadSession,
    login,
    logout,
  }
})
