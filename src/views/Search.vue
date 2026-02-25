<template>
  <div class="search-page">
    <div class="search-header">
      <h1>Search Scholarships</h1>
      <div class="search-bar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by keyword, major, location..."
          class="search-input"
          @keyup.enter="handleSearch"
        />
        <button @click="handleSearch" class="search-button" :disabled="loading">
          {{ loading && !useAISearch ? 'Searching...' : 'Search database' }}
        </button>
        <button
          type="button"
          @click="handleAISearch"
          class="search-button search-button-ai"
          :disabled="loading"
        >
          {{ loading && useAISearch ? 'Searching the web…' : 'Search web with Amazon AI' }}
        </button>
      </div>

      <div class="filters">
        <select v-model="filters.amount" class="filter-select">
          <option value="">Any Amount</option>
          <option value="0-1000">$0 - $1,000</option>
          <option value="1000-5000">$1,000 - $5,000</option>
          <option value="5000-10000">$5,000 - $10,000</option>
          <option value="10000+">$10,000+</option>
        </select>
        <select v-model="filters.deadline" class="filter-select">
          <option value="">Any Deadline</option>
          <option value="30">Next 30 days</option>
          <option value="60">Next 60 days</option>
          <option value="90">Next 90 days</option>
        </select>
        <select v-model="filters.type" class="filter-select">
          <option value="">Any Type</option>
          <option value="merit">Merit-based</option>
          <option value="need">Need-based</option>
          <option value="athletic">Athletic</option>
          <option value="minority">Minority</option>
        </select>
      </div>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-if="loading" class="loading">
      <p>Searching for scholarships...</p>
    </div>

    <div v-else-if="scholarships.length > 0" class="results">
      <h2>
        {{ scholarships.length }} Scholarships Found
        <span v-if="lastSearchWasAI" class="results-badge">From the web (Amazon AI)</span>
      </h2>
      <div class="scholarship-list">
        <div
          v-for="scholarship in scholarships"
          :key="scholarship.id"
          class="scholarship-card"
        >
          <div class="scholarship-header">
            <h3>{{ scholarship.title }}</h3>
            <span class="amount">${{ formatAmount(scholarship.amount) }}</span>
          </div>
          <p class="description">{{ scholarship.description }}</p>
          <div class="scholarship-details">
            <span class="detail-item">📅 Deadline: {{ formatDate(scholarship.deadline) }}</span>
            <span class="detail-item">🏫 Type: {{ scholarship.type }}</span>
            <span v-if="scholarship.eligibility" class="detail-item">
              ✅ Eligibility: {{ scholarship.eligibility }}
            </span>
          </div>
          <div class="scholarship-actions">
            <button @click="viewDetails(scholarship)" class="btn-secondary">View Details</button>
            <button @click="startApplication(scholarship)" class="btn-primary">
            {{ profileStore.isPaid ? 'Apply Now' : 'Track (Pro)' }}
          </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="hasSearched" class="no-results">
      <p>No scholarships found. Try adjusting your search criteria.</p>
    </div>

    <div v-else class="welcome-message">
      <p>Enter a search query above to find scholarships that match your criteria.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useScholarshipStore } from '../stores/scholarship'
import { useProfileStore } from '../stores/profile'
import { useRouter } from 'vue-router'

const router = useRouter()
const scholarshipStore = useScholarshipStore()
const profileStore = useProfileStore()

const searchQuery = ref('')
const hasSearched = ref(false)
const useAISearch = ref(false)
const lastSearchWasAI = ref(false)
const filters = ref({
  amount: '',
  deadline: '',
  type: ''
})

const scholarships = computed(() => scholarshipStore.scholarships)
const loading = computed(() => scholarshipStore.loading)
const error = computed(() => scholarshipStore.error)

const handleSearch = async () => {
  hasSearched.value = true
  lastSearchWasAI.value = false
  try {
    await scholarshipStore.searchScholarships(searchQuery.value.trim(), filters.value)
  } catch (err) {
    console.error('Search failed:', err)
  }
}

const handleAISearch = async () => {
  hasSearched.value = true
  useAISearch.value = true
  lastSearchWasAI.value = true
  try {
    await scholarshipStore.searchScholarshipsWithAI(searchQuery.value.trim(), 10)
  } catch (err) {
    console.error('AI search failed:', err)
  } finally {
    useAISearch.value = false
  }
}

const formatAmount = (amount) => {
  if (!amount) return 'N/A'
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

const viewDetails = (scholarship) => {
  if (scholarship.id && scholarship.id.startsWith('ai-')) {
    router.push({
      name: 'ScholarshipDetail',
      params: { id: scholarship.id },
      state: { scholarship },
    })
  } else {
    router.push({ name: 'ScholarshipDetail', params: { id: scholarship.id } })
  }
}

const startApplication = (scholarship) => {
  if (profileStore.isPaid) {
    router.push({ name: 'Applications', query: { new: scholarship.id } })
  } else {
    router.push({ name: 'Applications', query: { upgrade: '1' } })
  }
}
</script>

<style scoped>
.search-page {
  max-width: 1000px;
  margin: 0 auto;
}

.search-header {
  background: white;
  padding: 2rem;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.search-header h1 {
  color: #333;
  margin-bottom: 1.5rem;
}

.search-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.search-input {
  flex: 1;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
}

.search-button {
  padding: 1rem 2rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.search-button:hover:not(:disabled) {
  background: #5568d3;
}

.search-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search-button-ai {
  background: linear-gradient(135deg, #232f3e 0%, #ff9900 100%);
}

.search-button-ai:hover:not(:disabled) {
  opacity: 0.95;
  filter: brightness(1.05);
}

.results-badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #232f3e;
  background: rgba(255, 153, 0, 0.2);
  border-radius: 6px;
}

.filters {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-select {
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.9rem;
  background: white;
  cursor: pointer;
}

.results h2 {
  color: white;
  margin-bottom: 1.5rem;
}

.scholarship-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.scholarship-card {
  background: white;
  padding: 2rem;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.scholarship-card:hover {
  transform: translateY(-3px);
}

.scholarship-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
}

.scholarship-header h3 {
  color: #333;
  flex: 1;
}

.amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
}

.description {
  color: #666;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.scholarship-details {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.detail-item {
  font-size: 0.9rem;
  color: #555;
}

.scholarship-actions {
  display: flex;
  gap: 1rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
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

.error-message {
  background: #fee;
  color: #c33;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.loading,
.no-results,
.welcome-message {
  text-align: center;
  padding: 3rem;
  color: white;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  backdrop-filter: blur(10px);
}
</style>
