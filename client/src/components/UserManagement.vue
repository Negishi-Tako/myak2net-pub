<template>
  <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 sm:p-6">
    <h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">ユーザー管理</h1>

    <!-- ユーザー追加フォーム -->
    <form v-if="isAdmin" @submit.prevent="addUser" class="mb-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border dark:border-neutral-700/50">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label for="email" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">メールアドレス</label>
          <input v-model="newUser.email" id="email" type="email" class="w-full h-10 px-3 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">パスワード</label>
          <input v-model="newUser.password" id="password" type="password" class="w-full h-10 px-3 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 focus:ring-2 focus:ring-blue-500" required minlength="6" />
        </div>
        <div>
          <label for="accountType" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">アカウント権限</label>
          <select v-model="newUser.accountType" id="accountType" class="w-full h-10 px-3 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 focus:ring-2 focus:ring-blue-500">
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option v-if="isSuperAdmin" value="superadmin">Super Admin</option>
          </select>
        </div>
      </div>
      <div class="text-right mt-4">
        <button type="submit" class="h-9 px-4 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50" :disabled="isAdding">
          {{ isAdding ? '追加中...' : 'ユーザー追加' }}
        </button>
      </div>
    </form>

    <!-- フィードバック -->
    <div v-if="feedback.message" :class="['p-3 mb-4 rounded-lg text-sm font-medium', feedback.type === 'success' ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200']">
      {{ feedback.message }}
    </div>

    <!-- ユーザー一覧 -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left text-neutral-500 dark:text-neutral-400">
        <thead class="text-xs text-neutral-700 uppercase bg-neutral-50 dark:bg-neutral-700 dark:text-neutral-300">
          <tr>
            <th scope="col" class="px-6 py-3">メールアドレス</th>
            <th scope="col" class="px-6 py-3">アカウント権限</th>
            <th scope="col" class="px-6 py-3">作成日時</th>
            <th v-if="isAdmin" scope="col" class="px-6 py-3">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="users.length === 0" class="bg-white dark:bg-neutral-800">
            <td :colspan="isAdmin ? 4 : 3" class="px-6 py-4 text-center">ユーザーがいません。</td>
          </tr>
          <tr v-for="user in users" :key="user.id" class="bg-white dark:bg-neutral-800 border-b dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-600/30">
            <td class="px-6 py-4 font-medium text-neutral-900 dark:text-white">{{ user.email }}</td>
            <td class="px-6 py-4">
              <span :class="['px-2 py-1 text-xs font-semibold rounded-full', badgeClass(user.accountType)]">
                {{ user.accountType }}
              </span>
            </td>
            <td class="px-6 py-4">{{ new Date(user.createdAt).toLocaleString('ja-JP') }}</td>
            <td v-if="isAdmin" class="px-6 py-4">
              <div class="flex items-center gap-3">
                <span v-if="user.id === currentUser.value?.id" class="text-xs text-neutral-500 italic">
                  （自分）
                </span>
                <template v-else-if="canPerformActions(user)">
                  <button @click="openRoleModal(user)" class="font-medium text-blue-600 dark:text-blue-500 hover:underline">権限変更</button>
                  <button @click="openUserRolesModal(user)" class="font-medium text-blue-600 dark:text-blue-500 hover:underline">ロール管理</button>
                  <button @click="deleteUser(user.id)" class="font-medium text-red-600 dark:text-red-500 hover:underline">削除</button>
                  <button @click="openPasswordModal(user)" class="font-medium text-amber-600 dark:text-amber-400 hover:underline">パスワード変更</button>
                  <button @click="openAbuseIPDBModal(user)" class="font-medium text-purple-600 dark:text-purple-400 hover:underline">AbuseIPDB設定</button>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- アカウント権限編集モーダル -->
    <div v-if="isModalVisible" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="closeModal">
      <div class="bg-white dark:bg-neutral-900 rounded-xl p-6 w-[92%] max-w-md">
        <h3 class="text-lg font-bold mb-4 text-neutral-900 dark:text-neutral-100">権限の編集: {{ editingUser.email }}</h3>
        <form @submit.prevent="submitRoleChange">
          <div class="mb-4">
            <label for="roleSelect" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">新しい権限</label>
            <select v-model="newRole" id="roleSelect" class="w-full h-10 px-3 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700">
              <option v-for="role in availableRoles" :key="role" :value="role">
                {{ role.charAt(0).toUpperCase() + role.slice(1) }}
              </option>
            </select>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="closeModal" class="h-9 px-3 rounded border text-sm">キャンセル</button>
            <button type="submit" class="h-9 px-3 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">保存</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 業務ロール管理モーダル -->
    <div v-if="isUserRolesModalVisible" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="closeUserRolesModal">
      <div class="bg-white dark:bg-neutral-900 rounded-xl p-6 w-[92%] max-w-4xl max-h-[90vh] flex flex-col">
        <h3 class="text-lg font-bold mb-4 text-neutral-900 dark:text-neutral-100 flex-shrink-0">ロール管理: {{ rolesEditingUser?.email }}</h3>
        
        <div class="flex-grow overflow-y-auto pr-2 -mr-2 space-y-4">
          <!-- 既存ロール -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">付与済みロール</label>
            <div v-if="userRoles.length === 0" class="text-sm text-neutral-500">付与されているロールはありません。</div>
            <div class="space-y-3">
              <div v-for="ur in userRoles" :key="ur.roleId" class="p-3 border rounded-lg bg-neutral-50 dark:bg-neutral-800/50 dark:border-neutral-700">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <div class="font-semibold text-neutral-800 dark:text-neutral-200">{{ ur.role?.name || '-' }}</div>
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2 mt-2">
                      <input type="number" placeholder="学年" class="w-full h-8 px-2 text-sm rounded border bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600" v-model.number="ur.grade" />
                      <input type="number" placeholder="クラス" class="w-full h-8 px-2 text-sm rounded border bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600" v-model.number="ur.class" />
                      <input type="number" placeholder="出席番号" class="w-full h-8 px-2 text-sm rounded border bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600" v-model.number="ur.classnum" />
                      <input type="number" placeholder="チーム" class="w-full h-8 px-2 text-sm rounded border bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600" v-model.number="ur.team" />
                      <input type="number" placeholder="チーム番号" class="w-full h-8 px-2 text-sm rounded border bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600" v-model.number="ur.teamnum" />
                    </div>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0 mt-1">
                    <button class="text-xs font-medium text-blue-600 hover:underline" @click="saveUserRoleMeta(rolesEditingUser.id, ur)">保存</button>
                    <button class="text-xs font-medium text-red-600 hover:underline" @click="removeUserRole(rolesEditingUser.id, ur.roleId)">削除</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr class="my-4 border-neutral-200 dark:border-neutral-700" />

          <!-- 新規ロール付与 -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">ロール追加</label>
            <div class="flex flex-wrap items-end gap-2">
              <select class="h-9 px-3 text-sm rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 flex-grow min-w-[150px]" v-model="newUserRole.roleId">
                <option disabled value="">ロールを選択</option>
                <option v-for="r in unassignedRoles" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
              <input type="number" placeholder="学年" class="w-20 h-9 px-2 text-sm rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700" v-model.number="newUserRole.grade" />
              <input type="number" placeholder="クラス" class="w-20 h-9 px-2 text-sm rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700" v-model.number="newUserRole.class" />
              <input type="number" placeholder="出席番号" class="w-20 h-9 px-2 text-sm rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700" v-model.number="newUserRole.classnum" />
              <input type="number" placeholder="チーム" class="w-20 h-9 px-2 text-sm rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700" v-model.number="newUserRole.team" />
              <input type="number" placeholder="チーム番号" class="w-20 h-9 px-2 text-sm rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700" v-model.number="newUserRole.teamnum" />
              <button class="h-9 px-3 rounded bg-blue-600 text-white text-sm hover:bg-blue-700" :disabled="!newUserRole.roleId" @click="addUserRole(rolesEditingUser.id)">追加</button>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4 flex-shrink-0">
          <button type="button" @click="closeUserRolesModal" class="h-9 px-3 rounded border text-sm">閉じる</button>
        </div>
      </div>
    </div>

    <!-- アカウントパスワード変更モーダル -->
    <div v-if="isPasswordModalVisible" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="closePasswordModal">
      <div class="bg-white dark:bg-neutral-900 rounded-xl p-6 w-[92%] max-w-md">
        <h3 class="text-lg font-bold mb-4 text-neutral-900 dark:text-neutral-100">パスワード変更: {{ passwordEditingUser.email }}</h3>
        <form @submit.prevent="submitPasswordChange">
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">現在のパスワード</label>
            <input v-model="passwordForm.currentPassword" type="password" class="w-full h-10 px-3 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700" required />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">新しいパスワード</label>
            <input v-model="passwordForm.newPassword" type="password" class="w-full h-10 px-3 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700" required minlength="6" />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="closePasswordModal" class="h-9 px-3 rounded border text-sm">キャンセル</button>
            <button type="submit" class="h-9 px-3 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">保存</button>
          </div>
        </form>
      </div>
    </div>

    <!-- AbuseIPDB設定モーダル -->
    <div v-if="isAbuseIPDBModalVisible" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="closeAbuseIPDBModal">
      <div class="bg-white dark:bg-neutral-900 rounded-xl p-6 w-[92%] max-w-md">
        <h3 class="text-lg font-bold mb-4 text-neutral-900 dark:text-neutral-100">AbuseIPDB設定: {{ abuseIPDBEditingUser.email }}</h3>
        <form @submit.prevent="submitAbuseIPDBSettings">
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">AbuseIPDB APIキー</label>
            <input v-model="abuseIPDBForm.abuseipdbApiKey" type="password" class="w-full h-10 px-3 rounded border bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700" placeholder="APIキーを入力してください" />
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              AbuseIPDBのAPIキーを設定すると、SSHログの詳細でIPアドレスの悪意度を確認できます。
            </p>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="closeAbuseIPDBModal" class="h-9 px-3 rounded border text-sm">キャンセル</button>
            <button type="submit" class="h-9 px-3 rounded bg-purple-600 text-white text-sm hover:bg-purple-700">保存</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, inject } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// inject を使ってApp.vueからデータを取得
