/**
 * 多人游戏室组件
 * Phase 4: 游戏进行中的实时同步
 */

<template>
  <div class="multiplayer-room">
    <!-- 顶部信息栏 -->
    <div class="room-top-bar">
      <div class="room-info">
        <h2>{{ room?.roomName }}</h2>
        <span class="room-status" :class="room?.status">
          {{ room?.status === 'playing' ? '游戏中' : '等待中' }}
        </span>
      </div>

      <div class="player-info">
        <span class="player-name">{{ currentPlayerName }}</span>
        <button v-if="!isGamePlaying" @click="handleLeaveRoom" class="btn-leave">离开房间</button>
      </div>
    </div>

    <!-- 主容器 -->
    <div class="room-container">
      <!-- 左侧：游戏板块 -->
      <div class="game-area">
        <!-- 玩家状态显示 -->
        <div class="players-display">
          <h3>玩家状态</h3>
          <div class="players-grid">
            <div v-for="player in room?.players" :key="player.playerId" class="player-card" :class="{ active: currentTurn === player.playerId }">
              <div class="player-name-display">{{ player.playerName }}</div>
              <div class="player-status">{{ player.status === 'connected' ? '在线' : '离线' }}</div>
              <div v-if="currentTurn === player.playerId" class="turn-indicator">您的回合</div>
            </div>
          </div>
        </div>

        <!-- 游戏控制区 -->
        <div class="game-controls">
          <h3>游戏操作</h3>

          <!-- 游戏未开始 -->
          <div v-if="!isGamePlaying" class="waiting-area">
            <p>等待游戏开始...</p>
            <p class="player-count">玩家: {{ room?.players.length }}/{{ room?.maxPlayers }}</p>

            <button v-if="isHost" @click="handleStartGame" :disabled="!canStartGame" class="btn-start-game">
              {{ (room?.players.length || 0) >= 2 ? '开始游戏' : '等待更多玩家' }}
            </button>
          </div>

          <!-- 游戏进行中 -->
          <div v-else class="playing-area">
            <div class="current-turn">
              <p v-if="isMyTurn" class="my-turn">轮到你了！</p>
              <p v-else class="waiting-turn">等待 {{ getCurrentTurnPlayerName }} 操作...</p>
            </div>

            <div class="action-buttons">
              <button v-if="isMyTurn" @click="handleRollDice" :disabled="!isMyTurn || diceRolled" class="btn-action">
                {{ diceRolled ? `已掷出: ${lastDiceResult}` : '掷骰子' }}
              </button>

              <button v-if="isMyTurn && diceRolled" @click="handleMakeDecision" class="btn-action">
                做出决策
              </button>

              <button v-if="isMyTurn && decisionMade" @click="handleNextTurn" class="btn-action primary">
                结束回合
              </button>
            </div>

            <div class="current-year">
              <p><strong>当前年份:</strong> {{ room?.gameState?.currentYear || 1 }}/20</p>
              <p><strong>回合数:</strong> {{ room?.gameState?.turnCount || 0 }}</p>
            </div>
          </div>
        </div>

        <!-- 游戏状态 -->
        <div class="game-state">
          <h3>游戏状态</h3>
          <div class="state-info">
            <p><strong>房间ID:</strong> {{ room?.roomId }}</p>
            <p><strong>房主:</strong> {{ room?.players[0]?.playerName }}</p>
            <p><strong>创建时间:</strong> {{ formatTime(room?.createdAt) }}</p>
          </div>
        </div>
      </div>

      <!-- 右侧：聊天和事件日志 -->
      <div class="side-panel">
        <!-- 聊天区 -->
        <div class="chat-section">
          <h3>聊天</h3>
          <div class="chat-messages">
            <div v-for="(msg, index) in chatMessages" :key="index" class="chat-message">
              <span class="message-player">{{ msg.playerName }}:</span>
              <span class="message-text">{{ msg.message }}</span>
            </div>
          </div>

          <div class="chat-input">
            <input v-model="messageText" @keyup.enter="handleSendMessage" placeholder="输入消息..." />
            <button @click="handleSendMessage" :disabled="!messageText.trim()">发送</button>
          </div>
        </div>

        <!-- 事件日志 -->
        <div class="events-section">
          <h3>事件日志</h3>
          <div class="events-list">
            <div v-for="(msg, index) in roomMessages.slice(-5)" :key="index" class="event-item">
              {{ msg }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="room-footer">
      <p>💡 提示：所有操作会实时同步到其他玩家</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import socketService from '../services/socketService';
import { useMultiplayerStore } from '../stores/multiplayerStore';

const multiplayerStore = useMultiplayerStore();

// 数据
const messageText = ref('');
const diceRolled = ref(false);
const decisionMade = ref(false);
const lastDiceResult = ref(0);
const pingInterval = ref<number | null>(null);

// 计算属性
const room = computed(() => multiplayerStore.currentRoom);
const currentPlayerId = computed(() => multiplayerStore.currentPlayerId);
const currentPlayerName = computed(() => multiplayerStore.currentPlayerName);
const isHost = computed(() => multiplayerStore.isHost);
const isMyTurn = computed(() => multiplayerStore.isMyTurn);
const isGamePlaying = computed(() => multiplayerStore.isGamePlaying);
const chatMessages = computed(() => multiplayerStore.chatMessages);
const roomMessages = computed(() => multiplayerStore.roomMessages);
const currentTurn = computed(() => room.value?.currentTurn || '');

const canStartGame = computed(() => {
  return isHost.value && (room.value?.players.length || 0) >= 2;
});

// 获取当前回合的玩家名字
const getCurrentTurnPlayerName = () => {
  return room.value?.players.find((p) => p.playerId === currentTurn.value)?.playerName || '未知玩家';
};

// 格式化时间
const formatTime = (date: any) => {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN');
};

// 开始游戏
const handleStartGame = async () => {
  try {
    await socketService.startGame(room.value!.roomId, currentPlayerId.value);
    multiplayerStore.addRoomMessage('游戏已开始！');
  } catch (error) {
    console.error('开始游戏失败:', error);
  }
};

// 掷骰子
const handleRollDice = async () => {
  try {
    const result = await socketService.rollDice({
      playerId: currentPlayerId.value,
      roomId: room.value?.roomId,
    });

    if (result.success) {
      lastDiceResult.value = result.result;
      diceRolled.value = true;
      multiplayerStore.addRoomMessage(`${currentPlayerName.value} 掷出了 ${result.result} 点`);
    }
  } catch (error) {
    console.error('掷骰子失败:', error);
  }
};

// 做出决策
const handleMakeDecision = () => {
  // 触发决策面板
  window.dispatchEvent(
    new CustomEvent('make-decision', {
      detail: {
        playerId: currentPlayerId.value,
        roomId: room.value?.roomId,
        diceResult: lastDiceResult.value,
      },
    })
  );
};

// 下一回合
const handleNextTurn = async () => {
  try {
    await socketService.emit('next_turn', {
      roomId: room.value?.roomId,
      playerId: currentPlayerId.value,
    });

    diceRolled.value = false;
    decisionMade.value = false;
    lastDiceResult.value = 0;

    multiplayerStore.addRoomMessage(`回合切换: ${getCurrentTurnPlayerName()}`);
  } catch (error) {
    console.error('切换回合失败:', error);
  }
};

// 发送消息
const handleSendMessage = async () => {
  if (!messageText.value.trim()) return;

  try {
    await socketService.sendMessage(messageText.value);
    messageText.value = '';
  } catch (error) {
    console.error('发送消息失败:', error);
  }
};

// 离开房间
const handleLeaveRoom = async () => {
  try {
    await socketService.leaveRoom(currentPlayerId.value);
    multiplayerStore.reset();
    window.dispatchEvent(new CustomEvent('room-left'));
  } catch (error) {
    console.error('离开房间失败:', error);
  }
};

// 心跳检测
const startHeartbeat = () => {
  pingInterval.value = window.setInterval(async () => {
    try {
      await socketService.ping();
    } catch (error) {
      console.warn('心跳检测失败');
    }
  }, 30000); // 每30秒发送一次心跳
};

// 初始化
onMounted(() => {
  multiplayerStore.addRoomMessage('已进入房间');
  startHeartbeat();
});

// 清理
onUnmounted(() => {
  if (pingInterval.value) {
    clearInterval(pingInterval.value);
  }
});
</script>

<style scoped>
.multiplayer-room {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.room-top-bar {
  background: white;
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
}

.room-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.room-info h2 {
  margin: 0;
  color: #333;
}

.room-status {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  color: white;
}

.room-status.waiting {
  background: #f59e0b;
}

.room-status.playing {
  background: #10b981;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.player-name {
  font-weight: 600;
  color: #333;
}

.btn-leave {
  background: #ef4444;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-leave:hover {
  background: #dc2626;
}

.room-container {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.game-area,
.side-panel {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.game-area > div {
  margin-bottom: 25px;
}

.game-area h3,
.side-panel h3 {
  color: #333;
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.2rem;
  border-bottom: 2px solid #667eea;
  padding-bottom: 10px;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.player-card {
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  padding: 15px;
  text-align: center;
  transition: all 0.3s;
}

.player-card.active {
  border-color: #10b981;
  background: #ecfdf5;
  box-shadow: 0 5px 15px rgba(16, 185, 129, 0.2);
}

.player-name-display {
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.player-status {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 8px;
}

.turn-indicator {
  background: #10b981;
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}

.waiting-area,
.playing-area {
  background: #f9fafb;
  border-radius: 10px;
  padding: 20px;
}

.waiting-area p {
  margin: 10px 0;
  color: #666;
  text-align: center;
}

.player-count {
  font-weight: 600;
  color: #333;
  margin: 15px 0 20px 0;
}

.btn-start-game {
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-start-game:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
}

.btn-start-game:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.current-turn {
  margin-bottom: 15px;
  text-align: center;
}

.my-turn {
  color: #10b981;
  font-weight: 600;
  font-size: 1.1rem;
  margin: 0;
  animation: pulse-text 1s infinite;
}

.waiting-turn {
  color: #667eea;
  font-weight: 600;
  margin: 0;
}

@keyframes pulse-text {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.btn-action {
  flex: 1;
  background: #667eea;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-action:hover:not(:disabled) {
  background: #5a67d8;
  transform: translateY(-2px);
}

.btn-action.primary {
  background: #10b981;
}

.btn-action.primary:hover:not(:disabled) {
  background: #059669;
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.current-year p {
  margin: 8px 0;
  color: #666;
  font-size: 0.95rem;
}

.game-state {
  background: #f9fafb;
  padding: 15px;
  border-radius: 10px;
}

.state-info p {
  margin: 8px 0;
  color: #666;
  font-size: 0.9rem;
}

/* 右侧面板 */
.side-panel {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.chat-section,
.events-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.chat-messages,
.events-list {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  height: 250px;
  overflow-y: auto;
  background: #f9fafb;
}

.chat-message,
.event-item {
  padding: 8px;
  margin-bottom: 8px;
  background: white;
  border-radius: 6px;
  font-size: 0.9rem;
  border-left: 3px solid #667eea;
}

.message-player {
  font-weight: 600;
  color: #667eea;
  margin-right: 8px;
}

.message-text {
  color: #333;
}

.event-item {
  color: #666;
  border-left-color: #f59e0b;
}

.chat-input {
  display: flex;
  gap: 8px;
}

.chat-input input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.9rem;
}

.chat-input button {
  background: #667eea;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.chat-input button:hover:not(:disabled) {
  background: #5a67d8;
}

.chat-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.room-footer {
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 20px;
  font-size: 0.9rem;
}

@media (max-width: 1024px) {
  .room-container {
    grid-template-columns: 1fr;
  }

  .players-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .room-top-bar {
    flex-direction: column;
    gap: 15px;
  }

  .players-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .action-buttons {
    flex-direction: column;
  }
}
</style>
