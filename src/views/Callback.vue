<template>
  <div class="callback-page">
    <p v-if="status === 'loading'">Signing you in…</p>
    <p v-else-if="status === 'done'">Redirecting…</p>
    <template v-else-if="status === 'error'">
      <p class="error">{{ error }}</p>
      <p v-if="callbackUrlHint" class="hint">{{ callbackUrlHint }}</p>
      <button type="button" class="back-btn" @click="goHome">Back to Home</button>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useProfileStore } from '../stores/profile'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const profileStore = useProfileStore()
const status = ref('loading')
const error = ref(null)

const callbackUrlHint = computed(() => {
  const q = route.query
  if (q.error === 'invalid_redirect_uri' || q.error === 'redirect_mismatch' || q.error_description?.toLowerCase().includes('redirect')) {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `Add this callback URL in AWS Cognito → User Pools → App integration → Your app → Hosted UI: ${origin}/callback`
  }
  return null
})

function goHome() {
  router.replace('/')
}

onMounted(async () => {
  const query = route.query
  if (query.error) {
    error.value = query.error_description || query.error || 'Sign-in was not completed.'
    status.value = 'error'
    return
  }

  const redirect = query.redirect || '/about-you'
  const maxWait = 5000
  const step = 200
  let waited = 0
  while (!auth.isAuthenticated && waited < maxWait) {
    await auth.loadSession()
    if (auth.isAuthenticated) break
    await new Promise(r => setTimeout(r, step))
    waited += step
  }
  if (auth.isAuthenticated) {
    try {
      await profileStore.getProfile()
    } catch {
      // Profile load failed; still go to Profile page
    }
    status.value = 'done'
    setTimeout(() => router.replace(redirect), 300)
  } else {
    error.value = 'Sign-in was not completed. Try again.'
    status.value = 'error'
    setTimeout(goHome, 3000)
  }
})
</script>

<style scoped>
.callback-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 2rem;
}
.callback-page p {
  color: #333;
  font-size: 1.1rem;
}
.callback-page .error {
  color: #c00;
}
.callback-page .hint {
  font-size: 0.9rem;
  color: #555;
  margin-top: 0.5rem;
  max-width: 400px;
}
.callback-page .back-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: #667eea;
  color: white;
  border: none;
  cursor: pointer;
}
</style>
