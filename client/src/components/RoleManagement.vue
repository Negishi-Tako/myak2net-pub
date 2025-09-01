<template>
  <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 sm:p-6">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <h2 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100">ロール管理</h2>
      <form class="flex gap-2" @submit.prevent="create">
        <input class="h-10 px-3 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700" v-model="newRole" placeholder="新しいロール名" required />
        <button type="submit" class="h-10 px-4 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50" :disabled="creating">
          {{ creating ? '追加中...' : '追加' }}
        </button>
      </form>
    </div>

    <div v-if="loading" class="text-center py-6 text-neutral-500">読み込み中...</div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm text-left text-neutral-500 dark:text-neutral-400">
        <thead class="text-xs text-neutral-700 uppercase bg-neutral-50 dark:bg-neutral-700 dark:text-neutral-300">
          <tr>
            <th scope="col" class="px-6 py-3">ロール名</th>
            <th scope="col" class="px-6 py-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="roles.length === 0" class="bg-white dark:bg-neutral-800">
            <td colspan="2" class="px-6 py-4 text-center">ロールがありません。</td>
          </tr>
          <tr v-for="r in roles" :key="r.id" class="bg-white dark:bg-neutral-800 border-b dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-600/30">
            <td class="px-6 py-4 font-medium text-neutral-900 dark:text-white">{{ r.name }}</td>
            <td class="px-6 py-4 text-right">
              <button class="font-medium text-red-600 dark:text-red-500 hover:underline disabled:opacity-50" @click="remove(r.id)" :disabled="deletingId===r.id">
                削除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 認証チェック機能
const checkAuthAndAdminStatus = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me`, { 
      credentials: 'include' 
    })
    
    if (!response.ok) {
      console.log('認証失敗: ログインページにリダイレクトします')
      router.push({ name: 'login' })
      return false
    }
    
    const data = await response.json()
    const user = data.user
    
    // 管理者権限チェック
    if (user.accountType !== 'admin' && user.accountType !== 'superadmin') {
      console.log('管理者権限なし: ダッシュボードにリダイレクトします')
      router.push({ name: 'dashboard' })
      return false
    }
    
    return true
  } catch (error) {
    console.error('認証チェックエラー:', error)
    router.push({ name: 'login' })
    return false
  }
}

const roles = ref([]);
const loading = ref(false);
const creating = ref(false);
const deletingId = ref('');
const newRole = ref('');

const fetchRoles = async () => {
  loading.value = true;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/roles`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      roles.value = data.roles || [];
    }
  } finally {
    loading.value = false;
  }
};

const create = async () => {
  if (!newRole.value.trim()) return;
  creating.value = true;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/roles`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRole.value.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      newRole.value = '';
      await fetchRoles();
    } else {
      alert(data.message || 'Failed to add role');
    }
  } finally {
    creating.value = false;
  }
};

const remove = async (id) => {
  if (!confirm('このロールを削除しますか？')) return;
  deletingId.value = id;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/roles/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await res.json();
    if (res.ok) {
      await fetchRoles();
    } else {
      alert(data.message || 'Failed to delete');
    }
  } finally {
    deletingId.value = '';
  }
};

onMounted(async () => {
  const authSuccess = await checkAuthAndAdminStatus()
  if (authSuccess) {
    await fetchRoles()
  }
})
</script>