const currentUser = inject('user')

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

const users = ref([]);
const newUser = ref({ email: '', password: '', accountType: 'user' });
const feedback = ref({ message: '', type: '' });
const isAdding = ref(false);

// 既存モーダル（アカウント権限）
const isModalVisible = ref(false);
const editingUser = ref(null);
const newRole = ref('');

// ロール管理モーダル
const isUserRolesModalVisible = ref(false);
const rolesEditingUser = ref(null);
const rolesAll = ref([]);
const userRoles = ref([]); // { roleId, role, grade, class, classnum, team, teamnum }
const newUserRole = ref({ roleId: '', grade: null, class: null, classnum: null, team: null, teamnum: null });

// パスワード変更モーダル
const isPasswordModalVisible = ref(false);
const passwordEditingUser = ref(null);
const passwordForm = ref({ currentPassword: '', newPassword: '' });

// AbuseIPDB設定モーダル
const isAbuseIPDBModalVisible = ref(false);
const abuseIPDBEditingUser = ref(null);
const abuseIPDBForm = ref({ abuseipdbApiKey: '' });

const isAdmin = computed(() => currentUser.value?.accountType === 'admin' || currentUser.value?.accountType === 'superadmin');
const isSuperAdmin = computed(() => currentUser.value?.accountType === 'superadmin');

