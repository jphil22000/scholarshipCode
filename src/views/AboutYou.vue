<template>
  <div class="about-you-page">
    <div class="about-you-card">
      <h1>About You</h1>
      <p class="subtitle">
        This information will help us pre-fill scholarship applications for you. You can update it anytime.
      </p>

      <form @submit.prevent="handleSubmit" class="about-form">
        <div v-if="success" class="success-message">Profile saved successfully.</div>
        <div v-if="saveFailed" class="error-message">
          <strong>Failed to save profile.</strong>
          {{ profileStore.error }}
        </div>

        <section class="form-section">
          <h2>Basic info</h2>
          <div class="field-row">
            <div class="field">
              <label for="firstName">First name</label>
              <input id="firstName" v-model="form.firstName" type="text" required placeholder="Jane" />
            </div>
            <div class="field">
              <label for="lastName">Last name</label>
              <input id="lastName" v-model="form.lastName" type="text" required placeholder="Doe" />
            </div>
          </div>
          <div class="field">
            <label for="email">Email</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <div class="field">
            <label for="phone">Phone</label>
            <input id="phone" v-model="form.phone" type="tel" placeholder="(555) 123-4567" />
          </div>
          <div class="field">
            <label for="dateOfBirth">Date of birth</label>
            <input id="dateOfBirth" v-model="form.dateOfBirth" type="date" />
          </div>
        </section>

        <section class="form-section">
          <h2>Address</h2>
          <div class="field">
            <label for="street">Street</label>
            <input id="street" v-model="form.street" type="text" placeholder="123 Main St" />
          </div>
          <div class="field-row">
            <div class="field">
              <label for="city">City</label>
              <input id="city" v-model="form.city" type="text" placeholder="City" />
            </div>
            <div class="field">
              <label for="state">State</label>
              <select id="state" v-model="form.state">
                <option value="">Select state</option>
                <option v-for="s in US_STATES" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>
            <div class="field">
              <label for="zip">ZIP</label>
              <input id="zip" v-model="form.zip" type="text" placeholder="ZIP" />
            </div>
          </div>
        </section>

        <section class="form-section">
          <h2>Education</h2>
          <div class="field">
            <label for="highSchool">High school / current school</label>
            <input
              id="highSchool"
              v-model="form.highSchool"
              type="text"
              placeholder="School name"
            />
          </div>
          <div class="field-row">
            <div class="field">
              <label for="gpa">GPA (optional)</label>
              <input id="gpa" v-model="form.gpa" type="text" placeholder="e.g. 3.8" />
            </div>
            <div class="field">
              <label for="graduationYear">Graduation year</label>
              <input
                id="graduationYear"
                v-model="form.graduationYear"
                type="text"
                placeholder="e.g. 2026"
              />
            </div>
          </div>
          <div class="field">
            <label for="intendedMajor">Intended major / field of study</label>
            <input
              id="intendedMajor"
              v-model="form.intendedMajor"
              type="text"
              placeholder="e.g. Computer Science"
            />
          </div>
        </section>

        <section class="form-section">
          <h2>Optional (used by some scholarships)</h2>
          <div class="field-row">
            <div class="field">
              <label for="gender">Gender</label>
              <select id="gender" v-model="form.gender">
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non-binary">Non-binary</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="field">
              <label for="ethnicity">Ethnicity</label>
              <input id="ethnicity" v-model="form.ethnicity" type="text" placeholder="Optional" />
            </div>
          </div>
          <div class="field">
            <label for="bio">Short bio / about you</label>
            <textarea
              id="bio"
              v-model="form.bio"
              rows="4"
              placeholder="A few sentences about your background, goals, or interests. Helpful for essays."
            />
          </div>
        </section>

        <div class="actions">
          <button type="submit" class="submit-btn" :disabled="saving">
            {{ saving ? 'Saving…' : 'Save profile' }}
          </button>
          <router-link :to="redirectRoute" class="skip-link">{{ redirectRoute === '/' ? 'Back to Home' : 'Continue' }}</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProfileStore } from '../stores/profile'

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'DC', label: 'District of Columbia' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
]

const route = useRoute()
const profileStore = useProfileStore()
const redirectRoute = computed(() => route.query.redirect || '/')
const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  highSchool: '',
  gpa: '',
  graduationYear: '',
  intendedMajor: '',
  ethnicity: '',
  gender: '',
  bio: '',
})
const saving = ref(false)
const success = ref(false)
const saveFailed = ref(false)

onMounted(async () => {
  const existing = await profileStore.getProfile()
  form.value = { ...form.value, ...existing }
  // Pre-fill email from auth if we have it (e.g. from server session or Amplify)
  if (!form.value.email) {
    fetch('/api/me', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.userInfo?.email) form.value.email = data.userInfo.email
      })
      .catch(() => {})
  }
})

async function handleSubmit() {
  success.value = false
  saveFailed.value = false
  profileStore.error = null
  saving.value = true
  try {
    await profileStore.saveProfile(form.value)
    success.value = true
  } catch {
    saveFailed.value = true
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.about-you-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 2rem 0;
}

.about-you-card {
  background: white;
  padding: 2rem 2.5rem;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.about-you-card h1 {
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 1.75rem;
}

.subtitle {
  color: #666;
  margin-bottom: 1.75rem;
  font-size: 0.95rem;
}

.about-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-section h2 {
  font-size: 1rem;
  color: #667eea;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.field-row .field:nth-child(3) {
  grid-column: span 1;
}

.field label {
  display: block;
  margin-bottom: 0.35rem;
  color: #444;
  font-weight: 500;
  font-size: 0.9rem;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  padding: 0.65rem 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
  box-sizing: border-box;
}

.field textarea {
  resize: vertical;
  min-height: 4rem;
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.success-message {
  background: #efe;
  color: #060;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

.error-message {
  background: #fee;
  color: #c00;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

.actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

.submit-btn {
  padding: 0.75rem 1.5rem;
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

.skip-link {
  color: #667eea;
  font-size: 0.95rem;
  text-decoration: none;
}

.skip-link:hover {
  text-decoration: underline;
}

@media (max-width: 520px) {
  .field-row {
    grid-template-columns: 1fr;
  }
}
</style>
