<template>
  <div class="signup-page">
    <div class="signup-card">
      <h1>Create Account</h1>
      <p class="subtitle">Sign up to save and track your scholarship applications</p>

      <form @submit.prevent="handleSubmit" class="signup-form">
        <div v-if="auth.error" class="error-message">{{ auth.error }}</div>
        <div v-if="success" class="success-message">
          Check your email for a verification code, then confirm your account.
        </div>

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
            autocomplete="new-password"
            required
            placeholder="At least 8 characters, upper, lower, number"
          />
          <span class="hint">Min 8 chars, uppercase, lowercase, number</span>
        </div>

        <button type="submit" class="submit-btn" :disabled="auth.loading">
          {{ auth.loading ? 'Creating account…' : 'Sign Up' }}
        </button>
      </form>

      <p class="signin-link">
        Already have an account?
        <router-link to="/signin">Sign in</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signUp } from 'aws-amplify/auth'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const success = ref(false)

async function handleSubmit() {
  auth.error = null
  success.value = false
  try {
    await signUp({
      username: email.value,
      password: password.value,
      options: {
        userAttributes: {
          email: email.value,
        },
      },
    })
    success.value = true
    setTimeout(() => router.push({ path: '/confirm', query: { email: email.value } }), 1500)
  } catch (err) {
    auth.error = err.message || err.name || 'Sign up failed'
  }
}
</script>

<style scoped>
.signup-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 2rem;
}

.signup-card {
  background: white;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 400px;
}

.signup-card h1 {
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 1.75rem;
}

.subtitle {
  color: #666;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.signup-form {
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

.success-message {
  background: #efe;
  color: #060;
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

.hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: #666;
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

.signin-link {
  margin-top: 1.5rem;
  text-align: center;
  color: #666;
  font-size: 0.95rem;
}

.signin-link a {
  color: #667eea;
  font-weight: 600;
  text-decoration: none;
}

.signin-link a:hover {
  text-decoration: underline;
}
</style>
