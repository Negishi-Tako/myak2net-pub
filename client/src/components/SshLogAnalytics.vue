<template>
  <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 sm:p-6">
    <!-- グローバルローディング -->
    <LoadingSpinner 
      v-if="showGlobalLoading"
      :title="loadingTitle"
      :message="loadingMessage"
    />
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100">SSH ログ分析</h1>
      
      <!-- 期間選択 -->
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-neutral-700 dark:text-neutral-300">期間:</label>
        <select 
          v-model="selectedTimeRange" 
          @change="fetchAnalytics"
          class="h-9 px-3 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 focus:ring-2 focus:ring-blue-500"
        >
          <option value="7d">過去7日</option>
          <option value="30d">過去30日</option>
          <option value="90d">過去90日</option>
        </select>
      </div>
    </div>

    <!-- フィードバック -->
    <div v-if="feedback.message" :class="[
      'p-3 mb-4 rounded-lg text-sm font-medium',
      feedback.type === 'success' ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200' :
      feedback.type === 'info' ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200' :
      'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200'
    ]">
      {{ feedback.message }}
    </div>

    <!-- ローディング -->
    <div v-if="isLoading" class="flex justify-center items-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-2 text-neutral-600 dark:text-neutral-400">データを読み込み中...</span>
    </div>

    <!-- 統計サマリー -->
    <div v-if="analytics && !isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <h3 class="text-sm font-medium text-blue-700 dark:text-blue-300">総ログ数</h3>
        <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">{{ totalLogs.toLocaleString() }}</p>
      </div>
      <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
        <h3 class="text-sm font-medium text-purple-700 dark:text-purple-300">ログイン遮断</h3>
        <p class="text-2xl font-bold text-purple-900 dark:text-purple-100">{{ getLogTypeCount('SSH_LOGIN_BLOCKED').toLocaleString() }}</p>
      </div>
      <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
        <h3 class="text-sm font-medium text-red-700 dark:text-red-300">認証失敗</h3>
        <p class="text-2xl font-bold text-red-900 dark:text-red-100">{{ getLogTypeCount('SSH_AUTH_FAIL').toLocaleString() }}</p>
      </div>
      <div class="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
        <h3 class="text-sm font-medium text-amber-700 dark:text-amber-300">切断</h3>
        <p class="text-2xl font-bold text-amber-900 dark:text-amber-100">{{ getLogTypeCount('SSH_DISCONNECT').toLocaleString() }}</p>
      </div>
      <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
        <h3 class="text-sm font-medium text-emerald-700 dark:text-emerald-300">認証成功</h3>
        <p class="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{{ getLogTypeCount('SSH_AUTH_SUCCESS').toLocaleString() }}</p>
      </div>
    </div>

    <!-- チャート -->
    <div v-if="analytics && !isLoading" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- ログタイプ別円グラフ -->
      <div class="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
        <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">ログタイプ別分布</h3>
        <div class="relative" style="height: 300px;">
          <Doughnut
            :data="logTypeChartData"
            :options="chartOptions"
          />
        </div>
      </div>

      <!-- 時間別棒グラフ -->
      <div class="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
        <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">時間別アクティビティ</h3>
        <div class="relative" style="height: 300px;">
          <Bar
            :data="hourlyChartData"
            :options="barChartOptions"
          />
        </div>
      </div>

      <!-- 日別トレンド線グラフ -->
      <div class="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4 lg:col-span-2">
        <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">日別ログトレンド</h3>
        <div class="relative" style="height: 400px;">
          <Line
            :data="dailyTrendChartData"
            :options="lineChartOptions"
          />
        </div>
      </div>

      <!-- トップIPアドレス -->
      <div class="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
        <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">トップIPアドレス</h3>
        <div class="relative" style="height: 300px;">
          <Bar
            :data="topIpChartData"
            :options="horizontalBarOptions"
          />
        </div>
        
        <!-- IPアドレス詳細リスト -->
        <div class="mt-4 space-y-2">
          <h4 class="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">詳細情報</h4>
          <div v-for="ip in analytics.topIpAddresses.slice(0, 5)" :key="ip.ipAddress" class="flex items-center justify-between p-2 bg-white dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700">
            <div class="flex items-center gap-2">
              <span class="font-mono text-sm text-neutral-900 dark:text-neutral-100">{{ ip.ipAddress }}</span>
              <span class="text-xs text-neutral-500 dark:text-neutral-400">({{ ip.count }}回)</span>
            </div>
            <button 
              @click="queryAbuseIPDB(ip.ipAddress)"
              :disabled="isQueryingAbuseIPDB === ip.ipAddress"
              class="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isQueryingAbuseIPDB === ip.ipAddress ? '問い合わせ中...' : 'AbuseIPDB' }}
            </button>
          </div>
        </div>
        
        <!-- AbuseIPDB結果表示 -->
        <div v-if="abuseIPDBResults.length > 0" class="mt-4 space-y-3">
          <h4 class="text-sm font-medium text-neutral-700 dark:text-neutral-300">AbuseIPDB 結果</h4>
          <div v-for="result in abuseIPDBResults" :key="result.ipAddress" class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <div class="flex items-center justify-between mb-2">
              <span class="font-mono text-sm font-medium text-blue-900 dark:text-blue-100">{{ result.ipAddress }}</span>
              <span :class="[
                'px-2 py-1 text-xs font-semibold rounded-full',
                result.data.abuseConfidenceScore >= 80 ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' :
                result.data.abuseConfidenceScore >= 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200' :
                'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
              ]">
                {{ result.data.abuseConfidenceScore }}%
              </span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span class="text-neutral-600 dark:text-neutral-400">国:</span>
                <span class="ml-1 text-neutral-900 dark:text-neutral-100">{{ result.data.countryCode || '不明' }}</span>
              </div>
              <div>
                <span class="text-neutral-600 dark:text-neutral-400">使用法:</span>
                <span class="ml-1 text-neutral-900 dark:text-neutral-100">{{ result.data.usageType || '不明' }}</span>
              </div>
              <div v-if="result.data.domain" class="col-span-2">
                <span class="text-neutral-600 dark:text-neutral-400">ドメイン:</span>
                <span class="ml-1 font-mono text-neutral-900 dark:text-neutral-100">{{ result.data.domain }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ユーザー別統計 -->
      <div class="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
        <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">ユーザー別統計</h3>
        <div class="space-y-2">
          <div v-for="user in analytics.userStats.slice(0, 5)" :key="user.username" class="flex justify-between items-center">
            <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">{{ user.username }}</span>
            <span class="text-sm font-bold text-neutral-900 dark:text-neutral-100">{{ user.count.toLocaleString() }}</span>
          </div>
          <div v-if="analytics.userStats.length === 0" class="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">
            データがありません
          </div>
        </div>
      </div>
    </div>

    <!-- セキュリティ重要アクション統計 -->
    <div v-if="analytics && !isLoading && analytics.actionStats" class="mb-8">
      <h2 class="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">セキュリティ重要アクション</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div 
          v-for="action in getSecurityImportantActions()" 
          :key="action.action"
          :class="[
            'rounded-lg p-4',
            action.action === 'Disconnected from invalid user' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
            action.action === 'Authentication failed' ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' :
            action.action === 'Invalid user login attempt' ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' :
            'bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700'
          ]"
        >
          <h3 :class="[
            'text-sm font-medium mb-2',
            action.action === 'Disconnected from invalid user' ? 'text-red-700 dark:text-red-300' :
            action.action === 'Authentication failed' ? 'text-orange-700 dark:text-orange-300' :
            action.action === 'Invalid user login attempt' ? 'text-amber-700 dark:text-amber-300' :
            'text-neutral-700 dark:text-neutral-300'
          ]">
            {{ getActionDescription(action.action) }}
          </h3>
          <p :class="[
            'text-2xl font-bold',
            action.action === 'Disconnected from invalid user' ? 'text-red-900 dark:text-red-100' :
            action.action === 'Authentication failed' ? 'text-orange-900 dark:text-orange-100' :
            action.action === 'Invalid user login attempt' ? 'text-amber-900 dark:text-amber-100' :
            'text-neutral-900 dark:text-neutral-100'
          ]">
            {{ action.count.toLocaleString() }}
          </p>
          <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            {{ action.action }}
          </p>
          
          <!-- 関連IPアドレスのAbuseIPDB問い合わせ -->
          <div v-if="getRelatedIPs(action.action).length > 0" class="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
            <p class="text-xs text-neutral-600 dark:text-neutral-400 mb-2">関連IPアドレス:</p>
            <div class="space-y-1">
              <div v-for="ip in getRelatedIPs(action.action).slice(0, 3)" :key="ip" class="flex items-center justify-between">
                <span class="font-mono text-xs text-neutral-700 dark:text-neutral-300">{{ ip }}</span>
                <button 
                  @click="queryAbuseIPDB(ip)"
                  :disabled="isQueryingAbuseIPDB === ip"
                  class="px-1 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ isQueryingAbuseIPDB === ip ? '...' : 'AbuseIPDB' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- データが無い場合 -->
    <div v-if="!analytics && !isLoading" class="text-center py-8">
      <div class="text-neutral-500 dark:text-neutral-400">
        <svg class="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p class="text-lg font-medium">分析データがありません</p>
        <p class="text-sm">SSHログをインポートして分析を開始しましょう</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import LoadingSpinner from './LoadingSpinner.vue'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js'
