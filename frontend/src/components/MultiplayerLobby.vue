/**
 * 多人游戏大厅组件
 * Phase 4: 房间选择和创建
 */

<template>
  <div class="multiplayer-lobby">
    <!-- 标题区 -->
    <div class="lobby-header">
      <h1>税务风险沙盘游戏 - 多人模式</h1>
      <div class="connection-status">
        <span :class="{ connected: socketConnected, disconnected: !socketConnected }"></span>
        {{ socketConnected ? '已连接' : '未连接' }}
      </div>
    </div>

    <!-- 主容器 -->
    <div class="lobby-container">
      <!-- 左侧：创建房间 -->
      <div class="create-room-panel">
        <h2>创建新房间</h2>
        <div class="form-group">
          <label>玩家名称</label>
          <input v-model="playerName" type="text" placeholder="输入你的游戏昵称" />
        </div>

        <div class="form-group">
          <label>房间名称</label>
          <input v-model="newRoomName" type="text" placeholder="输入房间名称" />
        </div>

        <button @click="handleCreateRoom" :disabled="!playerName || !newRoomName || creatingRoom" class="btn-create">
          {{ creatingRoom ? '创建中...' : '创建房间' }}
        </button>

        <div v-if="createRoomError" class="error-message">
          {{ createRoomError }}
        </div>
      </div>

      <!-- 右侧：房间列表 -->
      <div class="rooms-panel">
        <div class="panel-header">
          <h2>可用房间 ({{ availableRooms.length }})</h2>
          <button @click="handleRefreshRooms" :disabled="refreshingRooms" class="btn-refresh">
            {{ refreshingRooms ? '刷新中...' : '刷新' }}
          </button>
        </div>

        <div v-if="availableRooms.length === 0" class="empty-state">
          <p>暂无可用房间，请创建一个新房间或稍后再试</p>
        </div>

        <div v-else class="rooms-list">
          <div v-for="room in availableRooms" :key="room.roomId" class="room-card">
            <div class="room-header">
              <h3>{{ room.roomName }}</h3>
              <span class="room-badge">{{ room.players.length }}/{{ room.maxPlayers }}</span>
            </div>

            <div class="room-info">
              <p><strong>房主:</strong> {{ room.players[0]?.playerName }}</p>
              <p><strong>状态:</strong> {{ room.status === 'waiting' ? '等待中' : '游戏中' }}</p>
              <p><strong>创建时间:</strong> {{ formatTime(room.createdAt) }}</p>
            </div>

            <div class="room-players">
              <p><strong>玩家列表:</strong></p>
              <ul>
                <li v-for="player in room.players" :key="player.playerId">
                  {{ player.playerName }}
                  <span v-if="player.isHost" class="host-badge">房主</span>
                </li>
              </ul>
            </div>

            <button
              @click="handleJoinRoom(room)"
              :disabled="!playerName || room.players.length >= room.maxPlayers || joiningRoom"
              class="btn-join"
            >
              {{ joiningRoom ? '加入中...' : '加入房间' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部信息 -->
    <div class="lobby-footer">
      <p>💡 提示：在线多人游戏支持2-4个玩家，轮流掷骰子和做决策</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import socketService from '../services/socketService';
import { useMultiplayerStore } from '../stores/multiplayerStore';
import type { GameRoom } from '../stores/multiplayerStore';

const multiplayerStore = useMultiplayerStore();

// 数据
const playerName = ref('');
const newRoomName = ref('');
const availableRooms = ref<GameRoom[]>([]);

// 状态
const socketConnected = computed(() => multiplayerStore.socketConnected);
const creatingRoom = ref(false);
const joiningRoom = ref(false);
const refreshingRooms = ref(false);
const createRoomError = ref('');

// 生成玩家ID
const generatePlayerId = () => `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// 格式化时间
const formatTime = (date: any) => {
  return new Date(date).toLocaleString('zh-CN');
};

// 创建房间
const handleCreateRoom = async () => {
  if (!playerName.value || !newRoomName.value) {
    createRoomError.value = '请输入玩家名称和房间名称';
    return;
  }

  creatingRoom.value = true;
  createRoomError.value = '';

  try {
    const playerId = generatePlayerId();
    multiplayerStore.setCurrentPlayer(playerId, playerName.value);

    const result = await socketService.createRoom(playerId, newRoomName.value);

    if (result.success) {
      multiplayerStore.setCurrentRoom(result.room);
      // 触发加入房间事件，由父组件处理导航
      window.dispatchEvent(
        new CustomEvent('room-created', {
          detail: { roomId: result.room.roomId, playerId },
        })
      );
    } else {
      createRoomError.value = result.message || '创建房间失败';
    }
  } catch (error) {
    createRoomError.value = (error as Error).message || '创建房间出错';
  } finally {
    creatingRoom.value = false;
  }
};

// 加入房间
const handleJoinRoom = async (room: GameRoom) => {
  if (!playerName.value) {
    return;
  }

  joiningRoom.value = true;

  try {
    const playerId = generatePlayerId();
    multiplayerStore.setCurrentPlayer(playerId, playerName.value);

    const result = await socketService.joinRoom(room.roomId, playerId, playerName.value);

    if (result.success) {
      multiplayerStore.setCurrentRoom(result.room);
      // 触发加入房间事件
      window.dispatchEvent(
        new CustomEvent('room-joined', {
          detail: { roomId: room.roomId, playerId },
        })
      );
    }
  } catch (error) {
    console.error('加入房间失败:', error);
  } finally {
    joiningRoom.value = false;
  }
};

// 刷新房间列表
const handleRefreshRooms = async () => {
  refreshingRooms.value = true;

  try {
    const result = await socketService.listRooms();
    if (result.success) {
      availableRooms.value = result.rooms;
    }
  } catch (error) {
    console.error('获取房间列表失败:', error);
  } finally {
    refreshingRooms.value = false;
  }
};

// 初始化
onMounted(async () => {
  // 连接WebSocket
  const connected = await socketService.connect();
  multiplayerStore.setSocketConnected(connected);

  if (connected) {
    // 获取房间列表
    await handleRefreshRooms();

    // 定期刷新房间列表（每10秒）
    const refreshInterval = setInterval(handleRefreshRooms, 10000);

    // 清理
    return () => clearInterval(refreshInterval);
  }
});
</script>

<style scoped>
.multiplayer-lobby {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.lobby-header {
  text-align: center;
  color: white;
  margin-bottom: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lobby-header h1 {
  font-size: 2.5rem;
  margin: 0;
  flex: 1;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  background: rgba(255, 255, 255, 0.2);
  padding: 10px 20px;
  border-radius: 20px;
}

.connection-status span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.connection-status span.connected {
  background: #4ade80;
}

.connection-status span.disconnected {
  background: #ef4444;
  animation: none;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(74, 222, 128, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(74, 222, 128, 0);
  }
}

.lobby-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;
}

.create-room-panel,
.rooms-panel {
  background: white;
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.create-room-panel h2,
.rooms-panel h2 {
  color: #333;
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.5rem;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #555;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.btn-create,
.btn-join,
.btn-refresh {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  width: 100%;
}

.btn-create:hover:not(:disabled),
.btn-join:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
}

.btn-create:disabled,
.btn-join:disabled,
.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-refresh {
  width: auto;
  padding: 8px 16px;
  font-size: 0.9rem;
}

.error-message {
  color: #ef4444;
  background: #fee2e2;
  padding: 12px;
  border-radius: 8px;
  margin-top: 15px;
  border-left: 4px solid #ef4444;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.panel-header h2 {
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.rooms-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-height: 600px;
  overflow-y: auto;
}

.room-card {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 15px;
  transition: all 0.3s;
}

.room-card:hover {
  border-color: #667eea;
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.1);
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.room-header h3 {
  margin: 0;
  color: #333;
}

.room-badge {
  background: #667eea;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.room-info p {
  margin: 8px 0;
  font-size: 0.9rem;
  color: #666;
}

.room-players {
  margin: 12px 0;
}

.room-players p {
  margin: 8px 0;
  font-size: 0.9rem;
  color: #666;
}

.room-players ul {
  list-style: none;
  padding: 0;
  margin: 8px 0;
}

.room-players li {
  padding: 4px 0;
  font-size: 0.85rem;
  color: #777;
}

.host-badge {
  background: #fbbf24;
  color: #78350f;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  margin-left: 8px;
  font-weight: 600;
}

.lobby-footer {
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 40px;
  font-size: 0.95rem;
}

@media (max-width: 768px) {
  .lobby-container {
    grid-template-columns: 1fr;
  }

  .lobby-header {
    flex-direction: column;
    gap: 15px;
  }

  .lobby-header h1 {
    font-size: 1.8rem;
  }
}
</style>
