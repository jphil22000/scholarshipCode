<template>
  <div id="app">
    <nav class="navbar">
      <div class="container">
        <h1 class="logo">🎓 Scholarship Finder</h1>
        <div class="nav-links">
          <router-link to="/">Home</router-link>
          <router-link to="/about-us">About Us</router-link>
          <template v-if="isSignedIn">
            <router-link to="/search">Search</router-link>
            <router-link to="/about-you">About You</router-link>
            <router-link to="/applications">My Applications</router-link>
            <span class="nav-plan" :class="profileStore.plan">{{ profileStore.plan }}</span>
            <span class="nav-user">{{ userDisplayName }}</span>
            <template v-if="serverUser">
              <a href="/logout" class="nav-btn">Sign Out</a>
            </template>
            <template v-else>
              <button type="button" class="nav-btn" @click="handleSignOut">Sign Out</button>
            </template>
          </template>
          <template v-else>
            <router-link to="/signin" class="nav-signin">Sign In</router-link>
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
import { computed, ref, onMounted, provide, watch } from 'vue'
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from './stores/auth'
import { useProfileStore } from './stores/profile'

const auth = useAuthStore()
const { user: authUser } = storeToRefs(auth)
const router = useRouter()
const route = useRoute()
const profileStore = useProfileStore()
const hasCognito = computed(() => !!import.meta.env.VITE_COGNITO_USER_POOL_ID)
const serverUser = ref(null)
// Protected paths: only reachable when guard allows (so user is signed in)
const protectedPaths = ['/search', '/about-you', '/applications']
const isOnProtectedPath = computed(() =>
  protectedPaths.includes(route.path) || route.path.startsWith('/scholarship/')
)
// Signed in: server session, Cognito user, or we're on a protected path (guard already let us through)
const isSignedIn = computed(() => {
  if (!!serverUser.value) return true
  if (hasCognito.value && !!authUser.value) return true
  return isOnProtectedPath.value
})

const userDisplayName = computed(() => {
  if (serverUser.value) return serverUser.value.email || serverUser.value.username || 'User'
  if (authUser.value?.signInDetails?.loginId) return authUser.value.signInDetails.loginId
  return 'User'
})

async function handleSignOut() {
  await auth.logout()
  serverUser.value = null
  router.replace('/')
}

onMounted(async () => {
  try {
    const res = await fetch('/api/me', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      if (data.isAuthenticated && data.userInfo) {
        serverUser.value = data.userInfo
        await profileStore.getProfile()
        if (router.currentRoute.value.path === '/') {
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
      if (router.currentRoute.value.path === '/') {
        router.replace('/about-you')
      }
    }
  }
})

// Refresh Cognito session on navigation so nav always shows correct signed-in state
watch(() => route.path, () => {
  if (hasCognito.value) auth.loadSession()
}, { immediate: true })

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