import { Bar, Doughnut, Line } from 'vue-chartjs'

// Chart.jsの登録
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  LineElement
)

const router = useRouter()
const currentUser = inject('user')

// リアクティブデータ
const analytics = ref(null)
const isLoading = ref(false)
const selectedTimeRange = ref('7d')
const feedback = ref({
  message: '',
  type: ''
})

// グローバルローディング状態
const showGlobalLoading = ref(false)
const loadingTitle = ref('')
const loadingMessage = ref('')

// AbuseIPDB関連
const isQueryingAbuseIPDB = ref(null)
const abuseIPDBResults = ref([])

// 計算プロパティ
const totalLogs = computed(() => {
  if (!analytics.value?.logTypeStats) return 0
  return analytics.value.logTypeStats.reduce((sum, stat) => sum + stat.count, 0)
})

const getLogTypeCount = (logType) => {
  if (!analytics.value?.logTypeStats) return 0
  const stat = analytics.value.logTypeStats.find(s => s.logType === logType)
  return stat ? stat.count : 0
}

// 不正ユーザーによる切断の数をカウント
const getInvalidUserDisconnectCount = () => {
  if (!analytics.value?.actionStats) return 0
  const invalidUserStat = analytics.value.actionStats.find(s => s.action === 'Disconnected from invalid user')
  return invalidUserStat ? invalidUserStat.count : 0
}