const availableRoles = computed(() => {
  return isSuperAdmin.value ? ['user', 'admin', 'superadmin'] : ['user', 'admin'];
});

const unassignedRoles = computed(() => {
  const assignedIds = new Set(userRoles.value.map(r => r.roleId));
  return rolesAll.value.filter(r => !assignedIds.has(r.id));
});

const badgeClass = (accountType) => {
  const classes = {
    user: 'bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-200',
    admin: 'bg-amber-100 text-amber-800 dark:bg-amber-900/70 dark:text-amber-200',
    superadmin: 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-200',
  };
  return classes[accountType] || 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200';
};

const canPerformActions = (targetUser) => {
  if (!isAdmin.value) return false;
  if (isSuperAdmin.value) return true;
  return targetUser.accountType !== 'superadmin';
};

const setFeedback = (message, type, duration = 4000) => {
  feedback.value = { message, type };
  if (duration) setTimeout(() => { feedback.value = { message: '', type: '' }; }, duration);
};

const fetchUsers = async () => {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      users.value = data.users;
    } else {
      setFeedback('ユーザー一覧の取得に失敗しました', 'error');
    }
  } catch (e) {
    setFeedback('ユーザー一覧の取得中にネットワークエラーが発生しました', 'error');
  }
};

const addUser = async () => {
  isAdding.value = true;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newUser.value),
    });
    const data = await res.json();
    if (res.ok) {
      await fetchUsers();
      setFeedback(`ユーザー「${data.user.email}」を追加しました`, 'success');
      newUser.value = { email: '', password: '', accountType: 'user' };
    } else {
      setFeedback(data.message || 'ユーザーの追加に失敗しました', 'error');
    }
  } catch (e) {
    setFeedback('ユーザー追加中にネットワークエラーが発生しました', 'error');
  } finally {
    isAdding.value = false;
  }
};

