<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-sm w-full mx-4">
      <div class="flex items-center justify-center mb-4">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
      <div class="text-center">
        <h3 class="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
          {{ title || '処理中...' }}
        </h3>
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          {{ message || 'しばらくお待ちください' }}
        </p>
        
        <!-- プログレスバー（進行度がある場合） -->
        <div v-if="progress" class="mt-4">
          <div class="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1">
            <span>{{ progress.current }}/{{ progress.total }}</span>
            <span>{{ progress.percentage }}%</span>
          </div>
          <div class="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
            <div 
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${progress.percentage}%` }"
            ></div>
          </div>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {{ getStageText(progress.stage) }}
          </p>
          <!-- DEBUG: Show raw progress object -->
          <pre class="text-xs text-red-600 mt-2 bg-neutral-100 dark:bg-neutral-900 p-2 rounded" v-if="progress">
            {{ JSON.stringify(progress, null, 2) }}
          </pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: String,
  message: String,
  progress: Object
});

const title = computed(() => props.title);
const message = computed(() => props.message);
const progress = computed(() => props.progress);

const getStageText = (stage) => {
  switch (stage) {
    case 'parsing':
      return 'ログファイルを解析中...';
    case 'inserting':
      return 'データベースに保存中...';
    case 'completed':
      return '完了';
    default:
      return '処理中...';
  }
};
</script>
