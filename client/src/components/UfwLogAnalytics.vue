<template>
  <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 sm:p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100">UFW ログ分析</h1>
      
      <!-- 管理ページへのリンク -->
      <router-link 
        to="/ufw-logs"
        class="h-9 px-4 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ログ管理に戻る
      </router-link>
    </div>

    <!-- 期間選択 -->
    <div class="mb-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border dark:border-neutral-700/50">
      <h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">分析期間</h2>
      <div class="flex gap-4">
        <button 
          v-for="range in timeRanges" 
          :key="range.value"
          @click="selectTimeRange(range.value)"
          :class="[
            'h-9 px-4 rounded text-sm font-medium',
            selectedTimeRange === range.value 
              ? 'bg-blue-600 text-white' 
              : 'bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
          ]"
        >
          {{ range.label }}
        </button>
      </div>
    </div>

    <!-- ローディング -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <!-- 分析結果 -->
    <div v-else-if="analyticsData" class="space-y-6">
      <!-- サマリーカード -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border dark:border-blue-700/50">
          <h3 class="text-sm font-medium text-blue-900 dark:text-blue-100">総ログ数</h3>
          <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {{ totalLogs }}
          </p>
        </div>
        <div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border dark:border-red-700/50">
          <h3 class="text-sm font-medium text-red-900 dark:text-red-100">ブロック数</h3>
          <p class="text-2xl font-bold text-red-600 dark:text-red-400">
            {{ blockCount }}
          </p>
        </div>
        <div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border dark:border-green-700/50">
          <h3 class="text-sm font-medium text-green-900 dark:text-green-100">許可数</h3>
          <p class="text-2xl font-bold text-green-600 dark:text-green-400">
            {{ acceptCount }}
          </p>
        </div>
        <div class="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border dark:border-orange-700/50">
          <h3 class="text-sm font-medium text-orange-900 dark:text-orange-100">拒否数</h3>
          <p class="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {{ rejectCount }}
          </p>
        </div>
      </div>

      <!-- ログタイプ別統計 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">ログタイプ別統計</h3>
          <div class="space-y-3">
            <div v-for="stat in analyticsData.logTypeStats" :key="stat.logType" class="flex justify-between items-center">
              <span class="text-sm text-neutral-600 dark:text-neutral-400">
                {{ getLogTypeLabel(stat.logType) }}
              </span>
              <span class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {{ stat.count.toLocaleString() }}
              </span>
            </div>
          </div>
        </div>

        <!-- プロトコル別統計 -->
        <div class="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">プロトコル別統計</h3>
          <div class="space-y-3">
            <div v-for="stat in analyticsData.protocolStats" :key="stat.protocol" class="flex justify-between items-center">
              <span class="text-sm text-neutral-600 dark:text-neutral-400">
                {{ stat.protocol || '不明' }}
              </span>
              <span class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {{ stat.count.toLocaleString() }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- トップIPアドレス -->
      <div class="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
        <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">トップIPアドレス（アクセス数順）</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-xs text-neutral-700 dark:text-neutral-300 uppercase bg-neutral-50 dark:bg-neutral-800">
              <tr>
                <th class="px-4 py-3 text-left">IPアドレス</th>
                <th class="px-4 py-3 text-left">アクセス数</th>
                <th class="px-4 py-3 text-left">割合</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(stat, index) in analyticsData.topIpAddresses" :key="stat.ipAddress" class="border-b border-neutral-200 dark:border-neutral-700">
                <td class="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                  {{ stat.ipAddress || '不明' }}
                </td>
                <td class="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                  {{ stat.count.toLocaleString() }}
                </td>
                <td class="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                  {{ ((stat.count / totalLogs) * 100).toFixed(1) }}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ポート別統計 -->
      <div class="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
        <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">ポート別統計</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-xs text-neutral-700 dark:text-neutral-300 uppercase bg-neutral-50 dark:bg-neutral-800">
              <tr>
                <th class="px-4 py-3 text-left">ポート</th>
                <th class="px-4 py-3 text-left">アクセス数</th>
                <th class="px-4 py-3 text-left">サービス</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stat in analyticsData.portStats" :key="stat.port" class="border-b border-neutral-200 dark:border-neutral-700">
                <td class="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                  {{ stat.port || '不明' }}
                </td>
                <td class="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                  {{ stat.count.toLocaleString() }}
                </td>
                <td class="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                  {{ getServiceName(stat.port) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 時間別統計 -->
      <div class="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
        <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">時間別アクセス数（24時間）</h3>
        <div class="h-64">
          <canvas ref="hourlyChart"></canvas>
        </div>
      </div>

      <!-- 日別統計 -->
      <div class="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
        <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">日別アクセス数</h3>
        <div class="h-64">
          <canvas ref="dailyChart"></canvas>
        </div>
      </div>
    </div>

    <!-- エラー表示 -->
    <div v-if="error" class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
      <p class="text-red-700 dark:text-red-300">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

// 状態管理
const loading = ref(false)
const error = ref('')
const analyticsData = ref(null)
const selectedTimeRange = ref('7d')

// チャート参照
const hourlyChart = ref(null)
const dailyChart = ref(null)

// 時間範囲オプション
const timeRanges = [
  { value: '7d', label: '過去7日間' },
  { value: '30d', label: '過去30日間' },
  { value: '90d', label: '過去90日間' }
]

// 計算プロパティ
const totalLogs = computed(() => {
  if (!analyticsData.value) return 0
  return analyticsData.value.logTypeStats.reduce((sum, stat) => sum + stat.count, 0)
})

const blockCount = computed(() => {
  if (!analyticsData.value) return 0
  return analyticsData.value.logTypeStats
    .filter(stat => stat.logType === 'UFW_BLOCK' || stat.logType === 'UFW_DROP')
    .reduce((sum, stat) => sum + stat.count, 0)
})

const acceptCount = computed(() => {
  if (!analyticsData.value) return 0
  return analyticsData.value.logTypeStats
    .filter(stat => stat.logType === 'UFW_ACCEPT')
    .reduce((sum, stat) => sum + stat.count, 0)
})

const rejectCount = computed(() => {
  if (!analyticsData.value) return 0
  return analyticsData.value.logTypeStats
    .filter(stat => stat.logType === 'UFW_REJECT')
    .reduce((sum, stat) => sum + stat.count, 0)
})

// 初期化
onMounted(() => {
  fetchAnalytics()
})

// 時間範囲変更監視
watch(selectedTimeRange, () => {
  fetchAnalytics()
})

// 分析データ取得
async function fetchAnalytics() {
  loading.value = true
  error.value = ''
  
  try {
    const params = new URLSearchParams({
      timeRange: selectedTimeRange.value,
      queryType: 'detailed'
    })

    const response = await fetch(`/log/ufw/analytics?${params}`)
    if (!response.ok) throw new Error('Failed to fetch analytics')
    
    const data = await response.json()
    analyticsData.value = data
    
    // チャートを描画
    nextTick(() => {
      renderCharts()
    })
  } catch (err) {
    console.error('Error fetching analytics:', err)
    error.value = '分析データの取得に失敗しました'
  } finally {
    loading.value = false
  }
}

// 時間範囲選択
function selectTimeRange(range) {
  selectedTimeRange.value = range
}

// チャート描画
function renderCharts() {
  if (!analyticsData.value) return

  // 時間別チャート
  if (hourlyChart.value) {
    const ctx = hourlyChart.value.getContext('2d')
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [{
          label: 'アクセス数',
          data: analyticsData.value.hourlyStats.map(stat => stat.count),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    })
  }

  // 日別チャート
  if (dailyChart.value && analyticsData.value.dailyStats.length > 0) {
    const ctx = dailyChart.value.getContext('2d')
    const dailyData = analyticsData.value.dailyStats.reduce((acc, stat) => {
      const date = stat.date
      if (!acc[date]) acc[date] = 0
      acc[date] += stat.count
      return acc
    }, {})

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(dailyData),
        datasets: [{
          label: 'アクセス数',
          data: Object.values(dailyData),
          backgroundColor: 'rgba(59, 130, 246, 0.8)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    })
  }
}

// ログタイプラベル
function getLogTypeLabel(logType) {
  const labels = {
    'UFW_DROP': 'DROP',
    'UFW_ACCEPT': 'ACCEPT',
    'UFW_REJECT': 'REJECT',
    'UFW_LIMIT': 'LIMIT',
    'UFW_LOG': 'LOG',
    'UFW_BLOCK': 'BLOCK',
    'OTHER': 'その他'
  }
  return labels[logType] || logType
}

// サービス名取得
function getServiceName(port) {
  const services = {
    22: 'SSH',
    80: 'HTTP',
    443: 'HTTPS',
    21: 'FTP',
    25: 'SMTP',
    53: 'DNS',
    110: 'POP3',
    143: 'IMAP',
    993: 'IMAPS',
    995: 'POP3S',
    3306: 'MySQL',
    5432: 'PostgreSQL',
    27017: 'MongoDB',
    6379: 'Redis'
  }
  return services[port] || '不明'
}
</script>
