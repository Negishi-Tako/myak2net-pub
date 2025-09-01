<template>
  <div class="dashboard-container">
    <div class="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
      <h1 class="text-2xl font-bold text-center text-neutral-900 dark:text-neutral-100 mb-4">
        ようこそ！ {{ user?.email || 'ゲスト' }}!
      </h1>
      <p class="text-center text-neutral-600 dark:text-neutral-400">
        ポータルへようこそ！ここではSSHやUFWのログを確認することができます。
      </p>
    </div>
  </div>
</template>

<script setup>
import { inject, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 親コンポーネント（App.vue）からユーザー情報を取得
const user = inject('user')

// 認証チェック機能
const checkAuthStatus = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me`, { 
      credentials: 'include' 
    })
    
    if (!response.ok) {
      router.push({ name: 'login' })
      return false
    }
    return true
  } catch (error) {
    router.push({ name: 'login' })
    return false
  }
}

onMounted(async () => {
  await checkAuthStatus()
})
</script>