const deleteUser = async (userId) => {
  if (!window.confirm('このユーザーを削除しますか？この操作は元に戻せません。')) return;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/${userId}`, { method: 'DELETE', credentials: 'include' });
    const data = await res.json();
    if (res.ok) {
      setFeedback(data.message, 'success');
      await fetchUsers();
    } else {
      setFeedback(data.message || 'ユーザーの削除に失敗しました', 'error');
    }
  } catch (e) {
    setFeedback('ユーザー削除中にネットワークエラーが発生しました', 'error');
  }
};

// アカウント権限モーダル関連
const openRoleModal = (user) => {
  editingUser.value = user;
  newRole.value = user.accountType;
  isModalVisible.value = true;
};
const closeModal = () => {
  isModalVisible.value = false;
  editingUser.value = null;
};
const submitRoleChange = async () => {
  if (!editingUser.value || !newRole.value) return;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/${editingUser.value.id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ accountType: newRole.value }),
    });
    const data = await res.json();
    if (res.ok) {
      setFeedback(data.message || '権限を更新しました', 'success');
      await fetchUsers();
    } else {
      setFeedback(data.message || '権限の更新に失敗しました', 'error');
    }
  } catch (e) {
    setFeedback('権限更新中にネットワークエラーが発生しました', 'error');
  } finally {
    closeModal();
  }
};

// ロール管理モーダル関連
const openUserRolesModal = async (user) => {
  rolesEditingUser.value = user;
  await Promise.all([fetchAllRoles(), fetchUserRoles(user.id)]);
  isUserRolesModalVisible.value = true;
};
const closeUserRolesModal = () => {
  isUserRolesModalVisible.value = false;
  rolesEditingUser.value = null;
  userRoles.value = [];
  newUserRole.value = { roleId: '', grade: null, class: null, classnum: null, team: null, teamnum: null };
};

const fetchAllRoles = async () => {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/roles`, { credentials: 'include' });
  if (res.ok) {
    const data = await res.json();
    rolesAll.value = data.roles || [];
  }
};
const fetchUserRoles = async (userId) => {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/${userId}/roles`, { credentials: 'include' });
  if (res.ok) {
    const data = await res.json();
    userRoles.value = (data.userRoles || []).map(r => ({
      userId: userId,
      roleId: r.roleId,
      role: r.role,
      grade: r.grade ?? null,
      class: r.class ?? null,
      classnum: r.classnum ?? null,
      team: r.team ?? null,
      teamnum: r.teamnum ?? null,
    }));
  }
};

const saveUserRoleMeta = async (userId, ur) => {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/${userId}/roles/${ur.roleId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grade: ur.grade ?? null,
        class: ur.class ?? null,
        classnum: ur.classnum ?? null,
        team: ur.team ?? null,
        teamnum: ur.teamnum ?? null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setFeedback('ロール情報を保存しました', 'success');
    } else {
      setFeedback(data.message || 'ロール情報の保存に失敗しました', 'error');
    }
  } catch (e) {
    setFeedback('ロール情報の保存中にネットワークエラーが発生しました', 'error');
  }
};

const addUserRole = async (userId) => {
  if (!newUserRole.value.roleId) return;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/${userId}/roles/${newUserRole.value.roleId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grade: newUserRole.value.grade ?? null,
        class: newUserRole.value.class ?? null,
        classnum: newUserRole.value.classnum ?? null,
        team: newUserRole.value.team ?? null,
        teamnum: newUserRole.value.teamnum ?? null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      await fetchUserRoles(userId);
      newUserRole.value = { roleId: '', grade: null, class: null, classnum: null, team: null, teamnum: null };
      setFeedback('ロールを付与しました', 'success');
    } else {
      setFeedback(data.message || 'ロールの付与に失敗しました', 'error');
    }
  } catch (e) {
    setFeedback('ロール付与中にネットワークエラーが発生しました', 'error');
  }
};

const removeUserRole = async (userId, roleId) => {
  if (!confirm('このロールを削除しますか？')) return;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/${userId}/roles/${roleId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await res.json();
    if (res.ok) {
      await fetchUserRoles(userId);
      setFeedback('ロールを削除しました', 'success');
    } else {
      setFeedback(data.message || 'ロールの削除に失敗しました', 'error');
    }
  } catch (e) {
    setFeedback('ロール削除中にネットワークエラーが発生しました', 'error');
  }
};

const openPasswordModal = (user) => {
  passwordEditingUser.value = user;
  passwordForm.value = { currentPassword: '', newPassword: '' };
  isPasswordModalVisible.value = true;
};
const closePasswordModal = () => {
  isPasswordModalVisible.value = false;
  passwordEditingUser.value = null;
};
const submitPasswordChange = async () => {
  if (!passwordEditingUser.value) return;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/${passwordEditingUser.value.id}/passwd`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(passwordForm.value),
    });
    const data = await res.json();
    if (res.ok) {
      setFeedback('パスワードを変更しました', 'success');
    } else {
      setFeedback(data.message || 'パスワードの変更に失敗しました', 'error');
    }
  } catch (e) {
    setFeedback('パスワード変更中にネットワークエラーが発生しました', 'error');
  } finally {
    closePasswordModal();
  }
};

