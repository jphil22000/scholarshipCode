<template>
  <div class="home">
    <div class="hero">
      <h1>Find Your Perfect Scholarship</h1>
      <p class="subtitle">Search thousands of college scholarships and get help applying to them</p>
      <div v-if="!isSignedIn" class="hero-actions">
        <a href="/login" class="cta-button">Sign In</a>
      </div>
    </div>

    <div class="features">
      <div class="feature-card">
        <div class="feature-icon">🔍</div>
        <h3>Smart Search</h3>
        <p>Search through thousands of scholarships using advanced filters</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📝</div>
        <h3>Application Tracker</h3>
        <p>Keep track of all your scholarship applications in one place</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <h3>Quick Apply</h3>
        <p>Get personalized help and reminders for your applications</p>
      </div>
    </div>

    <section v-if="!isSignedIn" class="pricing" id="pricing">
      <h2 class="pricing-title">Simple, transparent pricing</h2>
      <p class="pricing-subtitle">Sign in to search. Upgrade to Pro for application tracking.</p>
      <div class="pricing-cards">
        <div class="pricing-card">
          <h3 class="plan-name">Free</h3>
          <div class="plan-price">
            <span class="currency">$</span><span class="amount">0</span>
            <span class="period">/month</span>
          </div>
          <p class="plan-desc">Search and view scholarships</p>
          <ul class="plan-features">
            <li>Unlimited scholarship search</li>
            <li>Filters (amount, type, deadline)</li>
            <li>No application tracking</li>
          </ul>
          <router-link to="/signin" class="plan-cta plan-cta-secondary">Sign in to get started</router-link>
        </div>
        <div class="pricing-card pricing-card-featured">
          <span class="badge">Most popular</span>
          <h3 class="plan-name">Pro</h3>
          <div class="plan-price">
            <span class="currency">$</span><span class="amount">9</span>
            <span class="period">/month</span>
          </div>
          <p class="plan-price-alt">or 3 months for $25</p>
          <p class="plan-desc">Track applications and get deadline reminders</p>
          <ul class="plan-features">
            <li>Everything in Free</li>
            <li>Unlimited application tracking</li>
            <li>Deadline & follow-up reminders</li>
            <li>Priority support</li>
            <li>Export to PDF</li>
          </ul>
          <a href="/login" class="plan-cta">Sign in to upgrade</a>
        </div>
      </div>
    </section>

    <section v-else-if="!profileStore.isPaid" class="pricing" id="pricing">
      <h2 class="pricing-title">Upgrade to Pro</h2>
      <p class="pricing-subtitle">Get application tracking, reminders, and more.</p>
      <div class="pricing-cards">
        <div class="pricing-card">
          <h3 class="plan-name">Free</h3>
          <div class="plan-price">
            <span class="currency">$</span><span class="amount">0</span>
            <span class="period">/month</span>
          </div>
          <p class="plan-desc">Search and view scholarships</p>
          <ul class="plan-features">
            <li>Unlimited scholarship search</li>
            <li>Filters (amount, type, deadline)</li>
            <li>No application tracking</li>
          </ul>
          <span class="plan-cta plan-cta-secondary plan-cta-disabled">Current plan</span>
        </div>
        <div class="pricing-card pricing-card-featured">
          <span class="badge">Pro</span>
          <h3 class="plan-name">Pro</h3>
          <div class="plan-price">
            <span class="currency">$</span><span class="amount">9</span>
            <span class="period">/month</span>
          </div>
          <p class="plan-price-alt">or 3 months for $25</p>
          <p class="plan-desc">Track applications and get deadline reminders</p>
          <ul class="plan-features">
            <li>Everything in Free</li>
            <li>Unlimited application tracking</li>
            <li>Deadline & follow-up reminders</li>
            <li>Priority support</li>
            <li>Export to PDF</li>
          </ul>
          <a :href="contactMailtoUpgrade" class="plan-cta">Contact us to upgrade</a>
        </div>
      </div>
    </section>

    <footer class="home-footer">
      <a :href="contactMailto" class="contact-link">Contact us</a>
    </footer>
  </div>
</template>

<script setup>
import { inject, computed } from 'vue'
import { useProfileStore } from '../stores/profile'

