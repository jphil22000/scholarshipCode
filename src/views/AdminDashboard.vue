<template>
  <div class="admin-dashboard">
    <h1>Admin Dashboard</h1>

    <div v-if="error" class="dashboard-error">
      {{ error }}
    </div>

    <template v-else>
      <section class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">{{ stats.users?.total ?? '—' }}</span>
          <span class="stat-label">Total users</span>
        </div>
        <div class="stat-card stat-free">
          <span class="stat-value">{{ stats.users?.free ?? '—' }}</span>
          <span class="stat-label">Free users</span>
        </div>
        <div class="stat-card stat-paid">
          <span class="stat-value">{{ stats.users?.paid ?? '—' }}</span>
          <span class="stat-label">Paid users</span>
        </div>
        <div class="stat-card stat-apps">
          <span class="stat-value">{{ stats.applications?.total ?? '—' }}</span>
          <span class="stat-label">Total applications</span>
        </div>
      </section>

      <section class="promote-section">
        <h2>Add admin</h2>
        <p class="promote-hint">Promote a user to admin by their profile email. They must have signed in and saved About You at least once.</p>
        <form class="promote-form" @submit.prevent="promoteUser">
          <input
            v-model="promoteEmail"
            type="email"
            placeholder="e.g. jphil22000@gmail.com"
            required
            class="promote-input"
          />
          <button type="submit" class="promote-btn" :disabled="promoteLoading">
            {{ promoteLoading ? 'Adding…' : 'Add admin' }}
          </button>
        </form>
        <p v-if="promoteMessage" :class="['promote-message', promoteSuccess ? 'success' : 'error']">
          {{ promoteMessage }}
        </p>
      </section>

      <section class="errors-section">
        <h2>Error tracking</h2>
        <p v-if="errorsLoadError" class="errors-message">{{ errorsLoadError }}</p>
        <div v-else-if="loadingErrors" class="loading-errors">Loading errors…</div>
        <div v-else-if="errors.length === 0" class="no-errors">No errors recorded.</div>
        <div v-else class="errors-table-wrap">
          <table class="errors-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Message</th>
                <th>URL</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="err in errors" :key="err.id">
                <td class="col-time">{{ formatDate(err.createdAt) }}</td>
                <td class="col-message">
                  <span :title="err.stack">{{ err.message }}</span>
                </td>
                <td class="col-url">{{ err.url || '—' }}</td>
                <td class="col-user">{{ err.userId ? truncateId(err.userId) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function getAuthHeaders() {
  try {
    const { useAuthStore } = await import('../stores/auth')
    const auth = useAuthStore()
    if (auth?.idToken) return { Authorization: `Bearer ${auth.idToken}` }
    if (auth?.isAuthenticated && !auth?.idToken) {
      await auth.loadSession()
      if (auth.idToken) return { Authorization: `Bearer ${auth.idToken}` }
    }
  } catch {
    // auth store not ready
  }
  return {}
}

const stats = ref({ users: {}, applications: {} })
const errors = ref([])
const loadingErrors = ref(false)
const errorsLoadError = ref(null)
const error = ref(null)

const promoteEmail = ref('jphil22000@gmail.com')
const promoteLoading = ref(false)
const promoteMessage = ref('')
const promoteSuccess = ref(false)

async function loadStats() {
  const headers = await getAuthHeaders()
  const res = await fetch(API_BASE ? `${API_BASE}/admin/stats` : '/api/admin/stats', {
    credentials: API_BASE ? 'omit' : 'include',
    headers: { ...headers, Accept: 'application/json' },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || data.message || res.statusText)
  }
  return res.json()
}

async function loadErrors() {
  loadingErrors.value = true
  errorsLoadError.value = null
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(API_BASE ? `${API_BASE}/admin/errors` : '/api/admin/errors', {
      credentials: API_BASE ? 'omit' : 'include',
      headers: { ...headers, Accept: 'application/json' },
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      errorsLoadError.value = data.error || data.message || res.statusText
      return
    }
    const data = await res.json()
    errors.value = Array.isArray(data) ? data : []
  } finally {
    loadingErrors.value = false
  }
}

async function promoteUser() {
  const email = promoteEmail.value.trim()
  if (!email) return
  promoteLoading.value = true
  promoteMessage.value = ''
  promoteSuccess.value = false
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(API_BASE ? `${API_BASE}/admin/promote` : '/api/admin/promote', {
      method: 'POST',
      credentials: API_BASE ? 'omit' : 'include',
      headers: { ...headers, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.ok) {
      promoteMessage.value = `${data.email} is now an admin.`
      promoteSuccess.value = true
      promoteEmail.value = ''
    } else {
      promoteMessage.value = data.message || data.error || res.statusText
    }
  } catch (e) {
    promoteMessage.value = e.message || 'Request failed'
  } finally {
    promoteLoading.value = false
  }
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function truncateId(id) {
  if (!id || id.length <= 12) return id
  return id.slice(0, 8) + '…'
}

onMounted(async () => {
  try {
    stats.value = await loadStats()
    await loadErrors()
  } catch (e) {
    error.value = e.message
  }
})
</script>

<style scoped>
.admin-dashboard {
  max-width: 1100px;
  margin: 0 auto;
}

.admin-dashboard h1 {
  color: white;
  margin-bottom: 1.5rem;
}

.dashboard-error {
  background: rgba(200, 80, 80, 0.2);
  border: 1px solid rgba(200, 80, 80, 0.6);
  color: #fff;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  margin-bottom: 1.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2.5rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #333;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
}

.stat-free .stat-value {
  color: #555;
}

.stat-paid .stat-value {
  color: #667eea;
}

.stat-apps .stat-value {
  color: #764ba2;
}

.promote-section {
  margin-bottom: 2.5rem;
}

.promote-section h2 {
  color: white;
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.promote-hint {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.promote-form {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.promote-input {
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #ddd;
  font-size: 1rem;
  min-width: 220px;
}

.promote-btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: #667eea;
  color: white;
  border: none;
  font-weight: 500;
  cursor: pointer;
}

.promote-btn:hover:not(:disabled) {
  background: #5568d3;
}

.promote-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.promote-message {
  margin-top: 0.75rem;
  font-size: 0.95rem;
}

.promote-message.success {
  color: #2d8a2d;
}

.promote-message.error {
  color: #e57373;
}

.errors-section h2 {
  color: white;
  font-size: 1.25rem;
  margin-bottom: 1rem;
}

.errors-message,
.loading-errors,
.no-errors {
  color: rgba(255, 255, 255, 0.9);
  padding: 1rem 0;
}

.errors-table-wrap {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.errors-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.errors-table th,
.errors-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.errors-table th {
  background: #f8f8f8;
  font-weight: 600;
  color: #333;
}

.errors-table tbody tr:hover {
  background: #fafafa;
}

.col-time {
  white-space: nowrap;
  color: #666;
}

.col-message {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.col-url {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #666;
}

.col-user {
  font-family: monospace;
  font-size: 0.85em;
}
</style>
