<template>
  <div class="signin-page">
    <div class="signin-card">
      <template v-if="hasHostedUI && redirecting">
        <h1>Sign In</h1>
        <p class="subtitle">Redirecting to sign in…</p>
      </template>
      <template v-else>
        <h1>Sign In</h1>
        <p class="subtitle">Sign in to track your scholarship applications</p>

        <form @submit.prevent="handleSubmit" class="signin-form">
        <div v-if="auth.error" class="error-message">{{ auth.error }}</div>

        <div class="field">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
            placeholder="you@example.com"
          />
        </div>

        <div class="field">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            placeholder="••••••••"
          />
        </div>

        <p v-if="!hasHostedUI" class="forgot-link">
          <router-link to="/forgot-password">Forgot password?</router-link>
        </p>

        <button type="submit" class="submit-btn" :disabled="auth.loading">
          {{ auth.loading ? 'Signing in…' : 'Sign In' }}
        </button>
      </form>

        <p class="signup-link">
          Don't have an account?
          <router-link to="/signup">Sign up</router-link>
        </p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { signInWithRedirect } from 'aws-amplify/auth'
import { useAuthStore } from '../stores/auth'
import { useProfileStore } from '../stores/profile'
import { oauthDomain } from '../config/amplify'

const router = useRouter()
const auth = useAuthStore()
const profileStore = useProfileStore()

const email = ref('')
const password = ref('')
const redirecting = ref(false)

const hasHostedUI = computed(() => !!oauthDomain)

onMounted(async () => {
  if (auth.isAuthenticated) {
    router.replace('/about-you')
    return
  }
  if (!hasHostedUI.value) return
  redirecting.value = true
  auth.error = null
  try {
    await signInWithRedirect()
  } catch (err) {
    auth.error = err?.message || 'Could not open sign-in'
    redirecting.value = false
  }
})

async function handleSubmit() {
  auth.error = null
  if (auth.isAuthenticated) {
    router.replace('/about-you')
    return
  }
  try {
    await auth.login(email.value, password.value)
    try {
      await profileStore.getProfile()
    } catch {
      // Profile load failed; still navigate to Profile page
    }
    // After sign-in, always take user to Profile (About You) page
    router.replace('/about-you')
  } catch (err) {
    const msg = (err?.message || auth.error || '').toLowerCase()
    const isUnconfirmed = msg.includes('not confirmed') || msg.includes('user is not confirmed')
    if (isUnconfirmed && email.value) {
      router.replace({ path: '/confirm', query: { email: email.value } })
      return
    }
    if (auth.isAuthenticated || msg.includes('already a signed in user')) {
      auth.error = null
      router.replace('/about-you')
    }
  }
}
</script>

<style scoped>
.signin-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 2rem;
}

.signin-card {
  background: white;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 400px;
}

.signin-card h1 {
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 1.75rem;
}

.subtitle {
  color: #666;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.signin-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.error-message {
  background: #fee;
  color: #c00;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

.field label {
  display: block;
  margin-bottom: 0.35rem;
  color: #444;
  font-weight: 500;
  font-size: 0.9rem;
}

.field input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
  box-sizing: border-box;
}

.field input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.submit-btn {
  margin-top: 0.5rem;
  padding: 0.9rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.95;
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.signup-link {
  margin-top: 1.5rem;
  text-align: center;
  color: #666;
  font-size: 0.95rem;
}

.signup-link a {
  color: #667eea;
  font-weight: 600;
  text-decoration: none;
}

.signup-link a:hover {
  text-decoration: underline;
}

.forgot-link {
  margin-top: -0.25rem;
  margin-bottom: 0;
  font-size: 0.9rem;
}

.forgot-link a {
  color: #667eea;
  text-decoration: none;
}

.forgot-link a:hover {
  text-decoration: underline;
}
</style>
