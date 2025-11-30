<template>
  <div class="result">
    <div class="result-card">
      <h1>游戏结束</h1>
      <div class="score-info">
        <div class="stat">
          <label>最终评分</label>
          <span class="value">85</span>
        </div>
        <div class="stat">
          <label>游戏等级</label>
          <span class="grade">A</span>
        </div>
      </div>
      <router-link to="/" class="btn">返回首页</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
// 游戏结果页面
</script>

<style scoped>
.result {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: 2rem;
}

.result-card {
  background: white;
  padding: 3rem;
  border-radius: 12px;
  text-align: center;
  max-width: 500px;
}

h1 {
  color: #333;
  margin-bottom: 2rem;
}

.score-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin: 2rem 0;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.value {
  font-size: 2rem;
  color: #667eea;
  font-weight: bold;
}

.grade {
  font-size: 2.5rem;
  color: #4caf50;
  font-weight: bold;
}

.btn {
  display: inline-block;
  padding: 1rem 2rem;
  background: #667eea;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  margin-top: 2rem;
  transition: all 0.3s;
}

.btn:hover {
  background: #5568d3;
}
</style>
