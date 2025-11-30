/**
 * 多人游戏完整流程组件
 * Phase 4: 决策、结算、审计全集成
 */

<template>
  <div class="game-flow">
    <!-- 顶部进度 -->
    <div class="flow-progress">
      <div class="year-badge">{{ currentYear }}/20</div>
      <div class="phase-indicator">
        <span :class="{ active: phase === 'turn' }">回合</span>
        <span :class="{ active: phase === 'decision' }">决策</span>
        <span :class="{ active: phase === 'settlement' }">结算</span>
        <span :class="{ active: phase === 'ended' }">结束</span>
      </div>
    </div>

    <!-- 游戏区域 -->
    <div class="game-area">
      <!-- 第一步：回合掷骰 -->
      <div v-if="phase === 'turn'" class="phase-panel">
        <h3>第 {{ currentYear }} 年 - 回合掷骰</h3>

        <div class="turn-info">
          <p v-if="isMyTurn" class="my-turn">轮到你了！</p>
          <p v-else class="waiting">等待 {{ currentTurnPlayer }} 掷骰子...</p>
        </div>

        <div v-if="isMyTurn" class="action-area">
          <p>按下按钮掷骰子，确定你的移动距离</p>
          <button @click="handleRollDice" :disabled="diceRolled || rolling" class="btn-action">
            {{ rolling ? '掷骰子中...' : diceRolled ? `已掷: ${diceResult}点` : '掷 骰 子' }}
          </button>
        </div>

        <div v-else class="waiting-area">
          <p>等待其他玩家操作...</p>
        </div>

        <div v-if="diceRolled && turnRemaining" class="turn-timer">
          <p>回合剩余时间: {{ Math.ceil(turnRemaining / 1000) }}秒</p>
        </div>
      </div>

      <!-- 第二步：决策 -->
      <div v-if="phase === 'decision'" class="phase-panel">
        <h3>第 {{ currentYear }} 年 - 决策</h3>

        <div class="decision-prompt">
          <p><strong>格子类型:</strong> {{ currentGrid?.type || '未知' }}</p>
          <p><strong>场景描述:</strong> {{ currentGrid?.description || '无描述' }}</p>
        </div>

        <div v-if="isMyTurn" class="choices-area">
          <p>请选择你的行动方案：</p>
          <div class="choices-grid">
            <button
              v-for="(choice, index) in currentGrid?.choices || []"
              :key="index"
              @click="handleMakeDecision(choice.id)"
              :disabled="makingDecision"
              class="choice-btn"
            >
              <div class="choice-title">{{ choice.title }}</div>
              <div class="choice-effects">
                <span v-if="choice.cash" :class="{ positive: choice.cash > 0 }">
                  💰 {{ choice.cash > 0 ? '+' : '' }}{{ choice.cash }}
                </span>
                <span v-if="choice.risk" :class="{ negative: choice.risk > 0 }">
                  ⚠️ {{ choice.risk > 0 ? '+' : '' }}{{ choice.risk }}
                </span>
              </div>
            </button>
          </div>
        </div>

        <div v-else class="waiting-area">
          <p>等待 {{ currentTurnPlayer }} 做出决策...</p>
        </div>
      </div>

      <!-- 第三步：年度结算 -->
      <div v-if="phase === 'settlement'" class="phase-panel">
        <h3>第 {{ currentYear }} 年 - 年度结算</h3>

        <div class="settlement-area">
          <p>所有玩家已完成本年操作，现在进行年度结算</p>

          <div v-if="settlementData" class="settlement-summary">
            <div class="summary-item">
              <label>总收入:</label>
              <span>¥ {{ settlementData.totalIncome?.toLocaleString() }}</span>
            </div>
            <div class="summary-item">
              <label>税款:</label>
              <span class="negative">-¥ {{ settlementData.taxAmount?.toLocaleString() }}</span>
            </div>
            <div class="summary-item">
              <label>流转类型:</label>
              <span class="flow-type" :class="settlementData.flowType">
                {{ flowTypeLabel(settlementData.flowType) }}
              </span>
            </div>
            <div class="summary-item">
              <label>年末余额:</label>
              <span :class="{ positive: (settlementData.finalBalance || 0) > 0 }">
                ¥ {{ settlementData.finalBalance?.toLocaleString() }}
              </span>
            </div>
          </div>

          <button @click="handleCompleteSettlement" :disabled="settlingYear" class="btn-action primary">
            {{ settlingYear ? '结算中...' : `完成第${currentYear}年结算` }}
          </button>
        </div>
      </div>

      <!-- 游戏结束 -->
      <div v-if="phase === 'ended'" class="phase-panel">
        <h3>游戏结束 - 最终结果</h3>

        <div class="game-over-area">
          <p v-if="gameStats?.winners?.length === 1" class="winner">
            🎉 恭喜！{{ gameStats.winners[0] }} 获得胜利！
          </p>
          <p v-else class="tie">🤝 游戏平手</p>

          <div class="final-stats">
            <div v-for="stat in gameStats?.playerStats" :key="stat.playerId" class="player-stat">
              <div class="player-name">{{ stat.playerName }}</div>
              <div class="stat-detail">
                <p>最终资金: ¥ {{ stat.finalCash?.toLocaleString() }}</p>
                <p>决策数: {{ stat.decisions }}</p>
                <p>审计次数: {{ stat.audits }}</p>
                <p>罚款总额: ¥ {{ stat.totalPenalties?.toLocaleString() }}</p>
              </div>
            </div>
          </div>

          <button @click="handleBackToLobby" class="btn-action">返回大厅</button>
        </div>
      </div>
    </div>

    <!-- 实时信息面板 -->
    <div class="info-panel">
      <div class="section">
        <h4>玩家状态</h4>
        <div class="players-list">
          <div v-for="player in players" :key="player.playerId" class="player-item" :class="{ active: player.playerId === currentTurn }">
            <span class="name">{{ player.playerName }}</span>
            <span class="status">{{ player.status === 'connected' ? '🟢' : '🔴' }}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h4>你的指标</h4>
        <div class="indicators">
          <div class="indicator">
            <label>现金:</label>
            <span>¥ {{ playerData?.cash?.toLocaleString() || '0' }}</span>
          </div>
          <div class="indicator">
            <label>合规意识:</label>
            <span>{{ playerData?.compliance || 50 }}/100</span>
          </div>
          <div class="indicator">
            <label>风险值:</label>
            <span>{{ playerData?.risk || 30 }}/100</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import gameSyncService from '../services/gameSyncService';