// セキュリティ重要なアクションをフィルタリング
const getSecurityImportantActions = () => {
  if (!analytics.value?.actionStats) return []
  
  const importantActionTypes = [
    'Disconnected from invalid user',
    'Authentication failed',
    'Invalid user login attempt',
    'Login blocked',
    'Connection attempt blocked'
  ]
  
  return analytics.value.actionStats
    .filter(action => importantActionTypes.includes(action.action))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6) // 最大6個まで表示
}

// Chart.jsのカラーパレット
const colors = {
  SSH_LOGIN_BLOCKED: '#8b5cf6',  // purple
  SSH_DISCONNECT: '#f59e0b',     // amber
  SSH_AUTH_FAIL: '#ef4444',      // red
  SSH_CONNECT: '#10b981',        // emerald
  SSH_AUTH_SUCCESS: '#22c55e',   // green
  CRON_SESSION: '#3b82f6',       // blue
  OTHER: '#6b7280'               // gray
}

const logTypeLabels = {
  SSH_LOGIN_BLOCKED: 'ログイン遮断',
  SSH_DISCONNECT: '切断',
  SSH_AUTH_FAIL: '認証失敗',
  SSH_CONNECT: 'SSH接続',
  SSH_AUTH_SUCCESS: '認証成功',
  CRON_SESSION: 'CRONセッション',
  OTHER: 'その他'
}