// AbuseIPDB設定関連
const openAbuseIPDBModal = (user) => {
  abuseIPDBEditingUser.value = user;
  abuseIPDBForm.value = { abuseipdbApiKey: user.abuseipdbApiKey || '' };
  isAbuseIPDBModalVisible.value = true;
};

const closeAbuseIPDBModal = () => {
  isAbuseIPDBModalVisible.value = false;
  abuseIPDBEditingUser.value = null;
};

const submitAbuseIPDBSettings = async () => {
  if (!abuseIPDBEditingUser.value) return;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/${abuseIPDBEditingUser.value.id}/abuseipdb-key`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(abuseIPDBForm.value),
    });
    const data = await res.json();
    if (res.ok) {
      setFeedback('AbuseIPDB APIキーを更新しました', 'success');
      await fetchUsers(); // ユーザー一覧を再読み込み
    } else {
      setFeedback(data.message || 'AbuseIPDB APIキーの更新に失敗しました', 'error');
    }
  } catch (e) {
    setFeedback('AbuseIPDB APIキー更新中にネットワークエラーが発生しました', 'error');
  } finally {
    closeAbuseIPDBModal();
  }
};

onMounted(async () => {
  const authSuccess = await checkAuthAndAdminStatus()
  if (authSuccess) {
    await fetchUsers()
  }
})
</script>