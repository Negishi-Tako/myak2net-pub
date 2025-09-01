<template>
  <div class="app-layout" :class="{ 'sidebar-closed': !isSidebarOpen }">
    <Header 
      :currentUser="user" 
      :currentTheme="theme" 
      @logout="handleLogout" 
      @toggle-theme="toggleTheme" 
    />
    <div class="layout-body">
      <Sidebar 
        v-if="user"
        :isSidebarOpen="isSidebarOpen" 
        :currentUser="user" 
        :accountingRoles="accountingRoles" 
        :assignedRoles="assignedRoles" 
      />
      <main class="main-content">
        <router-view />
      </main>
    </div>
    <button 
      v-if="user" 
      @click="toggleSidebar" 
      class="sidebar-toggle-button"
      :class="{ 'sidebar-closed': !isSidebarOpen }"
    >
      {{ isSidebarOpen ? '<' : '>' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Header from './Header.vue'
import Sidebar from './Sidebar.vue'

const router = useRouter()

// Props
const props = defineProps({
  user: Object,
  theme: String,
  accountingRoles: Array,
  assignedRoles: Array
})

// Emits
const emit = defineEmits(['logout', 'toggle-theme', 'update-user'])

// Reactive data
const isSidebarOpen = ref(localStorage.getItem('isSidebarOpen') !== 'false')

// Methods
const toggleTheme = () => {
  emit('toggle-theme')
}

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
  localStorage.setItem('isSidebarOpen', String(isSidebarOpen.value))
}

const handleLogout = async () => {
  try {
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/sessions/current`, {
      method: 'DELETE',
      credentials: 'include',
    })
  } catch (err) {
    console.error('Logout error:', err)
  } finally {
    emit('logout')
    router.push({ name: 'login' })
  }
}

// Watch for theme changes
watch(() => props.theme, (newTheme) => {
  document.body.className = `${newTheme}-mode`
  localStorage.setItem('theme', newTheme)
}, { immediate: true })
</script>


