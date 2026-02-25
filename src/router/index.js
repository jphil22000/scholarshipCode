import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Search from '../views/Search.vue'
import ScholarshipDetail from '../views/ScholarshipDetail.vue'
import Applications from '../views/Applications.vue'
import SignIn from '../views/SignIn.vue'
import SignUp from '../views/SignUp.vue'
import ConfirmSignUp from '../views/ConfirmSignUp.vue'
import Callback from '../views/Callback.vue'
import AboutYou from '../views/AboutYou.vue'
import { useAuthStore } from '../stores/auth'
import { useProfileStore } from '../stores/profile'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/search',
    name: 'Search',
    component: Search,
    meta: { requiresAuth: true }
  },
  {
    path: '/scholarship/:id',
    name: 'ScholarshipDetail',
    component: ScholarshipDetail,
    meta: { requiresAuth: true }
  },
  {
    path: '/applications',
    name: 'Applications',
    component: Applications,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    redirect: { name: 'SignIn' }
  },
  {
    path: '/signin',
    name: 'SignIn',
    component: SignIn
  },
  {
    path: '/signup',
    name: 'SignUp',
    component: SignUp
  },
  {
    path: '/confirm',
    name: 'ConfirmSignUp',
    component: ConfirmSignUp
  },
  {
    path: '/callback',
    name: 'Callback',
    component: Callback
  },
  {
    path: '/about-you',
    name: 'AboutYou',
    component: AboutYou,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, _from, next) => {
  if (!to.meta.requiresAuth) {
    next()
    return
  }

  // Prefer server session (Hosted UI): when served from Node, /api/me returns session
  try {
    const res = await fetch('/api/me', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      if (data.isAuthenticated) {
        next()
        return
      }
      // Server session exists but not authenticated → redirect to Hosted UI login
      window.location.href = '/login'
      return
    }
  } catch {
    // /api/me not available (e.g. Vite dev server) → fall through to Amplify
  }

  // Amplify (client-side) auth when not using Hosted UI
  const store = useAuthStore()
  const hasCognito = !!import.meta.env.VITE_COGNITO_USER_POOL_ID
  if (hasCognito) {
    if (!store.user) await store.loadSession()
    if (store.isAuthenticated) {
      next()
      return
    }
  }

  // Not authenticated – redirect to sign in
  next({ name: 'SignIn', query: { redirect: to.fullPath } })
})

export default router
