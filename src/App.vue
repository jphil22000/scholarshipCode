<template>
  <div id="app">
    <nav v-if="isSignedIn" class="navbar">
      <div class="container">
        <h1 class="logo">🎓 Scholarship Finder</h1>
        <div class="nav-links">
          <router-link to="/">Home</router-link>
          <router-link to="/search">Search</router-link>
          <router-link to="/about-you">About You</router-link>
          <router-link to="/applications">My Applications</router-link>
          <!-- Server session (Hosted UI): when /api/me returns user -->
          <template v-if="serverUser">
            <span class="nav-plan" :class="profileStore.plan">{{ profileStore.plan }}</span>
            <span class="nav-user">{{ serverUser.email || serverUser.username || 'User' }}</span>
            <a href="/logout" class="nav-btn">Sign Out</a>
          </template>
          <!-- Amplify (client-side) auth when not on auth server -->
          <template v-else-if="hasCognito && auth.isAuthenticated">
            <span class="nav-plan" :class="profileStore.plan">{{ profileStore.plan }}</span>
            <span class="nav-user">{{ auth.user?.signInDetails?.loginId ?? 'User' }}</span>
            <button type="button" class="nav-btn" @click="auth.logout()">Sign Out</button>
          </template>
          <template v-else>
            <a href="/login" class="nav-signin">Sign In</a>
          </template>
        </div>
      </div>
    </nav>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, provide } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useProfileStore } from './stores/profile'

const auth = useAuthStore()
const router = useRouter()
const profileStore = useProfileStore()
const hasCognito = computed(() => !!import.meta.env.VITE_COGNITO_USER_POOL_ID)
const serverUser = ref(null)
/** True when we got a response from /api/me (we're on the Node auth server) */
const onAuthServer = ref(false)
// Only show nav when signed in. On auth server, trust server session only; otherwise allow Amplify.
const isSignedIn = computed(() => {
  if (onAuthServer.value) return !!serverUser.value
  return !!serverUser.value || (hasCognito.value && auth.isAuthenticated)
})

onMounted(async () => {
  try {
    const res = await fetch('/api/me', { credentials: 'include' })
    onAuthServer.value = res.ok
    if (res.ok) {
      const data = await res.json()
      if (data.isAuthenticated && data.userInfo) {
        serverUser.value = data.userInfo
        await profileStore.getProfile()
        if (router.currentRoute.value.path === '/' && !profileStore.hasProfile) {
          router.replace('/about-you')
        }
      }
    }
  } catch {
    // Not on auth server (e.g. Vite dev)
  }
  if (hasCognito.value) {
    await auth.loadSession()
    if (auth.isAuthenticated) {
      await profileStore.getProfile()
      if (router.currentRoute.value.path === '/' && !profileStore.hasProfile) {
        router.replace('/about-you')
      }
    }
  }
})

provide('isSignedIn', isSignedIn)

</script>

<style scoped>
.navbar {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 1.5rem;
  color: #667eea;
  font-weight: 700;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-links a {
  text-decoration: none;
  color: #333;
  font-weight: 500;
  transition: color 0.3s;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  color: #667eea;
}

.nav-plan {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  letter-spacing: 0.05em;
}

.nav-plan.free {
  background: #f0f0f0;
  color: #666;
}

.nav-plan.pro {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.nav-user {
  color: #666;
  font-size: 0.9rem;
}

.nav-btn,
.nav-signin {
  padding: 0.4rem 0.9rem;
  border-radius: 8px;
  font-weight: 500;
  text-decoration: none;
  font-size: 0.95rem;
}

.nav-btn {
  background: transparent;
  border: 1px solid #667eea;
  color: #667eea;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.nav-btn:hover {
  background: #667eea;
  color: white;
}

.nav-signin {
  color: #667eea;
  border: 1px solid #667eea;
}

.nav-signin:hover {
  background: rgba(102, 126, 234, 0.1);
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}
</style>