// ログタイプ別円グラフデータ
const logTypeChartData = computed(() => {
  if (!analytics.value?.logTypeStats) return { labels: [], datasets: [] }
  
  return {
    labels: analytics.value.logTypeStats.map(stat => logTypeLabels[stat.logType] || stat.logType),
    datasets: [{
      data: analytics.value.logTypeStats.map(stat => stat.count),
      backgroundColor: analytics.value.logTypeStats.map(stat => colors[stat.logType] || colors.OTHER),
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  }
})

// 時間別棒グラフデータ
const hourlyChartData = computed(() => {
  if (!analytics.value?.hourlyStats) return { labels: [], datasets: [] }
  
  // 24時間分のデータを準備
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const stat = analytics.value.hourlyStats.find(s => s.hour === i)
    return stat ? stat.count : 0
  })
  
  return {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [{
      label: 'ログ件数',
      data: hourlyData,
      backgroundColor: '#3b82f6',
      borderColor: '#1d4ed8',
      borderWidth: 1
    }]
  }
})

// 日別トレンド線グラフデータ
const dailyTrendChartData = computed(() => {
  if (!analytics.value?.dailyStats) return { labels: [], datasets: [] }
  
  // 日付ごとにデータを整理
  const dateMap = new Map()
  const logTypes = [...new Set(analytics.value.dailyStats.map(stat => stat.logType))]
  
  analytics.value.dailyStats.forEach(stat => {
    const dateStr = new Date(stat.date).toLocaleDateString('ja-JP')
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, {})
    }
    dateMap.get(dateStr)[stat.logType] = stat.count
  })
  
  const dates = Array.from(dateMap.keys()).sort()
  
  const datasets = logTypes.map(logType => ({
    label: logTypeLabels[logType] || logType,
    data: dates.map(date => dateMap.get(date)[logType] || 0),
    borderColor: colors[logType] || colors.OTHER,
    backgroundColor: colors[logType] || colors.OTHER,
    tension: 0.4,
    fill: false
  }))
  
  return {
    labels: dates,
    datasets
  }
})

// トップIPアドレス棒グラフデータ
const topIpChartData = computed(() => {
  if (!analytics.value?.topIpAddresses) return { labels: [], datasets: [] }
  
  return {
    labels: analytics.value.topIpAddresses.map(ip => ip.ipAddress),
    datasets: [{
      label: 'アクセス数',
      data: analytics.value.topIpAddresses.map(ip => ip.count),
      backgroundColor: '#ef4444',
      borderColor: '#dc2626',
      borderWidth: 1
    }]
  }
})

// チャートオプション
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom'
    }
  }
}

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    }
  },
  scales: {
    y: {
      beginAtZero: true
    }
  }
}

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top'
    }
  },
  scales: {
    y: {
      beginAtZero: true
    }
  }
}

const horizontalBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: {
    legend: {
      display: false
    }
  },
  scales: {
    x: {
      beginAtZero: true
    }
  }
}

