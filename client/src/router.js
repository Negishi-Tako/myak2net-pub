import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from './components/Dashboard.vue';
import UserManagement from './components/UserManagement.vue';
import RoleManagement from './components/RoleManagement.vue';
import Login from './components/Login.vue';
import SshLogManagement from './components/SshLogManagement.vue';
import SshLogAnalytics from './components/SshLogAnalytics.vue';
import UfwLogManagement from './components/UfwLogManagement.vue';
import UfwLogAnalytics from './components/UfwLogAnalytics.vue';
import Settings from './components/Settings.vue';

// ルート認証を確認する関数
const checkAuth = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me`, { 
      credentials: 'include' 
    })
    return response.ok
  } catch (error) {
    console.error('Auth check error:', error)
    return false
  }
}

// 管理者権限を確認する関数
const checkAdminAuth = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me`, { 
      credentials: 'include' 
    })
    if (response.ok) {
      const data = await response.json()
      return data.user.accountType === 'admin' || data.user.accountType === 'superadmin'
    }
    return false
  } catch (error) {
    console.error('Admin auth check error:', error)
    return false
  }
}

const routes = [
  { 
    path: '/', 
    name: 'dashboard', 
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  { 
    path: '/users', 
    name: 'users', 
    component: UserManagement,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  { 
    path: '/roles', 
    name: 'roles', 
    component: RoleManagement,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  { 
    path: '/login', 
    name: 'login', 
    component: Login,
    meta: { requiresGuest: true }
  },
  { 
    path: '/ssh-logs', 
    name: 'ssh-logs', 
    component: SshLogManagement,
    meta: { requiresAuth: true }
  },
  { 
    path: '/ssh-analytics', 
    name: 'ssh-analytics', 
    component: SshLogAnalytics,
    meta: { requiresAuth: true }
  },
  { 
    path: '/ufw-logs', 
    name: 'ufw-logs', 
    component: UfwLogManagement,
    meta: { requiresAuth: true }
  },
  { 
    path: '/ufw-analytics', 
    name: 'ufw-analytics', 
    component: UfwLogAnalytics,
    meta: { requiresAuth: true }
  },
  { 
    path: '/settings', 
    name: 'settings', 
    component: Settings,
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// ナビゲーションガード
router.beforeEach(async (to, from, next) => {
  console.log(`ナビゲーション: ${from.path || '/'} → ${to.path}`)
  
  const isAuthenticated = await checkAuth()
  
  // ゲスト専用ページ（ログインページ）の処理
  if (to.meta.requiresGuest) {
    if (isAuthenticated) {
      console.log('既にログイン済み: ダッシュボードにリダイレクト')
      next({ name: 'dashboard' })
    } else {
      next()
    }
    return
  }
  
  // 認証が必要なページの処理
  if (to.meta.requiresAuth) {
    if (!isAuthenticated) {
      console.log('認証が必要: ログインページにリダイレクト')
      next({ name: 'login' })
      return
    }
    
    // 管理者権限が必要なページの処理
    if (to.meta.requiresAdmin) {
      const isAdmin = await checkAdminAuth()
      if (!isAdmin) {
        console.log('管理者権限が必要: ダッシュボードにリダイレクト')
        next({ name: 'dashboard' })
        return
      }
    }
  }
  
  next()
})

export default router;