import socketService from '../services/socketService';
import { useMultiplayerStore } from '../stores/multiplayerStore';

const multiplayerStore = useMultiplayerStore();

// 数据
const phase = ref<'turn' | 'decision' | 'settlement' | 'ended'>('turn');
const currentYear = ref(1);
const currentTurn = ref('');
const diceRolled = ref(false);
const diceResult = ref(0);
const rolling = ref(false);
const makingDecision = ref(false);
const settlingYear = ref(false);
const turnRemaining = ref<number | null>(null);
const currentGrid = ref<any>(null);
const settlementData = ref<any>(null);
const gameStats = ref<any>(null);
const syncInterval = ref<NodeJS.Timeout | null>(null);
const turnTimerInterval = ref<NodeJS.Timeout | null>(null);

// 计算属性
const room = computed(() => multiplayerStore.currentRoom);
const playerId = computed(() => multiplayerStore.currentPlayerId);
const isMyTurn = computed(() => currentTurn.value === playerId.value);
const currentTurnPlayer = computed(() => {
  return room.value?.players.find((p) => p.playerId === currentTurn.value)?.playerName || '未知玩家';
});
const players = computed(() => room.value?.players || []);
const playerData = computed(() => room.value?.gameState?.playersData?.[playerId.value] || {});

// 流转类型标签
const flowTypeLabel = (flowType: string): string => {
  const labels: Record<string, string> = {
    compliant: '合规流 (25%)',
    gray: '灰色流 (38%)',
    non_compliant: '违规流 (55%)',
  };
  return labels[flowType] || '未知流';
};

// 掷骰子
const handleRollDice = async () => {
  rolling.value = true;
  try {
    await socketService.rollDice({
      playerId: playerId.value,
      roomId: room.value?.roomId,
    });
    diceRolled.value = true;
    phase.value = 'decision';
  } catch (error) {
    console.error('掷骰子失败:', error);
  } finally {
    rolling.value = false;
  }
};

// 做决策
const handleMakeDecision = async (choiceId: string) => {
  makingDecision.value = true;
  try {
    await gameSyncService.submitDecision(room.value!.roomId, playerId.value, {
      year: currentYear.value,
      gridPosition: Math.floor(Math.random() * 120) + 1,
      gridType: currentGrid.value?.type || 'unknown',
      choice: choiceId,
    });

    phase.value = 'settlement';
  } catch (error) {
    console.error('决策失败:', error);
  } finally {
    makingDecision.value = false;
  }
};

// 完成结算
const handleCompleteSettlement = async () => {
  settlingYear.value = true;
  try {
    const settlement = await gameSyncService.annualSettle(room.value!.roomId, playerId.value);
    settlementData.value = settlement;

    // 检查游戏是否结束
    const endCheck = await gameSyncService.checkGameEnd(room.value!.roomId);
    if (endCheck.ended) {
      gameStats.value = await gameSyncService.endGame(room.value!.roomId);
      phase.value = 'ended';
    } else {
      // 推进到下一年
      const newYear = await gameSyncService.advanceYear(room.value!.roomId);
      currentYear.value = newYear;
      diceRolled.value = false;
      phase.value = 'turn';
    }
  } catch (error) {
    console.error('结算失败:', error);
  } finally {
    settlingYear.value = false;
  }
};

// 返回大厅
const handleBackToLobby = () => {
  multiplayerStore.reset();
  window.dispatchEvent(new CustomEvent('back-to-lobby'));
};

