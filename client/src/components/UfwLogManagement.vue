<template>
  <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 sm:p-6">
    <!-- グローバルローディング -->
    <LoadingSpinner 
      v-if="showGlobalLoading"
      :title="loadingTitle"
      :message="loadingMessage"
      :progress="loadingProgress"
    />
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100">UFW ログ管理</h1>
      
      <!-- 分析ページへのリンク -->
      <router-link 
        to="/ufw-analytics"
        class="h-9 px-4 rounded bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 flex items-center gap-2"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        分析を見る
      </router-link>
    </div>

    <!-- ログインポート機能（管理者のみ） -->
    <div v-if="isAdmin" class="mb-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border dark:border-neutral-700/50">
      <h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">ログファイルのインポート</h2>
      <p class="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
        サーバーの ufw.log ファイルからUFWログをデータベースに取り込みます。
      </p>
      <button 
        @click="importLogs" 
        :disabled="isImporting"
        class="h-10 px-4 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isImporting ? 'インポート中...' : 'ログをインポート' }}
      </button>
    </div>

    <!-- ログ削除機能（管理者のみ） -->
    <div v-if="isAdmin" class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
      <h2 class="text-lg font-semibold text-red-900 dark:text-red-100 mb-4">ログ削除機能</h2>
      <p class="text-sm text-red-700 dark:text-red-300 mb-4">
        ⚠️ 注意: これらの操作は取り消せません。十分注意して実行してください。
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- 古いログ削除 -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-red-700 dark:text-red-300">古いログを削除</label>
          <div class="flex items-center gap-2">
            <input 
              v-model.number="cleanupDays" 
              type="number" 
              min="1" 
              max="365"
              class="h-9 px-3 w-20 rounded border bg-white dark:bg-neutral-800 border-red-300 dark:border-red-600 focus:ring-2 focus:ring-red-500 text-sm"
            />
            <span class="text-sm text-red-600 dark:text-red-400">日より古いログを削除</span>
          </div>
          <button 
            @click="confirmCleanupLogs"
            :disabled="isDeleting"
            class="h-9 px-4 rounded bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
          >
            {{ isDeleting ? '削除中...' : 'クリーンアップ実行' }}
          </button>
        </div>

        <!-- 全ログ削除 -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-red-700 dark:text-red-300">全ログ削除</label>
          <p class="text-xs text-red-600 dark:text-red-400">データベース内の全てのUFWログを削除します</p>
          <button 
            @click="confirmDeleteAllLogs"
            :disabled="isDeleting"
            class="h-9 px-4 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {{ isDeleting ? '削除中...' : '全ログ削除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- フィードバック -->
    <div v-if="feedback.message" :class="['p-3 mb-4 rounded-lg text-sm font-medium', feedback.type === 'success' ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200']">
      {{ feedback.message }}
    </div>

    <!-- インポート結果詳細 -->
    <div v-if="importResult" class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border dark:border-blue-700/50">
      <h3 class="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">インポート結果</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span class="font-medium text-neutral-700 dark:text-neutral-300">総行数:</span>
          <span class="ml-1 text-blue-600 dark:text-blue-400">{{ importResult.totalLines }}</span>
        </div>
        <div>
          <span class="font-medium text-neutral-700 dark:text-neutral-300">解析済み:</span>
          <span class="ml-1 text-blue-600 dark:text-blue-400">{{ importResult.parsedLines }}</span>
        </div>
        <div>
          <span class="font-medium text-neutral-700 dark:text-neutral-300">スキップ:</span>
          <span class="ml-1 text-blue-600 dark:text-blue-400">{{ importResult.skippedLines }}</span>
        </div>
        <div>
          <span class="font-medium text-neutral-700 dark:text-neutral-300">エラー:</span>
          <span class="ml-1 text-blue-600 dark:text-blue-400">{{ importResult.errorLines }}</span>
        </div>
      </div>
      <div v-if="importResult.errors.length > 0" class="mt-4">
        <h4 class="text-sm font-medium text-red-700 dark:text-red-300 mb-2">エラー詳細:</h4>
        <div class="max-h-32 overflow-y-auto text-xs text-red-600 dark:text-red-400">
          <div v-for="(error, index) in importResult.errors.slice(0, 10)" :key="index" class="mb-1">
            {{ error }}
          </div>
          <div v-if="importResult.errors.length > 10" class="text-neutral-500">
            ... 他 {{ importResult.errors.length - 10 }} 件のエラー
          </div>
        </div>
      </div>
    </div>

    <!-- フィルター -->
    <div class="mb-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border dark:border-neutral-700/50">
      <h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">フィルター</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- ログタイプ -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">ログタイプ</label>
          <select 
            v-model="filters.logType" 
            class="w-full h-9 px-3 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">全て</option>
            <option value="UFW_DROP">UFW DROP</option>
            <option value="UFW_ACCEPT">UFW ACCEPT</option>
            <option value="UFW_REJECT">UFW REJECT</option>
            <option value="UFW_LIMIT">UFW LIMIT</option>
            <option value="UFW_LOG">UFW LOG</option>
            <option value="UFW_BLOCK">UFW BLOCK</option>
            <option value="OTHER">その他</option>
          </select>
        </div>

        <!-- IPアドレス -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">IPアドレス</label>
          <input 
            v-model="filters.ipAddress" 
            type="text" 
            placeholder="192.168.1.1"
            class="w-full h-9 px-3 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <!-- プロトコル -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">プロトコル</label>
          <select 
            v-model="filters.protocol" 
            class="w-full h-9 px-3 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">全て</option>
            <option value="TCP">TCP</option>
            <option value="UDP">UDP</option>
            <option value="ICMP">ICMP</option>
          </select>
        </div>

        <!-- 日付範囲 -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">開始日</label>
          <input 
            v-model="filters.startDate" 
            type="date" 
            class="w-full h-9 px-3 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <!-- 終了日 -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">終了日</label>
          <input 
            v-model="filters.endDate" 
            type="date" 
            class="w-full h-9 px-3 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <!-- フィルター適用ボタン -->
        <div class="flex items-end">
          <button 
            @click="applyFilters"
            class="h-9 px-4 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            フィルター適用
          </button>
        </div>

        <!-- フィルターリセット -->
        <div class="flex items-end">
          <button 
            @click="resetFilters"
            class="h-9 px-4 rounded bg-neutral-600 text-white text-sm font-medium hover:bg-neutral-700"
          >
            リセット
          </button>
        </div>
      </div>
    </div>

    <!-- ログテーブル -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-neutral-700 dark:text-neutral-300 uppercase bg-neutral-50 dark:bg-neutral-800">
          <tr>
            <th class="px-4 py-3">タイムスタンプ</th>
            <th class="px-4 py-3">ホスト名</th>
            <th class="px-4 py-3">IPアドレス</th>
            <th class="px-4 py-3">ポート</th>
            <th class="px-4 py-3">プロトコル</th>
            <th class="px-4 py-3">アクション</th>
            <th class="px-4 py-3">ログタイプ</th>
            <th class="px-4 py-3">メッセージ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id" class="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800">
            <td class="px-4 py-3 text-neutral-600 dark:text-neutral-400">
              {{ formatDate(log.timestamp) }}
            </td>
            <td class="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
              {{ log.hostname }}
            </td>
            <td class="px-4 py-3 text-neutral-600 dark:text-neutral-400">
              {{ log.ipAddress || '-' }}
            </td>
            <td class="px-4 py-3 text-neutral-600 dark:text-neutral-400">
              {{ log.port || '-' }}
            </td>
            <td class="px-4 py-3 text-neutral-600 dark:text-neutral-400">
              {{ log.protocol || '-' }}
            </td>
            <td class="px-4 py-3">
              <span :class="getActionClass(log.action)" class="px-2 py-1 text-xs font-medium rounded-full">
                {{ log.action }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span :class="getLogTypeClass(log.logType)" class="px-2 py-1 text-xs font-medium rounded-full">
                {{ getLogTypeLabel(log.logType) }}
              </span>
            </td>
            <td class="px-4 py-3 text-neutral-600 dark:text-neutral-400 max-w-xs truncate">
              {{ log.message }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ページネーション -->
    <div v-if="pagination.totalPages > 1" class="mt-6 flex justify-between items-center">
      <div class="text-sm text-neutral-600 dark:text-neutral-400">
        全 {{ pagination.total }} 件中 {{ (pagination.page - 1) * pagination.limit + 1 }} - {{ Math.min(pagination.page * pagination.limit, pagination.total) }} 件を表示
      </div>
      <div class="flex gap-2">
        <button 
          @click="changePage(pagination.page - 1)"
          :disabled="pagination.page <= 1"
          class="h-8 px-3 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          前へ
        </button>
        <span class="h-8 px-3 flex items-center text-sm text-neutral-600 dark:text-neutral-400">
          {{ pagination.page }} / {{ pagination.totalPages }}
        </span>
        <button 
          @click="changePage(pagination.page + 1)"
          :disabled="pagination.page >= pagination.totalPages"
          class="h-8 px-3 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          次へ
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import LoadingSpinner from './LoadingSpinner.vue'

const router = useRouter()

// 状態管理
const logs = ref([])
const pagination = reactive({
  page: 1,
  limit: 50,
  total: 0,
  totalPages: 0
})

const filters = reactive({
  logType: '',
  ipAddress: '',
  protocol: '',
  startDate: '',
  endDate: ''
})

const feedback = reactive({
  message: '',
  type: 'success'
})

const importResult = ref(null)
const isImporting = ref(false)
const isDeleting = ref(false)
const cleanupDays = ref(30)

// ローディング状態
const showGlobalLoading = ref(false)
const loadingTitle = ref('')
const loadingMessage = ref('')
const loadingProgress = ref(0)

// 権限チェック
const isAdmin = computed(() => {
  // 実際の実装では認証状態から判定
  return true
})

// 初期化
onMounted(() => {
  fetchLogs()
})

// ログ取得
async function fetchLogs() {
  try {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
      ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value))
    })

    const response = await fetch(`/log/ufw?${params}`)
    if (!response.ok) throw new Error('Failed to fetch logs')
    
    const data = await response.json()
    logs.value = data.logs
    Object.assign(pagination, data.pagination)
  } catch (error) {
    showFeedback('ログの取得に失敗しました', 'error')
  }
}

