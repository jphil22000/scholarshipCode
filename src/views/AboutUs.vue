<template>
  <div class="about-page">
    <div class="about-card">
      <h1>About Us</h1>
      <p class="subtitle">Helping students find and apply for scholarships</p>
      <section class="content">
        <p>
          Scholarship Finder helps you search thousands of college scholarships, filter by amount,
          deadline, and type, and track your applications in one place.
        </p>
        <p>
          Sign in to search scholarships and fill out your profile so we can personalize results.
          Upgrade to Pro for application tracking and deadline reminders.
        </p>
      </section>

      <section class="contact-section">
        <h2>Contact</h2>
        <p class="contact-subtitle">Have a question or feedback? Get in touch.</p>
        <a :href="contactMailto" class="contact-btn">Email us</a>
        <p v-if="!contactEmail" class="contact-note">Set VITE_CONTACT_EMAIL in .env to customize the contact address.</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const contactEmail = import.meta.env.VITE_CONTACT_EMAIL || ''
const contactMailto = computed(() =>
  contactEmail
    ? `mailto:${contactEmail}?subject=Scholarship%20Finder%20inquiry`
    : 'mailto:?subject=Scholarship%20Finder%20inquiry'
)
</script>

<style scoped>
.about-page {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 50vh;
  padding: 2rem;
}

.about-card {
  background: white;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 640px;
}

.about-card h1 {
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 1.75rem;
}

.subtitle {
  color: #666;
  margin-bottom: 1.5rem;
  font-size: 1rem;
}

.content p {
  color: #444;
  line-height: 1.7;
  margin-bottom: 1rem;
}

.contact-section {
  margin-top: 2.5rem;
  padding-top: 2rem;
  border-top: 1px solid #eee;
}

.contact-section h2 {
  color: #333;
  font-size: 1.35rem;
  margin-bottom: 0.35rem;
}

.contact-subtitle {
  color: #666;
  font-size: 0.95rem;
  margin-bottom: 1rem;
}

.contact-btn {
  display: inline-block;
  padding: 0.9rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  transition: opacity 0.2s, transform 0.2s;
}

.contact-btn:hover {
  opacity: 0.95;
  transform: translateY(-1px);
}

.contact-note {
  margin-top: 1rem;
  color: #888;
  font-size: 0.9rem;
}
</style>
