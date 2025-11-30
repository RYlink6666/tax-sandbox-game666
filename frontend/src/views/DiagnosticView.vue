<template>
  <div class="diagnostic">
    <div class="container">
      <h1>🔧 系统诊断</h1>
      
      <div class="diagnostic-section">
        <h2>后端服务检查</h2>
        <div class="check-item" :class="backendStatus">
          <span class="status-icon">{{ backendStatus === 'ok' ? '✅' : '❌' }}</span>
          <span class="status-text">
            后端服务: 
            {{ backendStatus === 'checking' ? '检测中...' : (backendStatus === 'ok' ? '正常运行 (http://localhost:3001)' : '无法连接') }}
          </span>
          <button v-if="backendStatus !== 'checking'" @click="checkBackend" class="btn-retry">
            重试
          </button>
        </div>
        
        <div v-if="backendError" class="error-message">
          {{ backendError }}
        </div>

        <div v-if="backendStatus === 'ok'" class="success-details">
          <p><strong>✅ 后端已连接</strong></p>
          <p>格子总数: {{ gridCount }}</p>
          <button @click="goToGame" class="btn-primary">
            进入游戏
          </button>
        </div>
      </div>

      <div class="diagnostic-section">
        <h2>前端环境检查</h2>
        <div class="check-item ok">
          <span class="status-icon">✅</span>
          <span class="status-text">前端服务: 正常运行</span>
        </div>
        <div class="check-item ok">
          <span class="status-icon">✅</span>
          <span class="status-text">浏览器: {{ browserInfo }}</span>
        </div>
      </div>

      <div class="diagnostic-section">
        <h2>故障排除</h2>
        <div class="troubleshoot">
          <h3>如果后端检查失败，请按以下步骤排查：</h3>
          <ol>
            <li>
              <strong>确认后端已启动</strong>
              <p>应该看到命令行输出: "🚀 服务器启动在 http://localhost:3001"</p>
              <p>如果没有启动，执行: <code>START_BACKEND_SIMPLE.bat</code></p>
            </li>
            <li>
              <strong>检查端口是否被占用</strong>
              <p>在PowerShell运行: <code>netstat -ano | findstr 3001</code></p>
              <p>如果有输出，说明端口被占用，需要关闭占用程序或更改后端端口</p>
            </li>
            <li>
              <strong>检查后端日志</strong>
              <p>后端终端应显示: "✅ 格子定义验证通过 (120个格子)"</p>
              <p>如果有错误，请提供错误信息</p>
            </li>
            <li>
              <strong>重新安装依赖</strong>
              <p><code>cd backend && npm install && npm run dev</code></p>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const backendStatus = ref<'checking' | 'ok' | 'error'>('checking');
const backendError = ref('');
const gridCount = ref(0);
const browserInfo = ref('');

async function checkBackend() {
  backendStatus.value = 'checking';
  backendError.value = '';

  try {
    console.log('⏳ 检查后端服务...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    // 检查health端点
    const response = await fetch('http://localhost:3001/health', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      // 获取格子定义
      const gridResponse = await fetch('http://localhost:3001/api/grid/definitions', {
        signal: controller.signal
      });
      
      if (gridResponse.ok) {
        const data = await gridResponse.json();
        gridCount.value = data.total || data.grids?.length || 0;
        backendStatus.value = 'ok';
        console.log('✅ 后端连接成功');
      } else {
        throw new Error('无法获取格子定义');
      }
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err: any) {
    backendStatus.value = 'error';
    
    if (err.name === 'AbortError') {
      backendError.value = '❌ 连接超时：后端服务未响应（3秒内无回复）';
    } else if (err instanceof TypeError) {
      backendError.value = '❌ 网络错误：无法连接到 http://localhost:3001\n请确保后端服务已启动：npm run dev';
    } else {
      backendError.value = `❌ 错误: ${err.message}`;
    }
    
    console.error('❌ 后端检查失败:', err);
  }
}

function goToGame() {
  router.push('/game');
}

function getBrowserInfo() {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return '其他浏览器';
}

onMounted(() => {
  browserInfo.value = getBrowserInfo();
  checkBackend();
});
</script>

<style scoped>
.diagnostic {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

h1 {
  color: #333;
  margin-bottom: 2rem;
  font-size: 2rem;
}

h2 {
  color: #667eea;
  margin: 1.5rem 0 1rem;
  font-size: 1.3rem;
}

.diagnostic-section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #eee;
}

.diagnostic-section:last-child {
  border-bottom: none;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.check-item.ok {
  background: #e8f5e9;
  color: #2e7d32;
}

.check-item.error {
  background: #ffebee;
  color: #c62828;
}

.check-item.checking {
  background: #e3f2fd;
  color: #1565c0;
}

.status-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.status-text {
  flex: 1;
  font-weight: 500;
}

.btn-retry {
  padding: 0.5rem 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-retry:hover {
  background: #5568d3;
  transform: translateY(-2px);
}

.error-message {
  background: #ffcdd2;
  color: #c62828;
  padding: 1rem;
  border-radius: 6px;
  margin: 1rem 0;
  font-family: monospace;
  white-space: pre-wrap;
}

.success-details {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 1rem;
  border-radius: 6px;
  margin: 1rem 0;
}

.success-details p {
  margin: 0.5rem 0;
}

.troubleshoot {
  background: #f9f9f9;
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #ff9800;
}

.troubleshoot h3 {
  color: #333;
  margin-top: 0;
}

.troubleshoot ol {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.troubleshoot li {
  margin: 1rem 0;
  line-height: 1.6;
}

.troubleshoot strong {
  color: #667eea;
}

.troubleshoot p {
  margin: 0.5rem 0;
  color: #666;
}

.troubleshoot code {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  color: #d32f2f;
}

.btn-primary {
  padding: 1rem 2rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 1rem;
}

.btn-primary:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
</style>
