<template>
  <div id="app" class="app-container">
    <!-- 顶部导航栏 -->
    <header class="app-header">
      <div class="header-content">
        <div class="logo">
          <h1>🎲 税务风险沙盘游戏</h1>
          <p class="version">v1.0</p>
        </div>
        <nav class="nav-menu">
          <router-link to="/" class="nav-link">首页</router-link>
          <router-link to="/multiplayer" class="nav-link">多人游戏</router-link>
          <router-link to="/diagnostic" class="nav-link diagnostic-link">🔧 诊断</router-link>
          <a href="javascript:void(0)" @click="toggleDarkMode" class="nav-link theme-toggle">
            {{ isDarkMode ? '☀️ 亮色' : '🌙 暗色' }}
          </a>
        </nav>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="app-main">
      <router-view />
    </main>

    <!-- 页脚 -->
    <footer class="app-footer">
      <p>&copy; 2025 税务风险沙盘游戏 v1.0 | 
        <a href="#" target="_blank">文档</a> | 
        <a href="#" target="_blank">反馈</a>
      </p>
    </footer>

    <!-- 全局提示 -->
    <div v-if="globalMessage" class="global-message" :class="globalMessageType">
      {{ globalMessage }}
      <button @click="clearMessage" class="close-btn">&times;</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isDarkMode = ref(false);
const globalMessage = ref('');
const globalMessageType = ref('info');

onMounted(() => {
  // 检查系统暗色模式偏好
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  isDarkMode.value = prefersDark;
  applyTheme();
});

function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value;
  applyTheme();
}

function applyTheme() {
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }
}

function clearMessage() {
  globalMessage.value = '';
}

// 暴露全局消息方法
(window as any).showMessage = (msg: string, type: string = 'info') => {
  globalMessage.value = msg;
  globalMessageType.value = type;
  setTimeout(() => {
    globalMessage.value = '';
  }, 4000);
};
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #333;
}

.app-header {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 1rem 0;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
}

.logo h1 {
  margin: 0;
  font-size: 1.8rem;
  color: #667eea;
  font-weight: bold;
}

.logo .version {
  margin: 0;
  font-size: 0.8rem;
  color: #999;
}

.nav-menu {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.nav-link {
  text-decoration: none;
  color: #667eea;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.nav-link:hover {
  background: #667eea;
  color: white;
}

.nav-link.router-link-active {
  background: #667eea;
  color: white;
}

.theme-toggle {
  cursor: pointer;
}

.diagnostic-link {
  background: #ff9800;
  color: white;
}

.diagnostic-link:hover {
  background: #f57c00;
  color: white;
}

.app-main {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 2rem;
}

.app-footer {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  text-align: center;
  padding: 2rem;
  margin-top: auto;
}

.app-footer a {
  color: #667eea;
  text-decoration: none;
}

.app-footer a:hover {
  text-decoration: underline;
}

.global-message {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 1rem;
  animation: slideIn 0.3s ease-out;
}

.global-message.success {
  border-left: 4px solid #4caf50;
  background: #f0f7f0;
  color: #2e7d32;
}

.global-message.error {
  border-left: 4px solid #f44336;
  background: #fdf0f0;
  color: #c62828;
}

.global-message.warning {
  border-left: 4px solid #ff9800;
  background: #fff8f0;
  color: #e65100;
}

.global-message.info {
  border-left: 4px solid #2196f3;
  background: #f0f7ff;
  color: #1565c0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: inherit;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 暗色模式 */
:global(.dark-mode) {
  background: #1a1a1a;
  color: #e0e0e0;
}

:global(.dark-mode) .app-header {
  background: rgba(30, 30, 30, 0.95);
}

:global(.dark-mode) .app-footer {
  background: rgba(0, 0, 0, 0.95);
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }

  .nav-menu {
    flex-wrap: wrap;
    justify-content: center;
  }

  .app-main {
    padding: 1rem;
  }

  .global-message {
    bottom: 1rem;
    right: 1rem;
    left: 1rem;
  }
}
</style>
