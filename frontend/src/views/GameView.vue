<template>
  <div class="game">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>正在加载游戏数据...</p>
    </div>

    <!-- 错误提示 -->
    <div v-if="error && !loading" class="error-banner">
      <p>⚠️ {{ error }}</p>
      <p style="font-size: 0.9rem; margin-top: 0.5rem;">已使用本地备份数据，部分功能可能受限</p>
    </div>

    <!-- 游戏结束面板 -->
    <div v-if="gameOverStatus.isOver" class="game-over-overlay">
      <div class="game-over-modal">
        <h2>{{ gameOverStatus.isWin ? '🎉 游戏完成' : '❌ 游戏结束' }}</h2>
        <p class="game-over-reason">{{ gameOverStatus.reason }}</p>
        <div class="game-over-stats">
          <div class="stat">
            <span>年份</span>
            <strong>{{ currentYear }}/20</strong>
          </div>
          <div class="stat">
            <span>现金</span>
            <strong>¥{{ currentCash.toLocaleString() }}万</strong>
          </div>
          <div class="stat">
            <span>合规意识</span>
            <strong>{{ Math.round(compliance) }}分</strong>
          </div>
          <div class="stat">
            <span>风险值</span>
            <strong>{{ Math.round(risk) }}分</strong>
          </div>
        </div>
        <button @click="backToHome" class="btn-primary">← 返回首页</button>
      </div>
    </div>

    <!-- 年度结算面板 -->
    <YearlySettlementPanel
      v-if="showSettlement"
      :show="showSettlement"
      :settlementData="settlementData"
      @close="closeSettlement"
      @confirm="continueAfterSettlement"
    />

    <div v-if="!gameOverStatus.isOver" class="game-wrapper">
      <!-- 顶部：棋盘 -->
      <div class="board-section">
        <GameBoard :currentPosition="currentPosition" :grids="gridDefinitions" />
        
        <button @click="rollDice" class="btn-primary" :disabled="showDecision || showSettlement">
          🎲 掷骰子
        </button>
        <p v-if="diceResult" class="dice-result">本次掷出: <strong>{{ diceResult }}</strong></p>

        <!-- 年度利润提示 -->
        <div v-if="annualProfit !== 0" class="annual-profit-hint">
          📊 本年累计利润：<strong>¥{{ annualProfit.toLocaleString() }}万</strong>
        </div>

        <!-- 决策面板 -->
        <div v-if="showDecision && currentGridInfo" class="decision-panel">
          <h3>{{ currentGridInfo.type }} - 选择你的方案</h3>
          <p class="grid-description">{{ currentGridInfo.description }}</p>
          
          <div class="choices">
            <button 
              v-for="(choice, index) in currentGridInfo.choices" 
              :key="index"
              @click="makeDecision(choice)"
              class="choice-card"
            >
              <span class="choice-label">{{ String.fromCharCode(65 + index) }}</span>
              <span class="choice-text">{{ choice.text }}</span>
              <span class="choice-effect">{{ choice.effect }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 底部：玩家状态 -->
      <div class="status-container">
        <div class="status-section">
          <h2>玩家状态</h2>
          <div class="status-panel">
            <div class="indicator">
              <label>合规意识</label>
              <div class="progress-bar">
                <div class="progress" :style="{ width: Math.max(0, Math.min(100, (compliance + 50) / 1.5)) + '%' }"></div>
              </div>
              <span>{{ Math.round(compliance) }}分</span>
            </div>

            <div class="indicator">
              <label>风险值</label>
              <div class="progress-bar">
                <div class="progress" :style="{ 
                  width: Math.max(0, Math.min(100, risk / 2)) + '%', 
                  background: getRiskColor() 
                }"></div>
              </div>
              <span>{{ Math.round(risk) }}分</span>
            </div>

            <div class="indicator">
              <label>财务透明度</label>
              <div class="progress-bar">
                <div class="progress" :style="{ 
                  width: Math.max(0, Math.min(100, transparency)) + '%',
                  background: '#2196f3'
                }"></div>
              </div>
              <span>{{ Math.round(transparency) }}分</span>
            </div>

            <div class="indicator">
              <label>风险承受度</label>
              <div class="progress-bar">
                <div class="progress" :style="{ 
                  width: Math.max(0, Math.min(100, riskTolerance)) + '%',
                  background: '#ff9800'
                }"></div>
              </div>
              <span>{{ Math.round(riskTolerance) }}分</span>
            </div>

            <hr style="margin: 1rem 0; border: none; border-top: 1px solid #eee;">

            <div class="indicator">
              <label>💰 现金</label>
              <span class="amount">¥{{ currentCash.toLocaleString() }}万</span>
            </div>

            <div class="indicator">
              <label>🏦 税务储备</label>
              <span class="amount" :style="{ color: taxReserve > 0 ? '#4caf50' : '#f44336' }">
                ¥{{ taxReserve.toLocaleString() }}万
              </span>
            </div>

            <div class="indicator">
              <label>📈 进度</label>
              <span class="amount">{{ Math.round((currentPosition / 120) * 100) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import GameBoard from '../components/GameBoard.vue';
import YearlySettlementPanel from '../components/YearlySettlementPanel.vue';
import { GameRulesEngine, type PlayerState } from '../services/GameRulesEngine';

// ========================
// 基础游戏状态
// ========================
const currentPosition = ref(1);
const currentYear = ref(1);
const compliance = ref(50);
const risk = ref(50);
const transparency = ref(50);
const riskTolerance = ref(100);
const currentCash = ref(1000); // 单位：万元
const taxReserve = ref(100); // 单位：万元
const diceResult = ref(0);
const showDecision = ref(false);
const gridDefinitions = ref<any[]>([]);
const loading = ref(true);
const error = ref('');

// ========================
// 年度结算状态
// ========================
const annualProfit = ref(0);
const showSettlement = ref(false);
const settlementData = ref<any>(null);
const lastSettledYear = ref(0);

// ========================
// 游戏结束状态
// ========================
const gameOverStatus = ref({
  isOver: false,
  isWin: false,
  reason: ''
});

// ========================
// 计算属性
// ========================
const currentGridInfo = computed(() => {
  return gridDefinitions.value[currentPosition.value - 1] || null;
});

// ========================
// 初始化
// ========================
onMounted(async () => {
  try {
    console.log('🔌 正在连接到后端: http://localhost:3001/api/grid/definitions');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('http://localhost:3001/api/grid/definitions', {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.grids || !Array.isArray(data.grids)) {
      throw new Error('后端返回的数据格式错误');
    }
    
    gridDefinitions.value = data.grids.sort((a: any, b: any) => a.position - b.position);
    console.log(`✅ 成功加载${gridDefinitions.value.length}个格子`);
    loading.value = false;
    error.value = '';
  } catch (err: any) {
    console.error('❌ 获取格子失败:', err);
    loading.value = false;
    
    if (err.name === 'AbortError') {
      error.value = '连接超时：后端服务器可能未运行';
    } else if (err instanceof TypeError) {
      error.value = '网络错误：无法连接到后端服务器';
    } else {
      error.value = `错误: ${err.message}`;
    }
    
    loadLocalGrids();
  }
});

// ========================
// 本地备份数据
// ========================
function loadLocalGrids() {
  gridDefinitions.value = [];
  
  const types = ['采购', '销售', '成本', '薪酬', '分配', '融资'];
  const choicesMap: Record<string, any[]> = {
    '采购': [
      { id: 'A', text: '正规供应商', effect: '安全', effects: { compliance: 8, risk: -5 } },
      { id: 'B', text: '中等供应商', effect: '平衡', effects: { cash: 30, risk: 8 } },
      { id: 'C', text: '非正规渠道', effect: '高收益', effects: { cash: 100, compliance: -15, risk: 25 } },
      { id: 'D', text: '混合方案', effect: '风险中', effects: { cash: 40, compliance: -2, risk: 10 } },
      { id: 'E', text: '最低成本', effect: '极端', effects: { cash: 150, compliance: -25, risk: 40 } }
    ],
    '销售': [
      { id: 'A', text: '全部开票', effect: '合规', effects: { compliance: 10, risk: -8, transparency: 10 } },
      { id: 'B', text: '部分现金', effect: '轻微', effects: { cash: 150, compliance: -5, risk: 15 } },
      { id: 'C', text: '全部现金', effect: '中等', effects: { cash: 300, compliance: -20, risk: 35 } },
      { id: 'D', text: '虚开发票', effect: '高风险', effects: { cash: 250, compliance: -30, risk: 50 } },
      { id: 'E', text: '正规优化', effect: '节税', effects: { cash: 50, compliance: 5 } }
    ],
    '成本': [
      { id: 'A', text: '实事求是', effect: '规范', effects: { compliance: 8, transparency: 8 } },
      { id: 'B', text: '适度调整', effect: '微调', effects: { cash: 50, compliance: -5, risk: 10 } },
      { id: 'C', text: '大幅调整', effect: '调整', effects: { cash: 150, compliance: -20, risk: 30 } },
      { id: 'D', text: '关联交易', effect: '陷阱', effects: { cash: 100, compliance: -15, risk: 25 } },
      { id: 'E', text: '延期支付', effect: '延期', effects: { cash: 80, compliance: -3, risk: 5 } }
    ],
    '薪酬': [
      { id: 'A', text: '正规代扣', effect: '合规', effects: { compliance: 10, transparency: 5 } },
      { id: 'B', text: '部分现金', effect: '绕过', effects: { cash: 80, compliance: -8, risk: 12 } },
      { id: 'C', text: '全部现金', effect: '高风险', effects: { cash: 120, compliance: -20, risk: 30 } },
      { id: 'D', text: '虚假列支', effect: '虚假', effects: { cash: 100, compliance: -25, risk: 35 } },
      { id: 'E', text: '股权激励', effect: '节税', effects: { cash: 60, compliance: 3, risk: 5 } }
    ],
    '分配': [
      { id: 'A', text: '全额分配', effect: '正常', effects: { cash: 100, compliance: -5 } },
      { id: 'B', text: '部分保留', effect: '保留', effects: { cash: 60, compliance: 5 } },
      { id: 'C', text: '全额保留', effect: '积累', effects: { cash: 0, compliance: 8 } },
      { id: 'D', text: '关联借款', effect: '隐形', effects: { cash: 150, compliance: -15, risk: 20 } },
      { id: 'E', text: '股息红利', effect: '优惠', effects: { cash: 80, compliance: 5, risk: 3 } }
    ],
    '融资': [
      { id: 'A', text: '透明融资', effect: '披露', effects: { compliance: 10 } },
      { id: 'B', text: '隐性融资', effect: '隐瞒', effects: { cash: 100, compliance: -5, risk: 20 } },
      { id: 'C', text: '税务融资', effect: '优化', effects: { cash: 80, compliance: 0, risk: 8 } },
      { id: 'D', text: '高利贷', effect: '高风险', effects: { cash: 200, compliance: -20, risk: 30 } },
      { id: 'E', text: '股权融资', effect: '股本', effects: { cash: 150, compliance: 8 } }
    ]
  };

  for (let i = 1; i <= 120; i++) {
    const type = types[(i - 1) % 6];
    gridDefinitions.value.push({
      gridId: `G${Math.ceil(i / 6)}-${(i - 1) % 6 + 1}`,
      position: i,
      type,
      description: `第${Math.ceil(i / 6)}年: ${type}决策`,
      choices: choicesMap[type]
    });
  }
}

// ========================
// 掷骰子
// ========================
function rollDice() {
  diceResult.value = Math.floor(Math.random() * 6) + 1;
  currentPosition.value += diceResult.value;
  
  if (currentPosition.value > 120) {
    currentPosition.value = 120;
  }

  currentYear.value = Math.ceil(currentPosition.value / 6);
  showDecision.value = true;

  compliance.value += (Math.random() * 10 - 5);
  risk.value += (Math.random() * 8 - 4);

  // 每6格触发年度结算
  if (currentPosition.value % 6 === 0 && lastSettledYear.value !== currentYear.value) {
    setTimeout(() => {
      triggerYearlySettlement();
    }, 500);
  }

  checkGameOver();
}

// ========================
// 做决策
// ========================
function makeDecision(choice: any) {
  if (choice.effects) {
    if (choice.effects.cash !== undefined) {
      currentCash.value += choice.effects.cash;
      annualProfit.value += choice.effects.cash;
    }
    if (choice.effects.compliance !== undefined) {
      compliance.value += choice.effects.compliance;
    }
    if (choice.effects.risk !== undefined) {
      risk.value += choice.effects.risk;
    }
    if (choice.effects.transparency !== undefined) {
      transparency.value = Math.max(0, Math.min(100, transparency.value + choice.effects.transparency));
    }
  }
  
  showDecision.value = false;
  checkGameOver();
}

// ========================
// 年度结算
// ========================
function triggerYearlySettlement() {
  // 如果年度利润为0（没有做决策），默认给一个最小利润以演示储备机制
  const effectiveProfit = Math.max(annualProfit.value, 50);
  
  const playerState: PlayerState = {
    currentPosition: currentPosition.value,
    currentYear: currentYear.value,
    compliance: compliance.value,
    risk: risk.value,
    transparency: transparency.value,
    riskTolerance: riskTolerance.value,
    cash: currentCash.value,
    taxReserve: taxReserve.value,
    annualProfit: effectiveProfit,
    knowledge: 50,
    auditHistory: []
  };

  const { settlement } = GameRulesEngine.yearlySettlement(playerState);
  settlementData.value = settlement;
  console.log('📊 触发年度结算，利润:', effectiveProfit, '万，储备将变化到:', settlement.reserveBalance, '万');
  showSettlement.value = true;
  lastSettledYear.value = currentYear.value;
}

function closeSettlement() {
  showSettlement.value = false;
}

function continueAfterSettlement() {
  // 使用与triggerYearlySettlement相同的有效利润
  const effectiveProfit = Math.max(annualProfit.value, 50);
  
  const playerState: PlayerState = {
    currentPosition: currentPosition.value,
    currentYear: currentYear.value,
    compliance: compliance.value,
    risk: risk.value,
    transparency: transparency.value,
    riskTolerance: riskTolerance.value,
    cash: currentCash.value,
    taxReserve: taxReserve.value,
    annualProfit: effectiveProfit,
    knowledge: 50,
    auditHistory: []
  };

  const { newState } = GameRulesEngine.yearlySettlement(playerState);

  // 直接应用新状态
  compliance.value = newState.compliance;
  risk.value = newState.risk;
  transparency.value = newState.transparency;
  riskTolerance.value = newState.riskTolerance;
  currentCash.value = newState.cash;
  taxReserve.value = newState.taxReserve;
  annualProfit.value = 0;

  console.log('✅ 结算已应用。储备值更新为:', newState.taxReserve, '万');
  
  showSettlement.value = false;
  checkGameOver();
}

// ========================
// 游戏结束检测
// ========================
function checkGameOver() {
  if (currentCash.value <= 0) {
    endGame('现金不足：破产出局', false);
    return;
  }

  if (riskTolerance.value <= 0) {
    endGame('风险承受度不足：无法继续运营', false);
    return;
  }

  if (compliance.value < -50) {
    endGame('严重违规：被刑事处罚，企业清算', false);
    return;
  }

  if (currentPosition.value >= 120) {
    let rating = '及格企业 ⭐';
    if (compliance.value >= 80 && transparency.value >= 85 && currentCash.value >= 500) {
      rating = '零风险企业 ⭐⭐⭐';
    } else if (compliance.value >= 60 && transparency.value >= 70 && currentCash.value >= 300) {
      rating = '守法企业 ⭐⭐';
    }
    endGame(`完成20年游戏！评级：${rating}`, true);
    return;
  }
}

function endGame(reason: string, isWin: boolean) {
  gameOverStatus.value = { isOver: true, isWin, reason };
}

function backToHome() {
  window.location.href = '/';
}

// ========================
// 辅助函数
// ========================
function getRiskColor(): string {
  if (risk.value < 50) return '#4caf50';
  if (risk.value < 100) return '#ff9800';
  return '#f44336';
}
</script>

<style scoped>
.game {
  padding: 2rem;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 2rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  color: white;
  font-size: 1.1rem;
  font-weight: 500;
}

.error-banner {
  background: #ff6b6b;
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.game-over-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.game-over-modal {
  background: white;
  padding: 3rem;
  border-radius: 16px;
  text-align: center;
  max-width: 500px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.game-over-modal h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.game-over-reason {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 2rem;
}

.game-over-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.game-over-stats .stat {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
}

.game-over-stats span {
  display: block;
  color: #999;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.game-over-stats strong {
  display: block;
  font-size: 1.3rem;
  color: #667eea;
}

.game-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.status-container {
  display: grid;
  grid-template-columns: 1fr;
}

.board-section,
.status-section {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

h2 {
  color: #333;
  margin-bottom: 1.5rem;
  font-size: 1.3rem;
}

.btn-primary {
  padding: 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
  margin-top: 1rem;
  width: 100%;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-2px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.indicator {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}

.progress-bar {
  height: 20px;
  background: #eee;
  border-radius: 10px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: #4caf50;
  transition: width 0.3s;
}

span {
  font-size: 0.9rem;
  color: #666;
}

.amount {
  font-weight: 600;
  color: #667eea;
  font-size: 1.1rem;
}

.dice-result {
  font-size: 1.2rem;
  color: #f39c12;
  font-weight: bold;
  text-align: center;
  margin: 1rem 0;
}

.annual-profit-hint {
  background: #fff3cd;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #f39c12;
  color: #856404;
  margin: 1rem 0;
}

.decision-panel {
  background: #f0f4ff;
  padding: 1.5rem;
  border-radius: 12px;
  border: 2px solid #667eea;
  margin-top: 2rem;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.decision-panel h3 {
  color: #667eea;
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
}

.grid-description {
  color: #666;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
  font-style: italic;
}

.choices {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.8rem;
}

.choice-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border: 2px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: left;
  font-size: 0.95rem;
}

.choice-card:hover {
  border-color: #667eea;
  background: #f9f9ff;
  transform: translateX(5px);
}

.choice-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #667eea;
  color: white;
  border-radius: 50%;
  font-weight: bold;
  flex-shrink: 0;
}

.choice-text {
  font-weight: 600;
  color: #333;
  flex: 1;
}

.choice-effect {
  font-size: 0.85rem;
  color: #f39c12;
}

@media (max-width: 768px) {
  .game {
    padding: 1rem;
  }

  .game-wrapper {
    gap: 1rem;
  }

  .board-section,
  .status-section {
    padding: 1.5rem;
  }
}
</style>
