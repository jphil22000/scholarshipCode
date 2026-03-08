<template>
  <div class="forgot-page">
    <div class="forgot-card">
      <h1>Reset password</h1>
      <p class="subtitle">
        {{ step === 'request' ? 'Enter your email and we’ll send you a code to reset your password.' : `Enter the code we sent to ${email} and your new password.` }}
      </p>

      <template v-if="step === 'request'">
        <form @submit.prevent="requestCode" class="forgot-form">
          <div v-if="error" class="error-message">{{ error }}</div>
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
          <button type="submit" class="submit-btn" :disabled="loading">
            {{ loading ? 'Sending…' : 'Send code' }}
          </button>
        </form>
      </template>

      <template v-else>
        <form @submit.prevent="confirmReset" class="forgot-form">
          <div v-if="error" class="error-message">{{ error }}</div>
          <div v-if="success" class="success-message">Password reset. Redirecting to sign in…</div>
          <div class="field">
            <label for="code">Verification code</label>
            <input
              id="code"
              v-model="code"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              required
              placeholder="123456"
              maxlength="6"
            />
          </div>
          <div class="field">
            <label for="newPassword">New password</label>
            <input
              id="newPassword"
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
              required
              placeholder="••••••••"
              minlength="8"
            />
          </div>
          <button type="submit" class="submit-btn" :disabled="loading">
            {{ loading ? 'Resetting…' : 'Reset password' }}
          </button>
        </form>
      </template>

      <p class="back-link">
        <router-link to="/signin">Back to Sign In</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth'

const route = useRoute()
const router = useRouter()

const step = ref('request')
const email = ref(route.query.email || '')
const code = ref('')
const newPassword = ref('')
const loading = ref(false)
const error = ref(null)
const success = ref(false)

async function requestCode() {
  error.value = null
  loading.value = true
  try {
    await resetPassword({ username: email.value })
    step.value = 'confirm'
  } catch (err) {
    error.value = err.message || err.name || 'Could not send code'
  } finally {
    loading.value = false
  }
}

async function confirmReset() {
  error.value = null
  success.value = false
  loading.value = true
  try {
    await confirmResetPassword({
      username: email.value,
      confirmationCode: code.value,
      newPassword: newPassword.value,
    })
    success.value = true
    setTimeout(() => router.push('/signin'), 1500)
  } catch (err) {
    error.value = err.message || err.name || 'Could not reset password'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.forgot-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 2rem;
}

.forgot-card {
  background: white;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 400px;
}

.forgot-card h1 {
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 1.75rem;
}

.subtitle {
  color: #666;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.forgot-form {
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

.back-link {
  margin-top: 1.5rem;
  text-align: center;
  color: #666;
  font-size: 0.95rem;
}

.back-link a {
  color: #667eea;
  font-weight: 600;
  text-decoration: none;
}

.back-link a:hover {
  text-decoration: underline;
}
</style>
