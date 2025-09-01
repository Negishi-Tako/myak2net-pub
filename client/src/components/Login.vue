<template>
  <div class="login-page-container">
    <!-- グローバルローディング -->
    <LoadingSpinner 
      v-if="showGlobalLoading"
      :title="loadingTitle"
      :message="loadingMessage"
    />
    <div class="login-background">
      <div class="floating-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
        <div class="shape shape-4"></div>
      </div>
    </div>
    
    <div class="login-card">
      <div class="login-header">
        <div class="logo-container">
          <div class="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
        <h1 class="login-title">Myak2net Portal</h1>
        <p class="login-subtitle">SSH Security Portal</p>
      </div>
      
      <form @submit.prevent="login" class="login-form">
        <div class="form-group">
          <div class="input-wrapper">
            <div class="input-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <input 
              type="email" 
              id="email" 
              class="form-input" 
              v-model="email" 
              required 
              autocomplete="username"
              placeholder="Enter your email"
            />
          </div>
        </div>
        
        <div class="form-group">
          <div class="input-wrapper">
            <div class="input-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                <circle cx="12" cy="16" r="1" stroke="currentColor" stroke-width="2"/>
                <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="currentColor" stroke-width="2"/>
              </svg>
            </div>
            <input 
              type="password" 
              id="password" 
              class="form-input" 
              v-model="password" 
              required 
              autocomplete="current-password"
              placeholder="Enter your password"
            />
          </div>
        </div>
        
        <button type="submit" class="login-button" :disabled="isLoading">
          <span v-if="!isLoading">Sign In</span>
          <div v-else class="button-loader">
            <div class="spinner"></div>
            <span>Signing in...</span>
          </div>
        </button>
        
        <div v-if="error" class="error-message">
          <div class="error-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
              <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
            </svg>
          </div>
          <span>{{ error }}</span>
        </div>
      </form>
      
      <div class="login-footer">
        <p class="footer-text">アカウントの発行は管理者に問い合わせてください</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import LoadingSpinner from './LoadingSpinner.vue';

export default {
  components: {
    LoadingSpinner
  },
  emits: ['login-success', 'loading'],
  setup(props, { emit }) {
    const email = ref('');
    const password = ref('');
    const error = ref('');
    const isLoading = ref(false);
    
    // グローバルローディング状態
    const showGlobalLoading = ref(false);
    const loadingTitle = ref('');
    const loadingMessage = ref('');

    const login = async () => {
      error.value = '';
      isLoading.value = true;
      emit('loading', true);
      
      // グローバルローディングを表示
      showGlobalLoading.value = true;
      loadingTitle.value = 'ログイン中';
      loadingMessage.value = '認証情報を確認しています...';
      
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: email.value,
            password: password.value,
          }),
        });
        
        if (response.ok) {
          emit('login-success');
        } else {
          const errData = await response.json();
          error.value = errData.message || 'Login failed. Please check your credentials.';
        }
      } catch (err) {
        console.error('Login error:', err);
        error.value = 'A network error occurred. Please try again later.';
      } finally {
        isLoading.value = false;
        emit('loading', false);
        showGlobalLoading.value = false;
      }
    };

    return {
      email,
      password,
      error,
      isLoading,
      showGlobalLoading,
      loadingTitle,
      loadingMessage,
      login,
    };
  },
};
</script>

