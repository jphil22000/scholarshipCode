import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Search from '../views/Search.vue'
import ScholarshipDetail from '../views/ScholarshipDetail.vue'
import Applications from '../views/Applications.vue'
import SignIn from '../views/SignIn.vue'
import SignUp from '../views/SignUp.vue'
import ConfirmSignUp from '../views/ConfirmSignUp.vue'
import ForgotPassword from '../views/ForgotPassword.vue'
import Callback from '../views/Callback.vue'
import AboutYou from '../views/AboutYou.vue'
import AboutUs from '../views/AboutUs.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
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
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPassword
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
  },
  {
    path: '/about-us',
    name: 'AboutUs',
    component: AboutUs
  },
  {
    path: '/contact',
    redirect: { name: 'AboutUs' }
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: AdminDashboard,
    meta: { requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, _from, next) => {
  if (!to.meta.requiresAuth && !to.meta.requiresAdmin) {
    next()
    return
  }

  const authStore = useAuthStore()
  const profileStore = useProfileStore()
  const hasCognito = !!import.meta.env.VITE_COGNITO_USER_POOL_ID

  if (hasCognito) {
    try {
      if (!authStore.user) await authStore.loadSession()
      if (authStore.isAuthenticated) {
        if (to.meta.requiresAdmin) {
          await profileStore.getProfile()
          if (!profileStore.isAdmin) {
            next({ path: '/' })
            return
          }
        }
        next()
        return
      }
    } catch {
      // loadSession failed – fall through
    }
  }

  try {
    const res = await fetch('/api/me', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      if (data && data.isAuthenticated) {
        if (to.meta.requiresAdmin) {
          await profileStore.getProfile()
          if (!profileStore.isAdmin) {
            next({ path: '/' })
            return
          }
        }
        next()
        return
      }
    }
  } catch {
    // /api/me not available or failed
  }

  if (to.meta.requiresAuth || to.meta.requiresAdmin) {
    next({ name: 'SignIn', query: { redirect: to.fullPath } })
    return
  }
  next()
})

export default router
