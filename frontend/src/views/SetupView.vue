<template>
  <div class="setup">
    <h1>游戏设置</h1>
    <form @submit.prevent="startGame" class="form">
      <div class="form-group">
        <label>玩家名称:</label>
        <input v-model="playerName" type="text" placeholder="输入您的名称" required />
      </div>

      <div class="form-group">
        <label>企业类型:</label>
        <select v-model="playerType" required>
          <option value="individual">个体户</option>
          <option value="small">小微企业</option>
          <option value="medium">中等企业</option>
          <option value="multinational">跨国公司</option>
        </select>
      </div>

      <div class="form-group">
        <label>游戏难度:</label>
        <select v-model="difficulty" required>
          <option value="easy">简单</option>
          <option value="normal">普通</option>
          <option value="hard">困难</option>
        </select>
      </div>

      <button type="submit" class="btn">开始游戏</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const playerName = ref('');
const playerType = ref('medium');
const difficulty = ref('normal');

function startGame() {
  // 后续连接API创建游戏
  console.log({
    playerName: playerName.value,
    playerType: playerType.value,
    difficulty: difficulty.value
  });
  router.push('/game/demo-game-1');
}
</script>

<style scoped>
.setup {
  max-width: 500px;
  margin: 2rem auto;
  background: white;
  padding: 2rem;
  border-radius: 12px;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
}

input,
select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

input:focus,
select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn {
  width: 100%;
  padding: 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn:hover {
  background: #5568d3;
}
</style>