const isSignedIn = inject('isSignedIn')
const profileStore = useProfileStore()
const contactEmail = import.meta.env.VITE_CONTACT_EMAIL || ''
const contactMailto = computed(() =>
  contactEmail ? `mailto:${contactEmail}?subject=Scholarship%20Finder%20inquiry` : 'mailto:?subject=Scholarship%20Finder%20inquiry'
)
const contactMailtoUpgrade = computed(() =>
  contactEmail ? `mailto:${contactEmail}?subject=Scholarship%20Finder%20-%20Upgrade%20to%20Pro` : 'mailto:?subject=Upgrade%20to%20Pro'
)
</script>

<style scoped>
.home {
  text-align: center;
}

.hero {
  padding: 4rem 2rem;
  color: white;
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
}

.subtitle {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.95;
}

.cta-button {
  display: inline-block;
  padding: 1rem 2.5rem;
  background: white;
  color: #667eea;
  text-decoration: none;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1.1rem;
  transition: transform 0.3s, box-shadow 0.3s;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.cta-secondary {
  background: transparent;
  border: 2px solid white;
  color: white;
}

.cta-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 4rem;
  padding: 2rem;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  color: #333;
  margin-bottom: 0.5rem;
}

.feature-card p {
  color: #666;
  line-height: 1.6;
}

.pricing {
  padding: 4rem 2rem;
  background: rgba(255, 255, 255, 0.15);
  margin-top: 4rem;
  border-radius: 24px 24px 0 0;
}

.pricing-title {
  color: white;
  font-size: 2rem;
  margin-bottom: 0.5rem;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
}

.pricing-subtitle {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.1rem;
  margin-bottom: 2.5rem;
}

.pricing-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  max-width: 1000px;
  margin: 0 auto;
}

.pricing-card {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  position: relative;
  transition: transform 0.3s, box-shadow 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.pricing-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

.pricing-card-featured {
  border: 2px solid #667eea;
  box-shadow: 0 6px 28px rgba(102, 126, 234, 0.25);
}

.pricing-card-featured:hover {
  box-shadow: 0 10px 36px rgba(102, 126, 234, 0.35);
}

.badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.35rem 0.9rem;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.plan-name {
  color: #333;
  font-size: 1.5rem;
  margin: 0.5rem 0 0.25rem;
}

.plan-price {
  margin-bottom: 0.75rem;
}

.plan-price .currency {
  font-size: 1.25rem;
  color: #666;
  vertical-align: top;
}

.plan-price .amount {
  font-size: 2.75rem;
  font-weight: 700;
  color: #333;
}

.plan-price .period {
  font-size: 0.95rem;
  color: #666;
}

.plan-price-alt {
  font-size: 0.9rem;
  color: #667eea;
  font-weight: 600;
  margin: -0.25rem 0 0.5rem;
}

.plan-desc {
  color: #666;
  font-size: 0.95rem;
  margin-bottom: 1.25rem;
  line-height: 1.5;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
  text-align: left;
  width: 100%;
}

.plan-features li {
  color: #444;
  padding: 0.4rem 0;
  padding-left: 1.5rem;
  position: relative;
  font-size: 0.95rem;
}

.plan-features li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #667eea;
  font-weight: 700;
}

.plan-cta {
  display: inline-block;
  width: 100%;
  padding: 0.9rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-decoration: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 1rem;
  transition: opacity 0.2s, transform 0.2s;
  margin-top: auto;
}

.plan-cta:hover {
  opacity: 0.95;
  transform: translateY(-1px);
}

.plan-cta-secondary {
  background: transparent;
  color: #667eea;
  border: 2px solid #667eea;
}

.plan-cta-secondary:hover {
  background: rgba(102, 126, 234, 0.1);
}

.plan-cta-disabled {
  cursor: default;
  opacity: 0.9;
}

.plan-cta-disabled:hover {
  background: transparent;
  color: #667eea;
  transform: none;
}

.home-footer {
  padding: 2.5rem 2rem;
  margin-top: 2rem;
}

.contact-link {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  font-size: 1rem;
  font-weight: 500;
  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
  transition: color 0.2s, border-color 0.2s;
}

.contact-link:hover {
  color: white;
  border-bottom-color: white;
}
</style>
