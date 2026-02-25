<template>
  <div class="confirm-page">
    <div class="confirm-card">
      <h1>Confirm Your Email</h1>
      <p class="subtitle">We sent a 6-digit code to {{ email }}. Enter it below.</p>

      <form @submit.prevent="handleSubmit" class="confirm-form">
        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">Account confirmed. Redirecting to sign in…</div>

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

        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? 'Confirming…' : 'Confirm' }}
        </button>
      </form>

      <p class="signin-link">
        <router-link to="/signin">Back to Sign In</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { confirmSignUp } from 'aws-amplify/auth'

const route = useRoute()
const router = useRouter()

const email = ref(route.query.email || '')
const code = ref('')
const loading = ref(false)
const error = ref(null)
const success = ref(false)

onMounted(() => {
  if (!email.value) router.replace('/signup')
})

async function handleSubmit() {
  error.value = null
  loading.value = true
  try {
    await confirmSignUp({ username: email.value, confirmationCode: code.value })
    success.value = true
    setTimeout(() => router.push('/signin'), 1500)
  } catch (err) {
    error.value = err.message || err.name || 'Confirmation failed'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.confirm-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 2rem;
}

.confirm-card {
  background: white;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 400px;
}

.confirm-card h1 {
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 1.75rem;
}

.subtitle {
  color: #666;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.confirm-form {
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
  font-size: 1.25rem;
  letter-spacing: 0.25em;
  text-align: center;
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

.signin-link {
  margin-top: 1.5rem;
  text-align: center;
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