// メソッド
const fetchAnalytics = async () => {
  isLoading.value = true
  
  // グローバルローディングを表示
  showGlobalLoading.value = true
  loadingTitle.value = '分析データ取得中'
  loadingMessage.value = 'ログデータを分析しています...'
  
  // AbuseIPDB結果をクリア
  abuseIPDBResults.value = []
  
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/log/query?timeRange=${selectedTimeRange.value}`, {
      credentials: 'include'
    })

    if (response.ok) {
      const data = await response.json()
      analytics.value = data
      console.log('Analytics data:', data)
      if (!data.logTypeStats || data.logTypeStats.length === 0) {
        showFeedback('選択した期間にはデータがありません', 'info')
      }
    } else {
      const errorData = await response.json().catch(() => ({ error: '不明なエラー' }))
      console.error('API Error:', errorData)
      showFeedback(`分析データの取得に失敗しました: ${errorData.error || 'サーバーエラー'}`, 'error')
    }
  } catch (error) {
    console.error('Error fetching analytics:', error)
    showFeedback('ネットワークエラーが発生しました', 'error')
  } finally {
    isLoading.value = false
    showGlobalLoading.value = false
  }
}

const showFeedback = (message, type) => {
  feedback.value = { message, type }
  setTimeout(() => {
    feedback.value = { message: '', type: '' }
  }, 5000)
}

// AbuseIPDB問い合わせ
const queryAbuseIPDB = async (ipAddress) => {
  isQueryingAbuseIPDB.value = ipAddress
  
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/log/abuseipdb/${ipAddress}`, {
      credentials: 'include'
    })

    if (response.ok) {
      const data = await response.json()
      
      // 既存の結果を更新または新規追加
      const existingIndex = abuseIPDBResults.value.findIndex(result => result.ipAddress === ipAddress)
      if (existingIndex >= 0) {
        abuseIPDBResults.value[existingIndex] = data
      } else {
        abuseIPDBResults.value.push(data)
      }
      
      showFeedback(`${ipAddress}のAbuseIPDB情報を取得しました`, 'success')
    } else {
      const errorData = await response.json().catch(() => ({ error: '不明なエラー' }))
      showFeedback(`AbuseIPDB問い合わせに失敗しました: ${errorData.error}`, 'error')
    }
  } catch (error) {
    console.error('Error querying AbuseIPDB:', error)
    showFeedback('ネットワークエラーが発生しました', 'error')
  } finally {
    isQueryingAbuseIPDB.value = null
  }
}

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

// アクションタイプに基づく詳細な説明を提供
const getActionDescription = (action, logType) => {
  if (action === 'Disconnected from invalid user') {
    return '不正ユーザーによる接続の切断'
  }
  if (action === 'Disconnected from authenticating user') {
    return '認証中ユーザーの切断'
  }
  if (action === 'Login blocked') {
    return 'ログイン試行の遮断'
  }
  if (action === 'Authentication failed') {
    return 'パスワード認証失敗'
  }
  if (action === 'Invalid user login attempt') {
    return '無効ユーザーでのログイン試行'
  }
  return action
}

// アクションに関連するIPアドレスを取得
const getRelatedIPs = (action) => {
  if (!analytics.value?.topIpAddresses) return []
  
  // セキュリティ上重要なアクションに関連するIPアドレスを返す
  const securityActions = [
    'Disconnected from invalid user',
    'Authentication failed',
    'Invalid user login attempt',
    'Login blocked'
  ]
  
  if (securityActions.includes(action)) {
    return analytics.value.topIpAddresses.map(ip => ip.ipAddress)
  }
  
  return []
}

// 初期化
onMounted(async () => {
  try {
    console.log('SshLogAnalytics: コンポーネント初期化開始')
    const isAuthenticated = await checkAuthStatus()
    console.log('SshLogAnalytics: 認証状態:', isAuthenticated)
    if (isAuthenticated) {
      console.log('SshLogAnalytics: 分析データ取得開始')
      await fetchAnalytics()
      console.log('SshLogAnalytics: 分析データ取得完了')
    }
  } catch (error) {
    console.error('SshLogAnalytics: 初期化エラー:', error)
    showFeedback('コンポーネントの初期化に失敗しました', 'error')
  }
})
</script>

<style scoped>
/* アニメーション */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
