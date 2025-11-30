<template>
  <div class="home">
    <div class="container">
      <h1>🎲 欢迎来到税务风险沙盘游戏</h1>
      <p class="subtitle">通过模拟决策，体验20年的税务经营</p>

      <div class="options">
        <button @click="startSinglePlayer" class="btn btn-primary">
          👤 单人游戏
        </button>
        <router-link to="/multiplayer" class="btn btn-secondary">
          👥 多人游戏
        </router-link>
        <a href="#" class="btn btn-tertiary">
          📖 游戏规则
        </a>
      </div>

      <div class="features">
        <h2>游戏特色</h2>
        <ul>
          <li>✅ 120个精心设计的游戏格子</li>
          <li>✅ 5项核心指标实时追踪</li>
          <li>✅ 智能审计触发机制</li>
          <li>✅ 完整的20年游戏周期</li>
          <li>✅ 多人实时同步</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function startSinglePlayer() {
  // 创建游戏后跳转
  router.push('/setup');
}
</script>

<style scoped>
.home {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.container {
  background: white;
  padding: 3rem;
  border-radius: 12px;
  max-width: 600px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

h1 {
  font-size: 2.5rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 2rem;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 2rem 0;
}

.btn {
  padding: 1rem;
  font-size: 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  display: block;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
  transform: translateY(-2px);
}

.btn-secondary {
  background: #764ba2;
  color: white;
}

.btn-secondary:hover {
  background: #6a3e94;
  transform: translateY(-2px);
}

.btn-tertiary {
  background: #f0f0f0;
  color: #333;
}

.btn-tertiary:hover {
  background: #e0e0e0;
}

.features {
  text-align: left;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 2px solid #eee;
}

.features h2 {
  text-align: center;
  color: #333;
  margin-bottom: 1rem;
}

.features ul {
  list-style: none;
  padding: 0;
}

.features li {
  padding: 0.5rem 0;
  color: #555;
}
</style>