// 定期同步
const startSync = () => {
  syncInterval.value = setInterval(async () => {
    try {
      const syncState = await gameSyncService.getSyncState(room.value!.roomId, playerId.value);
      currentTurn.value = syncState.currentTurn;
      currentYear.value = syncState.currentYear;
    } catch (error) {
      console.warn('同步失败:', error);
    }
  }, 1000);

  // 回合计时器
  turnTimerInterval.value = setInterval(() => {
    if (isMyTurn.value) {
      gameSyncService
        .getTurnState(room.value!.roomId)
        .then((turnState) => {
          turnRemaining.value = turnState.remainingTime;
        })
        .catch(() => {});
    }
  }, 500);
};

const stopSync = () => {
  if (syncInterval.value) clearInterval(syncInterval.value);
  if (turnTimerInterval.value) clearInterval(turnTimerInterval.value);
};

// 初始化
onMounted(() => {
  currentYear.value = room.value?.gameState?.currentYear || 1;
  currentTurn.value = room.value?.currentTurn || '';
  startSync();
});

// 清理
onUnmounted(() => {
  stopSync();
});
</script>

<style scoped>
.game-flow {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 20px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 15px;
  min-height: 600px;
}

.flow-progress {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 20px;
}

.year-badge {
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
}

.phase-indicator {
  display: flex;
  gap: 20px;
  font-weight: 600;
}

.phase-indicator span {
  padding: 8px 16px;
  border-radius: 6px;
  background: #e5e7eb;
  color: #666;
  transition: all 0.3s;
}

.phase-indicator span.active {
  background: #667eea;
  color: white;
}

.game-area {
  background: white;
  border-radius: 10px;
  padding: 30px;
}

.phase-panel {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.phase-panel h3 {
  margin-top: 0;
  color: #333;
  border-bottom: 2px solid #667eea;
  padding-bottom: 15px;
}

.turn-info,
.decision-prompt,
.settlement-area,
.game-over-area {
  margin: 20px 0;
}

.my-turn {
  color: #10b981;
  font-weight: 600;
  font-size: 1.1rem;
  animation: pulse 1s infinite;
}

.waiting {
  color: #f59e0b;
  font-weight: 600;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.action-area,
.choices-area,
.waiting-area {
  margin: 20px 0;
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;
}

.btn-action {
  background: #667eea;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  width: 100%;
  margin-top: 15px;
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
  opacity: 0.6;
  cursor: not-allowed;
}

.choices-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin: 20px 0;
}

.choice-btn {
  padding: 15px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  text-align: left;
}

.choice-btn:hover:not(:disabled) {
  border-color: #667eea;
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.1);
}

.choice-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.choice-effects {
  font-size: 0.85rem;
  display: flex;
  gap: 10px;
}

.choice-effects .positive {
  color: #10b981;
}

.choice-effects .negative {
  color: #ef4444;
}

.settlement-summary {
  background: #f0f9ff;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
  border-left: 4px solid #667eea;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  margin: 12px 0;
  font-weight: 600;
}

.summary-item label {
  color: #666;
}

.summary-item span {
  color: #333;
}

.summary-item .negative {
  color: #ef4444;
}

.summary-item .positive {
  color: #10b981;
}

.flow-type {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 0.9rem;
}

.flow-type.compliant {
  background: #dbeafe;
  color: #0369a1;
}

.flow-type.gray {
  background: #fef3c7;
  color: #b45309;
}

.flow-type.non_compliant {
  background: #fee2e2;
  color: #991b1b;
}

.game-over-area {
  text-align: center;
}

.winner {
  color: #10b981;
  font-size: 1.2rem;
  font-weight: 700;
  margin: 20px 0;
}

.tie {
  color: #f59e0b;
  font-size: 1.2rem;
  font-weight: 700;
  margin: 20px 0;
}

.final-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.player-stat {
  background: #f9fafb;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.player-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.stat-detail p {
  margin: 6px 0;
  color: #666;
  font-size: 0.9rem;
}

.turn-timer {
  margin-top: 15px;
  padding: 12px;
  background: #fef3c7;
  border-radius: 6px;
  color: #b45309;
  font-weight: 600;
  text-align: center;
}

.info-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section h4 {
  margin: 0 0 12px 0;
  color: #333;
  border-bottom: 2px solid #667eea;
  padding-bottom: 8px;
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.player-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-radius: 6px;
  background: #f9fafb;
  transition: all 0.3s;
}

.player-item.active {
  background: #dbeafe;
  border-left: 3px solid #667eea;
}

.player-item .name {
  font-weight: 600;
  color: #333;
}

.player-item .status {
  font-size: 1.2rem;
}

.indicators {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.indicator {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background: #f9fafb;
  border-radius: 6px;
}

.indicator label {
  font-weight: 600;
  color: #666;
}

.indicator span {
  color: #333;
  font-weight: 600;
}

@media (max-width: 1024px) {
  .game-flow {
    grid-template-columns: 1fr;
  }
}
</style>