// フィルター適用
function applyFilters() {
  pagination.page = 1
  fetchLogs()
}

// フィルターリセット
function resetFilters() {
  Object.keys(filters).forEach(key => {
    filters[key] = ''
  })
  pagination.page = 1
  fetchLogs()
}

// ページ変更
function changePage(page) {
  pagination.page = page
  fetchLogs()
}

// ログインポート
async function importLogs() {
  if (!confirm('UFWログファイルをインポートしますか？')) return

  isImporting.value = true
  showGlobalLoading.value = true
  loadingTitle.value = 'ログインポート中'
  loadingMessage.value = 'UFWログファイルを読み込んでいます...'

  try {
    const response = await fetch('/log/ufw/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) throw new Error('Import failed')
    
    const result = await response.json()
    importResult.value = result
    showFeedback(`インポート完了: ${result.parsedLines}件のログを処理しました`, 'success')
    fetchLogs()
  } catch (error) {
    console.error('Import error:', error)
    showFeedback('インポートに失敗しました', 'error')
  } finally {
    isImporting.value = false
    showGlobalLoading.value = false
  }
}

// クリーンアップ確認
function confirmCleanupLogs() {
  if (!confirm(`${cleanupDays.value}日より古いUFWログを削除しますか？この操作は取り消せません。`)) return
  cleanupLogs()
}

// クリーンアップ実行
async function cleanupLogs() {
  isDeleting.value = true
  try {
    const response = await fetch(`/log/ufw/cleanup?days=${cleanupDays.value}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) throw new Error('Cleanup failed')
    
    const result = await response.json()
    showFeedback(result.message, 'success')
    fetchLogs()
  } catch (error) {
    console.error('Cleanup error:', error)
    showFeedback('クリーンアップに失敗しました', 'error')
  } finally {
    isDeleting.value = false
  }
}

// 全削除確認
function confirmDeleteAllLogs() {
  if (!confirm('全てのUFWログを削除しますか？この操作は取り消せません。')) return
  deleteAllLogs()
}

// 全削除実行
async function deleteAllLogs() {
  isDeleting.value = true
  try {
    const response = await fetch('/api/logs/ufw/all', {
      method: 'DELETE'
    })
    
    if (!response.ok) throw new Error('Delete failed')
    
    const result = await response.json()
    showFeedback(result.message, 'success')
    fetchLogs()
  } catch (error) {
    console.error('Delete error:', error)
    showFeedback('削除に失敗しました', 'error')
  } finally {
    isDeleting.value = false
  }
}

// フィードバック表示
function showFeedback(message, type = 'success') {
  feedback.message = message
  feedback.type = type
  setTimeout(() => {
    feedback.message = ''
  }, 5000)
}

// 日付フォーマット
function formatDate(dateString) {
  return new Date(dateString).toLocaleString('ja-JP')
}

// アクションクラス
function getActionClass(action) {
  const classes = {
    'UFW DROP': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    'UFW ACCEPT': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    'UFW REJECT': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
    'UFW LIMIT': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
    'UFW BLOCK': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    'UFW LOG': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
  }
  return classes[action] || 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-200'
}

// ログタイプクラス
function getLogTypeClass(logType) {
  const classes = {
    'UFW_DROP': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    'UFW_ACCEPT': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    'UFW_REJECT': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
    'UFW_LIMIT': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
    'UFW_LOG': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    'UFW_BLOCK': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    'OTHER': 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-200'
  }
  return classes[logType] || 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-200'
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
</script>
