<template>
  <header class="sticky top-0 z-40 w-full bg-white/80 dark:bg-neutral-900/80 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
    <div class="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
      <h1 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Myaksqrnet</h1>
      <div class="flex items-center gap-3">
        <!-- Theme Switch -->
        <button @click="toggleTheme" class="h-9 px-3 rounded border text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800">
          {{ currentTheme === 'dark' ? 'ライトに切替' : 'ダークに切替' }}
        </button>

        <!-- User Dropdown -->
        <div v-if="currentUser" class="relative" @keydown.escape="isDropdownOpen=false">
          <button @click="toggleDropdown" class="h-9 px-3 rounded border text-sm flex items-center gap-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800">
            {{ currentUser.email }}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{'rotate-180': isDropdownOpen}" class="transition-transform"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <div v-if="isDropdownOpen" class="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-lg">
            <div class="px-3 py-2 text-sm flex items-center justify-between">
              <span class="text-neutral-500">権限</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize">{{ currentUser.accountType }}</span>
            </div>
            <div class="border-t border-neutral-200 dark:border-neutral-800"></div>
            <button @click="emit('logout')" class="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800">ログアウト</button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue';

const props = defineProps({
  currentUser: Object,
  currentTheme: String,
});

const emit = defineEmits(['logout', 'toggle-theme']);

const isDropdownOpen = ref(false);

const toggleDropdown = () => { isDropdownOpen.value = !isDropdownOpen.value; };

const toggleTheme = () => { emit('toggle-theme'); };
</script>



