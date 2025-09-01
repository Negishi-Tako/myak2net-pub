<template>
  <div id="app">
    <!-- ローディング画面 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>

    <!-- ログインページ -->
    <router-view v-if="!isAuthenticated && $route.name === 'login'" @login-success="handleLoginSuccess" />
    
    <!-- メインアプリケーション（認証済み） -->
    <AppLayout 
      v-else-if="isAuthenticated"
      :user="user" 
      :theme="theme" 
      :accountingRoles="accountingRoles" 
      :assignedRoles="assignedRoles"
      @logout="handleLogout" 
      @toggle-theme="toggleTheme"
    />
  </div>
</template>

<script setup>
import { ref, provide, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppLayout from './components/AppLayout.vue'

const router = useRouter()
const route = useRoute()

// State
const isAuthenticated = ref(false)
const user = ref(null)
const accountingRoles = ref([])
const assignedRoles = ref([])
const theme = ref(localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
const isLoading = ref(false)

// Provide user data to child components
provide('user', user)

// Theme management
const applyTheme = (newTheme) => {
  document.body.className = `${newTheme}-mode`
  localStorage.setItem('theme', newTheme)
}

watch(theme, applyTheme, { immediate: true })

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

// Authentication
const checkLoginStatus = async () => {
  isLoading.value = true
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me`, { 
      credentials: 'include' 
    })
    if (response.ok) {
      const data = await response.json()
      user.value = data.user
      isAuthenticated.value = true
      await fetchUserRoles()
    } else {
      isAuthenticated.value = false
      user.value = null
      router.push({ name: 'login' })
    }
  } catch (error) {
    console.error('Error checking login status:', error)
    isAuthenticated.value = false
    user.value = null
    router.push({ name: 'login' })
  } finally {
    isLoading.value = false
  }
}

const fetchUserRoles = async () => {
  if (!user.value) return
  
  try {
    // ここでユーザーのロール情報を取得する処理を追加
    // 現在のAPIエンドポイントに合わせて実装
    accountingRoles.value = []
    assignedRoles.value = []
  } catch (error) {
    console.error('Error fetching user roles:', error)
  }
}

const handleLoginSuccess = async () => {
  await checkLoginStatus()
  if (isAuthenticated.value) {
    router.push({ name: 'dashboard' })
  }
}

const handleLogout = () => {
  isAuthenticated.value = false
  user.value = null
  accountingRoles.value = []
  assignedRoles.value = []
  router.push({ name: 'login' })
}

// ルート変更の監視
watch(route, (newRoute) => {
  console.log(`ルート変更: ${newRoute.path}`)
  // 認証が必要なページに移動する際は認証状態を再確認
  if (newRoute.meta?.requiresAuth && !isAuthenticated.value) {
    checkLoginStatus()
  }
}, { immediate: true })

// 認証状態の変更を監視
watch(isAuthenticated, (newValue) => {
  if (!newValue && route.name !== 'login') {
    console.log('認証が失効: ログインページにリダイレクト')
    router.push({ name: 'login' })
  }
})

// Initialize
onMounted(() => {
  checkLoginStatus()
})
</script>



