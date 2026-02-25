<template>
  <div class="detail-page">
    <div v-if="loading" class="loading">
      <p>Loading scholarship...</p>
    </div>
    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
      <router-link :to="{ name: 'Search' }" class="back-link">← Back to Search</router-link>
    </div>
    <div v-else-if="scholarship" class="detail-card">
      <div class="detail-header">
        <router-link :to="{ name: 'Search' }" class="back-link">← Back to Search</router-link>
        <h1>{{ scholarship.title }}</h1>
        <span class="amount">${{ formatAmount(scholarship.amount) }}</span>
      </div>
      <p v-if="scholarship.source" class="source">Source: {{ scholarship.source }}</p>
      <p class="description">{{ scholarship.description }}</p>
      <div class="meta">
        <span class="meta-item">📅 Deadline: {{ formatDate(scholarship.deadline) }}</span>
        <span class="meta-item">🏫 Type: {{ scholarship.type || 'N/A' }}</span>
      </div>
      <div v-if="scholarship.eligibility" class="eligibility">
        <h3>Eligibility</h3>
        <p>{{ scholarship.eligibility }}</p>
      </div>
      <div class="actions">
        <a
          v-if="scholarship.applicationUrl"
          :href="scholarship.applicationUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="btn-primary"
        >
          Apply on official site →
        </a>
        <button
          type="button"
          :class="['btn-secondary', { 'btn-pro-locked': !profileStore.isPaid }]"
          @click="startApplication"
        >
          {{ profileStore.isPaid ? 'Track in My Applications' : 'Track in My Applications (Pro)' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useScholarshipStore } from '../stores/scholarship'
import { useProfileStore } from '../stores/profile'

const route = useRoute()
const router = useRouter()
const scholarshipStore = useScholarshipStore()
const profileStore = useProfileStore()

const loading = computed(() => scholarshipStore.loading)
const error = computed(() => scholarshipStore.error)
const scholarship = ref(null)

onMounted(async () => {
  const id = route.params.id
  if (!id) {
    scholarship.value = null
    return
  }
  const fromState = history.state?.scholarship
  if (fromState && id.startsWith('ai-')) {
    scholarship.value = fromState
    return
  }
  try {
    const data = await scholarshipStore.getScholarshipDetails(id)
    scholarship.value = data
  } catch {
    scholarship.value = null
  }
})

const formatAmount = (amount) => {
  if (amount == null) return 'N/A'
  return new Intl.NumberFormat('en-US').format(amount)
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const startApplication = () => {
  if (!scholarship.value?.id) return
  if (profileStore.isPaid) {
    router.push({ name: 'Applications', query: { new: scholarship.value.id } })
  } else {
    router.push({ name: 'Applications', query: { upgrade: '1' } })
  }
}
</script>

<style scoped>
.detail-page {
  max-width: 800px;
  margin: 0 auto;
}

.detail-card {
  background: white;
  padding: 2rem;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.detail-header {
  margin-bottom: 1rem;
}

.detail-header h1 {
  color: #333;
  margin: 0.5rem 0 1rem;
}

.amount {
  font-size: 1.75rem;
  font-weight: 700;
  color: #667eea;
}

.back-link {
  color: #667eea;
  text-decoration: none;
  font-size: 0.95rem;
}

.back-link:hover {
  text-decoration: underline;
}

.source {
  color: #666;
  font-size: 0.95rem;
  margin-bottom: 1rem;
}

.description {
  color: #444;
  line-height: 1.7;
  margin-bottom: 1.5rem;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.meta-item {
  font-size: 0.95rem;
  color: #555;
}

.eligibility {
  margin-bottom: 1.5rem;
}

.eligibility h3 {
  color: #333;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.eligibility p {
  color: #555;
  line-height: 1.6;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1.5rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  font-size: 1rem;
  text-decoration: none;
  display: inline-block;
  transition: all 0.3s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-pro-locked {
  opacity: 0.9;
}

.btn-pro-locked:hover {
  background: #e8e4f4;
  color: #667eea;
}

.loading,
.error-message {
  text-align: center;
  padding: 3rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  color: white;
}

.error-message {
  background: #fee;
  color: #c33;
}

.error-message .back-link {
  color: #667eea;
  margin-top: 1rem;
  display: inline-block;
}
</style>
