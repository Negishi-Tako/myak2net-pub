<template>
  <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 sm:p-6">
    <h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">設定管理</h1>

    <!-- フィードバック -->
    <div v-if="feedback.message" :class="['p-3 mb-4 rounded-lg text-sm font-medium', feedback.type === 'success' ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200']">
      {{ feedback.message }}
    </div>

    <!-- AbuseIPDB設定 -->
    <div class="mb-8 p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border dark:border-neutral-700/50">
      <h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">AbuseIPDB設定</h2>
      <p class="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
        AbuseIPDBのAPIキーを設定すると、SSHログの詳細でIPアドレスの悪意度を確認できます。
      </p>
      
      <form @submit.prevent="updateAbuseIPDBSettings" class="space-y-4">
        <div>
          <label for="abuseipdbApiKey" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            APIキー
          </label>
          <div class="flex gap-2">
            <input 
              v-model="settings.abuseipdbApiKey" 
              id="abuseipdbApiKey" 
              type="password" 
              class="flex-1 h-10 px-3 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 focus:ring-2 focus:ring-blue-500" 
              placeholder="AbuseIPDB APIキーを入力してください"
            />
            <button 
              type="button"
              @click="toggleApiKeyVisibility"
              class="h-10 px-3 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700"
            >
              <svg v-if="showApiKey" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
            </button>
          </div>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            APIキーはAbuseIPDBの公式サイトで取得できます。
          </p>
        </div>

        <div class="flex items-center gap-4">
          <button 
            type="submit" 
            :disabled="isUpdating"
            class="h-10 px-4 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isUpdating ? '更新中...' : '設定を保存' }}
          </button>
          
          <button 
            type="button"
            @click="testAbuseIPDBConnection"
            :disabled="!settings.abuseipdbApiKey || isTesting"
            class="h-10 px-4 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isTesting ? 'テスト中...' : '接続テスト' }}
          </button>
        </div>
      </form>

      <!-- 接続テスト結果 -->
      <div v-if="testResult" class="mt-4 p-3 rounded-lg text-sm" :class="testResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'">
        <div class="flex items-center gap-2 mb-2">
          <svg v-if="testResult.success" class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <svg v-else class="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          <span :class="testResult.success ? 'text-green-800 dark:text-green-200 font-medium' : 'text-red-800 dark:text-red-200 font-medium'">
            {{ testResult.success ? '接続テスト成功' : '接続テスト失敗' }}
          </span>
        </div>
        <p :class="testResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'">
          {{ testResult.message }}
        </p>
      </div>
    </div>

    <!-- 現在の設定情報 -->
    <div class="p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border dark:border-neutral-700/50">
      <h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">現在の設定</h2>
      <div class="space-y-3 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-neutral-700 dark:text-neutral-300">AbuseIPDB APIキー:</span>
          <span :class="settings.abuseipdbApiKey ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'">
            {{ settings.abuseipdbApiKey ? '設定済み' : '未設定' }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-neutral-700 dark:text-neutral-300">最終更新:</span>
          <span class="text-neutral-600 dark:text-neutral-400">
            {{ lastUpdated ? new Date(lastUpdated).toLocaleString('ja-JP') : '未更新' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentUser = inject('user')

// リアクティブデータ
const settings = ref({
  abuseipdbApiKey: ''
})
const feedback = ref({ message: '', type: '' })
const isUpdating = ref(false)
const isTesting = ref(false)
const showApiKey = ref(false)
const testResult = ref(null)
const lastUpdated = ref(null)

// 認証チェック
const checkAuthStatus = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/users/me`, { 
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

// 設定を取得
const fetchSettings = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/users/me`, {
      credentials: 'include'
    })

    if (response.ok) {
      const data = await response.json()
      settings.value.abuseipdbApiKey = data.user.abuseipdbApiKey || ''
      lastUpdated.value = data.user.updatedAt
    } else {
      showFeedback('設定の取得に失敗しました', 'error')
    }
  } catch (error) {
    console.error('Error fetching settings:', error)
    showFeedback('ネットワークエラーが発生しました', 'error')
  }
}

// 設定を更新
const updateAbuseIPDBSettings = async () => {
  isUpdating.value = true
  
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/users/${currentUser.value.id}/abuseipdb-key`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        abuseipdbApiKey: settings.value.abuseipdbApiKey
      })
    })

    if (response.ok) {
      showFeedback('設定を更新しました', 'success')
      await fetchSettings() // 設定を再取得
    } else {
      const errorData = await response.json().catch(() => ({ message: '不明なエラー' }))
      showFeedback(`設定の更新に失敗しました: ${errorData.message}`, 'error')
    }
  } catch (error) {
    console.error('Error updating settings:', error)
    showFeedback('ネットワークエラーが発生しました', 'error')
  } finally {
    isUpdating.value = false
  }
}

// AbuseIPDB接続テスト
const testAbuseIPDBConnection = async () => {
  isTesting.value = true
  testResult.value = null
  
  try {
    // テスト用のIPアドレス（公式ドキュメントの例）でAbuseIPDBに問い合わせ
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/log/abuseipdb/118.25.6.39`, {
      credentials: 'include'
    })

    if (response.ok) {
      const data = await response.json()
      testResult.value = {
        success: true,
        message: 'AbuseIPDB APIへの接続が正常に確立されました。'
      }
    } else {
      const errorData = await response.json().catch(() => ({ error: '不明なエラー' }))
      testResult.value = {
        success: false,
        message: `接続テストに失敗しました: ${errorData.error}`
      }
    }
  } catch (error) {
    console.error('Error testing AbuseIPDB connection:', error)
    testResult.value = {
      success: false,
      message: 'ネットワークエラーが発生しました'
    }
  } finally {
    isTesting.value = false
  }
}

// APIキーの表示/非表示を切り替え
const toggleApiKeyVisibility = () => {
  showApiKey.value = !showApiKey.value
  const input = document.getElementById('abuseipdbApiKey')
  if (input) {
    input.type = showApiKey.value ? 'text' : 'password'
  }
}

// フィードバック表示
const showFeedback = (message, type, duration = 4000) => {
  feedback.value = { message, type }
  if (duration) {
    setTimeout(() => {
      feedback.value = { message: '', type: '' }
    }, duration)
  }
}

// 初期化
onMounted(async () => {
  try {
    const isAuthenticated = await checkAuthStatus()
    if (isAuthenticated) {
      await fetchSettings()
    }
  } catch (error) {
    console.error('Settings: 初期化エラー:', error)
    showFeedback('コンポーネントの初期化に失敗しました', 'error')
  }
})
</script>
