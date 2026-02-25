<template>
  <div class="callback-page">
    <p v-if="status === 'loading'">Signing you in…</p>
    <p v-else-if="status === 'done'">Redirecting…</p>
    <p v-else-if="status === 'error'" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useProfileStore } from '../stores/profile'

const router = useRouter()
const auth = useAuthStore()
const profileStore = useProfileStore()
const status = ref('loading')
const error = ref(null)

function goHome() {
  router.replace('/')
}

onMounted(async () => {
  const redirect = router.currentRoute.value.query.redirect || '/'
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
    await profileStore.getProfile()
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
</style>
