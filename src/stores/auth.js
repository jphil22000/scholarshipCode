import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const idToken = ref(null)
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
      idToken.value = session.tokens?.idToken?.toString() ?? null
      return currentUser
    } catch {
      user.value = null
      idToken.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  async function login(email, password) {
    loading.value = true
    error.value = null
    try {
      await signIn({ username: email, password })
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
    } catch (err) {
      error.value = err.message
      user.value = null
      idToken.value = null
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    idToken,
    loading,
    error,
    isAuthenticated,
    loadSession,
    login,
    logout,
  }
})
