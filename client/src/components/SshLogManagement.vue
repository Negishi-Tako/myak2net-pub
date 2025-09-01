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
      <h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100">SSH ログ管理</h1>
      
      <!-- 分析ページへのリンク -->
      <router-link 
        to="/ssh-analytics"
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
        サーバーの auth.log ファイルからSSHログをデータベースに取り込みます。
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
          <p class="text-xs text-red-600 dark:text-red-400">データベース内の全てのSSHログを削除します</p>
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
          <span class="font-medium text-neutral-700 dark:text-neutral-300">新規登録:</span>
          <span class="ml-1 text-emerald-600 dark:text-emerald-400">{{ importResult.insertedCount }}</span>
        </div>
        <div>
          <span class="font-medium text-neutral-700 dark:text-neutral-300">スキップ:</span>
          <span class="ml-1 text-amber-600 dark:text-amber-400">{{ importResult.skippedCount }}</span>
        </div>
      </div>
      <div v-if="importResult.errors && importResult.errors.length > 0" class="mt-3">
        <p class="text-sm font-medium text-red-700 dark:text-red-300 mb-1">エラー:</p>
        <ul class="text-xs text-red-600 dark:text-red-400 space-y-1 max-h-20 overflow-y-auto">
          <li v-for="error in importResult.errors" :key="error">{{ error }}</li>
        </ul>
      </div>
    </div>

    <!-- 検索・フィルター -->
    <div class="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">IPアドレス</label>
        <input 
          v-model="filters.ipAddress" 
          @input="applyFilters"
          placeholder="192.168.1.1"
          class="w-full h-9 px-3 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">ユーザー名</label>
        <input 
          v-model="filters.username" 
          @input="applyFilters"
          placeholder="root"
          class="w-full h-9 px-3 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">ログタイプ</label>
                  <select 
            v-model="filters.logType" 
            @change="applyFilters"
            class="w-full h-9 px-3 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべて</option>
            <option value="SSH_LOGIN_BLOCKED">ログイン遮断</option>
            <option value="SSH_DISCONNECT">切断</option>
            <option value="SSH_AUTH_FAIL">認証失敗</option>
            <option value="SSH_CONNECT">SSH接続</option>
            <option value="SSH_AUTH_SUCCESS">認証成功</option>
            <option value="CRON_SESSION">CRONセッション</option>
            <option value="OTHER">その他</option>
          </select>
      </div>
    </div>

    <!-- ログ一覧 -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left text-neutral-500 dark:text-neutral-400">
        <thead class="text-xs text-neutral-700 uppercase bg-neutral-50 dark:bg-neutral-700 dark:text-neutral-300">
          <tr>
            <th scope="col" class="px-4 py-3">タイムスタンプ</th>
            <th scope="col" class="px-4 py-3">IPアドレス</th>
            <th scope="col" class="px-4 py-3">ユーザー名</th>
            <th scope="col" class="px-4 py-3">ポート</th>
            <th scope="col" class="px-4 py-3">タイプ</th>
            <th scope="col" class="px-4 py-3">アクション</th>
            <th scope="col" class="px-4 py-3">サービス</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading" class="bg-white dark:bg-neutral-800">
            <td colspan="7" class="px-4 py-8 text-center">読み込み中...</td>
          </tr>
          <tr v-else-if="logs.length === 0" class="bg-white dark:bg-neutral-800">
            <td colspan="7" class="px-4 py-8 text-center">ログがありません。</td>
          </tr>
          <tr v-for="log in logs" :key="log.id" @click="showLogDetail(log)" class="bg-white dark:bg-neutral-800 border-b dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-600/30">
            <td class="px-4 py-3 font-mono text-xs">
              {{ formatTimestamp(log.timestamp) }}
            </td>
            <td class="px-4 py-3 font-mono">{{ log.ipAddress || '-' }}</td>
            <td class="px-4 py-3">{{ log.username || '-' }}</td>
            <td class="px-4 py-3">{{ log.port || '-' }}</td>
            <td class="px-4 py-3">
              <span :class="['px-2 py-1 text-xs font-semibold rounded-full', getLogTypeBadgeClass(log.logType)]">
                {{ getLogTypeLabel(log.logType) }}
              </span>
            </td>
            <td class="px-4 py-3 max-w-xs truncate" :title="getActionDescription(log.action, log.logType)">
              <span :class="log.action === 'Disconnected from invalid user' ? 'text-red-600 dark:text-red-400 font-medium' : ''">
                {{ getActionDescription(log.action, log.logType) }}
              </span>
            </td>
            <td class="px-4 py-3">{{ log.service }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ページネーション -->
    <div v-if="pagination.totalPages > 1" class="mt-6 flex items-center justify-between">
      <div class="text-sm text-neutral-500 dark:text-neutral-400">
        {{ pagination.total }} 件中 {{ (pagination.page - 1) * pagination.limit + 1 }} - {{ Math.min(pagination.page * pagination.limit, pagination.total) }} 件を表示
      </div>
      <div class="flex items-center gap-2">
        <button 
          @click="changePage(pagination.page - 1)"
          :disabled="pagination.page <= 1"
          class="h-8 px-3 rounded border border-neutral-300 dark:border-neutral-600 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          前へ
        </button>
        <span class="text-sm text-neutral-600 dark:text-neutral-400">
          {{ pagination.page }} / {{ pagination.totalPages }}
        </span>
        <button 
          @click="changePage(pagination.page + 1)"
          :disabled="pagination.page >= pagination.totalPages"
          class="h-8 px-3 rounded border border-neutral-300 dark:border-neutral-600 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          次へ
        </button>
      </div>
    </div>

    <!-- 削除確認ダイアログ -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="showDeleteConfirm = false">
      <div class="bg-white dark:bg-neutral-900 rounded-xl p-6 w-[92%] max-w-md">
        <h3 class="text-lg font-bold mb-4 text-neutral-900 dark:text-neutral-100">{{ deleteConfirmation.title }}</h3>
        <p class="text-sm text-neutral-600 dark:text-neutral-400 mb-4">{{ deleteConfirmation.message }}</p>
        <div class="flex justify-end gap-2">
          <button @click="showDeleteConfirm = false" class="h-9 px-4 rounded border text-sm">キャンセル</button>
          <button @click="executeDeleteConfirm" class="h-9 px-4 rounded bg-red-600 text-white text-sm hover:bg-red-700">
            削除実行
          </button>
        </div>
      </div>
    </div>

    <!-- ログ詳細モーダル -->
    <div v-if="selectedLog" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="selectedLog = null">
      <div class="bg-white dark:bg-neutral-900 rounded-xl p-6 w-[92%] max-w-2xl max-h-[80vh] overflow-y-auto">
        <h3 class="text-lg font-bold mb-4 text-neutral-900 dark:text-neutral-100">ログ詳細</h3>
        <div class="space-y-3 text-sm">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="font-medium text-neutral-700 dark:text-neutral-300">タイムスタンプ:</span>
              <span class="ml-2 font-mono">{{ formatTimestamp(selectedLog.timestamp) }}</span>
            </div>
            <div>
              <span class="font-medium text-neutral-700 dark:text-neutral-300">ホスト名:</span>
              <span class="ml-2">{{ selectedLog.hostname }}</span>
            </div>
            <div>
              <span class="font-medium text-neutral-700 dark:text-neutral-300">サービス:</span>
              <span class="ml-2">{{ selectedLog.service }}</span>
            </div>
            <div>
              <span class="font-medium text-neutral-700 dark:text-neutral-300">PID:</span>
              <span class="ml-2">{{ selectedLog.pid || '-' }}</span>
            </div>
            <div>
              <span class="font-medium text-neutral-700 dark:text-neutral-300">IPアドレス:</span>
              <div class="flex items-center gap-2">
                <span class="font-mono">{{ selectedLog.ipAddress || '-' }}</span>
                <button 
                  v-if="selectedLog.ipAddress && selectedLog.ipAddress !== '-'"
                  @click="queryAbuseIPDB(selectedLog.ipAddress)"
                  :disabled="isQueryingAbuseIPDB"
                  class="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {{ isQueryingAbuseIPDB ? '問い合わせ中...' : 'AbuseIPDB' }}
                </button>
              </div>
            </div>
            <div>
              <span class="font-medium text-neutral-700 dark:text-neutral-300">ポート:</span>
              <span class="ml-2">{{ selectedLog.port || '-' }}</span>
            </div>
            <div>
              <span class="font-medium text-neutral-700 dark:text-neutral-300">ユーザー名:</span>
              <span class="ml-2">{{ selectedLog.username || '-' }}</span>
            </div>
            <div>
              <span class="font-medium text-neutral-700 dark:text-neutral-300">ログタイプ:</span>
              <span :class="['ml-2 px-2 py-1 text-xs font-semibold rounded-full', getLogTypeBadgeClass(selectedLog.logType)]">
                {{ getLogTypeLabel(selectedLog.logType) }}
              </span>
            </div>
          </div>
          <div>
            <span class="font-medium text-neutral-700 dark:text-neutral-300">アクション:</span>
            <span :class="['ml-2', selectedLog.action === 'Disconnected from invalid user' ? 'text-red-600 dark:text-red-400 font-medium' : '']">
              {{ getActionDescription(selectedLog.action, selectedLog.logType) }}
            </span>
          </div>
          <div>
            <span class="font-medium text-neutral-700 dark:text-neutral-300">元のメッセージ:</span>
            <div class="mt-1 p-2 bg-neutral-100 dark:bg-neutral-800 rounded font-mono text-xs break-all">
              {{ selectedLog.message }}
            </div>
          </div>
          
          <!-- AbuseIPDB結果表示 -->
          <div v-if="abuseIPDBResult" class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <h4 class="font-medium text-blue-900 dark:text-blue-100 mb-2">AbuseIPDB 結果</h4>
            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2">
                <span class="font-medium text-neutral-700 dark:text-neutral-300">IPアドレス:</span>
                <span class="font-mono">{{ abuseIPDBResult.ipAddress }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-medium text-neutral-700 dark:text-neutral-300">悪意度:</span>
                <span :class="[
                  'px-2 py-1 text-xs font-semibold rounded-full',
                  abuseIPDBResult.data.abuseConfidenceScore >= 80 ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' :
                  abuseIPDBResult.data.abuseConfidenceScore >= 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200' :
                  'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                ]">
                  {{ abuseIPDBResult.data.abuseConfidenceScore }}%
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-medium text-neutral-700 dark:text-neutral-300">国:</span>
                <span>{{ abuseIPDBResult.data.countryCode || '不明' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-medium text-neutral-700 dark:text-neutral-300">使用法:</span>
                <span>{{ abuseIPDBResult.data.usageType || '不明' }}</span>
              </div>
              <div v-if="abuseIPDBResult.data.domain" class="flex items-center gap-2">
                <span class="font-medium text-neutral-700 dark:text-neutral-300">ドメイン:</span>
                <span class="font-mono">{{ abuseIPDBResult.data.domain }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-end mt-6">
          <button @click="selectedLog = null" class="h-9 px-4 rounded bg-neutral-600 text-white text-sm hover:bg-neutral-700">
            閉じる
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import LoadingSpinner from './LoadingSpinner.vue'

const router = useRouter()
const currentUser = inject('user')

// リアクティブデータ
const logs = ref([])
const isLoading = ref(false)
const isImporting = ref(false)
const isDeleting = ref(false)
const selectedLog = ref(null)
const importResult = ref(null)
const cleanupDays = ref(30)
const showDeleteConfirm = ref(false)
const deleteConfirmation = ref({ title: '', message: '', action: null })
const filters = ref({
  ipAddress: '',
  username: '',
  logType: ''
})
const pagination = ref({
  page: 1,
  limit: 50,
  total: 0,
  totalPages: 0
})
const feedback = ref({
  message: '',
  type: ''
})

// グローバルローディング状態
const showGlobalLoading = ref(false)
const loadingTitle = ref('')
const loadingMessage = ref('')
const loadingProgress = ref(null)

// AbuseIPDB関連
const isQueryingAbuseIPDB = ref(false)
const abuseIPDBResult = ref(null)

// 計算プロパティ
const isAdmin = computed(() => 
  currentUser.value?.accountType === 'admin' || 
  currentUser.value?.accountType === 'superadmin'
)

// メソッド
const fetchLogs = async (page = 1) => {
  isLoading.value = true
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: pagination.value.limit.toString()
    })

    // フィルターを追加
    if (filters.value.ipAddress) params.append('ipAddress', filters.value.ipAddress)
    if (filters.value.username) params.append('username', filters.value.username)
    if (filters.value.logType) params.append('logType', filters.value.logType)

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/log?${params}`, {
      credentials: 'include'
    })

    if (response.ok) {
      const data = await response.json()
      logs.value = data.logs || []
      pagination.value = data.pagination || pagination.value
    } else {
      showFeedback('ログの取得に失敗しました', 'error')
    }
  } catch (error) {
    console.error('Error fetching logs:', error)
    showFeedback('ネットワークエラーが発生しました', 'error')
  } finally {
    isLoading.value = false
  }
}

const importLogs = async () => {
  isImporting.value = true
  importResult.value = null
  
  // グローバルローディングを表示
  showGlobalLoading.value = true
  loadingTitle.value = 'ログインポート中'
  loadingMessage.value = 'auth.logファイルを読み込んでいます...'
  loadingProgress.value = null
  
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/log/import`, {
      method: 'POST',
      credentials: 'include'
    })

    const data = await response.json()

    if (response.ok) {
      importResult.value = data
      
      // 進行度情報があれば表示
      if (data.progress) {
        loadingProgress.value = data.progress
        loadingMessage.value = 'データベースに保存中...'
      }
      
      showFeedback(`ログのインポートが完了しました。${data.insertedCount}件の新しいログが追加されました。`, 'success')
      await fetchLogs() // ログ一覧を再読み込み
    } else {
      showFeedback(data.error || 'ログのインポートに失敗しました', 'error')
    }
  } catch (error) {
    console.error('Error importing logs:', error)
    showFeedback('ネットワークエラーが発生しました', 'error')
  } finally {
    isImporting.value = false
    showGlobalLoading.value = false
    loadingProgress.value = null
  }
}

const changePage = (page) => {
  if (page >= 1 && page <= pagination.value.totalPages) {
    pagination.value.page = page
    fetchLogs(page)
  }
}

const applyFilters = () => {
  pagination.value.page = 1
  fetchLogs(1)
}

const showFeedback = (message, type) => {
  feedback.value = { message, type }
  setTimeout(() => {
    feedback.value = { message: '', type: '' }
  }, 5000)
}

const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const getLogTypeLabel = (logType) => {
  const labels = {
    SSH_LOGIN_BLOCKED: 'ログイン遮断',
    SSH_DISCONNECT: '切断',
    SSH_AUTH_FAIL: '認証失敗',
    SSH_CONNECT: 'SSH接続',
    SSH_AUTH_SUCCESS: '認証成功',
    CRON_SESSION: 'CRON',
    OTHER: 'その他'
  }
  return labels[logType] || logType
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

const getLogTypeBadgeClass = (logType) => {
  const classes = {
    SSH_LOGIN_BLOCKED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
    SSH_DISCONNECT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    SSH_AUTH_FAIL: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    SSH_CONNECT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    SSH_AUTH_SUCCESS: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    CRON_SESSION: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    OTHER: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-200'
  }
  return classes[logType] || classes.OTHER
}

const confirmDeleteAllLogs = () => {
  deleteConfirmation.value = {
    title: '全ログ削除の確認',
    message: 'データベース内の全てのSSHログを削除します。この操作は取り消せません。本当に実行しますか？',
    action: deleteAllLogs
  }
  showDeleteConfirm.value = true
}

const confirmCleanupLogs = () => {
  deleteConfirmation.value = {
    title: '古いログ削除の確認',
    message: `${cleanupDays.value}日より古いログを削除します。この操作は取り消せません。本当に実行しますか？`,
    action: cleanupOldLogs
  }
  showDeleteConfirm.value = true
}

const deleteAllLogs = async () => {
  isDeleting.value = true
  
  // グローバルローディングを表示
  showGlobalLoading.value = true
  loadingTitle.value = 'ログ削除中'
  loadingMessage.value = '全てのログを削除しています...'
  loadingProgress.value = null
  
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/log`, {
      method: 'DELETE',
      credentials: 'include'
    })

    if (response.ok) {
      const data = await response.json()
      showFeedback(data.message, 'success')
      await fetchLogs() // ログ一覧を再読み込み
    } else {
      const errorData = await response.json().catch(() => ({ error: '不明なエラー' }))
      showFeedback(`全ログ削除に失敗しました: ${errorData.error}`, 'error')
    }
  } catch (error) {
    console.error('Error deleting all logs:', error)
    showFeedback('ネットワークエラーが発生しました', 'error')
  } finally {
    isDeleting.value = false
    showGlobalLoading.value = false
    loadingProgress.value = null
  }
}

const cleanupOldLogs = async () => {
  isDeleting.value = true
  
  // グローバルローディングを表示
  showGlobalLoading.value = true
  loadingTitle.value = 'ログクリーンアップ中'
  loadingMessage.value = `${cleanupDays.value}日より古いログを削除しています...`
  loadingProgress.value = null
  
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/log/cleanup?days=${cleanupDays.value}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    if (response.ok) {
      const data = await response.json()
      showFeedback(data.message, 'success')
      await fetchLogs() // ログ一覧を再読み込み
    } else {
      const errorData = await response.json().catch(() => ({ error: '不明なエラー' }))
      showFeedback(`ログクリーンアップに失敗しました: ${errorData.error}`, 'error')
    }
  } catch (error) {
    console.error('Error cleaning up logs:', error)
    showFeedback('ネットワークエラーが発生しました', 'error')
  } finally {
    isDeleting.value = false
    showGlobalLoading.value = false
    loadingProgress.value = null
  }
}

const executeDeleteConfirm = () => {
  showDeleteConfirm.value = false
  if (deleteConfirmation.value.action) {
    deleteConfirmation.value.action()
  }
}

const showLogDetail = (log) => {
  selectedLog.value = log
  abuseIPDBResult.value = null // 新しいログを選択したら結果をクリア
}

// AbuseIPDB問い合わせ
const queryAbuseIPDB = async (ipAddress) => {
  isQueryingAbuseIPDB.value = true
  abuseIPDBResult.value = null
  
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/log/abuseipdb/${ipAddress}`, {
      credentials: 'include'
    })

    if (response.ok) {
      const data = await response.json()
      abuseIPDBResult.value = data
    } else {
      const errorData = await response.json().catch(() => ({ error: '不明なエラー' }))
      showFeedback(`AbuseIPDB問い合わせに失敗しました: ${errorData.error}`, 'error')
    }
  } catch (error) {
    console.error('Error querying AbuseIPDB:', error)
    showFeedback('ネットワークエラーが発生しました', 'error')
  } finally {
    isQueryingAbuseIPDB.value = false
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

// 初期化
onMounted(async () => {
  try {
    console.log('SshLogManagement: コンポーネント初期化開始')
    const isAuthenticated = await checkAuthStatus()
    console.log('SshLogManagement: 認証状態:', isAuthenticated)
    if (isAuthenticated) {
      console.log('SshLogManagement: ログ取得開始')
      await fetchLogs()
      console.log('SshLogManagement: ログ取得完了')
    }
  } catch (error) {
    console.error('SshLogManagement: 初期化エラー:', error)
    showFeedback('コンポーネントの初期化に失敗しました', 'error')
  }
})
</script>

<style scoped>
/* テーブル行をクリック可能にするスタイル */
tbody tr {
  cursor: pointer;
}
</style>
