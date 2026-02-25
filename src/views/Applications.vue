<template>
  <div class="applications-page">
    <h1>My Applications</h1>

    <div v-if="!profileStore.isPaid" class="upgrade-banner">
      <h2>Upgrade to Pro</h2>
      <p>Application tracking is a Pro feature. Upgrade to save and track your scholarship applications in one place, with deadline reminders and more.</p>
      <a :href="contactMailto" class="upgrade-cta">Contact us to upgrade</a>
    </div>

    <div v-else-if="loading" class="loading">
      <p>Loading applications...</p>
    </div>

    <div v-else-if="applications.length > 0" class="applications-list">
      <div
        v-for="application in applications"
        :key="application.id"
        class="application-card"
      >
        <div class="application-header">
          <h3>{{ application.scholarshipTitle }}</h3>
          <span :class="['status-badge', `status-${application.status}`]">
            {{ application.status }}
          </span>
        </div>
        <p class="application-date">
          Applied: {{ formatDate(application.appliedDate) }}
        </p>
        <p v-if="application.deadline" class="deadline">
          Deadline: {{ formatDate(application.deadline) }}
        </p>
        <div class="application-actions">
          <button @click="editApplication(application)" class="btn-secondary">
            Edit
          </button>
          <button @click="deleteApplication(application.id)" class="btn-danger">
            Delete
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="profileStore.isPaid" class="no-applications">
      <p>You haven't applied to any scholarships yet.</p>
      <router-link to="/search" class="cta-link">Start Searching</router-link>
    </div>

    <div v-if="showForm && profileStore.isPaid" class="application-form-overlay" @click.self="closeForm">
      <div class="application-form">
        <h2>New Application</h2>
        <form @submit.prevent="submitApplication">
          <div class="form-group">
            <label>Scholarship Name *</label>
            <input v-model="formData.scholarshipTitle" required />
          </div>
          <div class="form-group">
            <label>Amount</label>
            <input v-model="formData.amount" type="number" />
          </div>
          <div class="form-group">
            <label>Deadline</label>
            <input v-model="formData.deadline" type="date" />
          </div>
          <div class="form-group">
            <label>Status</label>
            <select v-model="formData.status">
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="formData.notes" rows="4"></textarea>
          </div>
          <div class="form-actions">
            <button type="button" @click="closeForm" class="btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn-primary">Save Application</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useScholarshipStore } from '../stores/scholarship'
import { useProfileStore } from '../stores/profile'
import { useRoute } from 'vue-router'

const route = useRoute()
const scholarshipStore = useScholarshipStore()
const profileStore = useProfileStore()
const contactEmail = import.meta.env.VITE_CONTACT_EMAIL || ''
const contactMailto = computed(() =>
  contactEmail ? `mailto:${contactEmail}?subject=Scholarship%20Finder%20-%20Upgrade%20to%20Pro` : 'mailto:?subject=Upgrade%20to%20Pro'
)

const applications = ref([])
const loading = ref(false)
const showForm = ref(false)
const editingId = ref(null)

const formData = ref({
  scholarshipTitle: '',
  amount: '',
  deadline: '',
  status: 'pending',
  notes: ''
})

const loadApplications = async () => {
  loading.value = true
  try {
    await scholarshipStore.getApplications()
    applications.value = scholarshipStore.applications
  } catch (err) {
    console.error('Failed to load applications:', err)
  } finally {
    loading.value = false
  }
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const submitApplication = async () => {
  try {
    if (editingId.value) {
      await scholarshipStore.updateApplication(editingId.value, formData.value)
    } else {
      await scholarshipStore.saveApplication({
        ...formData.value,
        appliedDate: new Date().toISOString()
      })
    }
    closeForm()
    loadApplications()
  } catch (err) {
    console.error('Failed to save application:', err)
  }
}

const editApplication = (application) => {
  editingId.value = application.id
  formData.value = { ...application }
  showForm.value = true
}

const deleteApplication = async (id) => {
  if (confirm('Are you sure you want to delete this application?')) {
    try {
      await scholarshipStore.deleteApplication(id)
      loadApplications()
    } catch (err) {
      console.error('Failed to delete application:', err)
    }
  }
}

const closeForm = () => {
  showForm.value = false
  editingId.value = null
  formData.value = {
    scholarshipTitle: '',
    amount: '',
    deadline: '',
    status: 'pending',
    notes: ''
  }
}

watch(() => route.query.new, (newScholarshipId) => {
  if (newScholarshipId && profileStore.isPaid) showForm.value = true
})

onMounted(() => {
  if (profileStore.isPaid) {
    loadApplications()
    if (route.query.new) showForm.value = true
  }
})
</script>

<style scoped>
.applications-page {
  max-width: 1000px;
  margin: 0 auto;
}

.applications-page h1 {
  color: white;
  margin-bottom: 2rem;
}

.applications-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.application-card {
  background: white;
  padding: 2rem;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.application-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.application-header h3 {
  color: #333;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-pending {
  background: #fff3cd;
  color: #856404;
}

.status-submitted {
  background: #d1ecf1;
  color: #0c5460;
}

.status-approved {
  background: #d4edda;
  color: #155724;
}

.status-rejected {
  background: #f8d7da;
  color: #721c24;
}

.application-date,
.deadline {
  color: #666;
  margin-bottom: 0.5rem;
}

.application-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-secondary,
.btn-danger {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.no-applications {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.cta-link {
  display: inline-block;
  margin-top: 1rem;
  padding: 1rem 2rem;
  background: #667eea;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
}

.application-form-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.application-form {
  background: white;
  padding: 2rem;
  border-radius: 15px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.application-form h2 {
  margin-bottom: 1.5rem;
  color: #333;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:hover {
  background: #5568d3;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: white;
}

.upgrade-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  border-radius: 15px;
  margin-bottom: 2rem;
  text-align: center;
}

.upgrade-banner h2 {
  margin: 0 0 0.75rem;
  font-size: 1.5rem;
}

.upgrade-banner p {
  margin: 0 0 1.25rem;
  opacity: 0.95;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
}

.upgrade-cta {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: white;
  color: #667eea;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}

.upgrade-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
</style>
