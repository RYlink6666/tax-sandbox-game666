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
            <strong>¥{{ currentCash.toLocaleString() }}</strong>
          </div>
          <div class="stat">
            <span>合规意识</span>
            <strong>{{ Math.round(compliance) }}%</strong>
          </div>
          <div class="stat">
            <span>风险值</span>
            <strong>{{ Math.round(risk) }}%</strong>
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
                <div class="progress" :style="{ width: Math.max(0, Math.min(100, compliance)) + '%' }"></div>
              </div>
              <span>{{ Math.round(compliance) }}分</span>
            </div>

            <div class="indicator">
              <label>风险值</label>
              <div class="progress-bar">
                <div class="progress" :style="{ 
                  width: Math.max(0, Math.min(100, risk)) + '%', 
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
import { GameRulesEngine, type PlayerState, type DecisionEffect } from '../services/GameRulesEngine';

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
const annualProfit = ref(0); // 本年累计利润
const showSettlement = ref(false); // 是否显示结算面板
const settlementData = ref<any>(null); // 结算数据
const lastSettledYear = ref(0); // 上一次结算的年份

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
// 初始化：加载格子定义
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
    } else if (err instanceof TypeError && err.message.includes('fetch')) {
      error.value = '网络错误：无法连接到后端服务器（http://localhost:3001）';
    } else {
      error.value = `错误: ${err.message}`;
    }
    
    console.log('📦 使用本地备份数据...');
    loadLocalGrids();
  }
});

// ========================
// 本地备份数据
// ========================
function loadLocalGrids() {
  gridDefinitions.value = [
    {
      gridId: 'G1-01',
      position: 1,
      type: '采购',
      category: '采购决策',
      description: '第1年: 如何选择供应商和采购渠道？',
      choices: [
        { id: 'A', text: '正规供应商', effect: '安全但成本高', effects: { compliance: 8, risk: -5 } },
        { id: 'B', text: '中等供应商', effect: '平衡方案', effects: { cash: 30, risk: 8 } },
        { id: 'C', text: '非正规渠道', effect: '高收益高风险', effects: { cash: 100, compliance: -15, risk: 25 } },
        { id: 'D', text: '混合方案', effect: '稍有风险', effects: { cash: 40, compliance: -2, risk: 10 } },
        { id: 'E', text: '最低成本', effect: '极端方案', effects: { cash: 150, compliance: -25, risk: 40 } }
      ]
    },
    {
      gridId: 'G1-02',
      position: 2,
      type: '销售',
      category: '销售决策',
      description: '第1年: 如何处理销售收入？',
      choices: [
        { id: 'A', text: '全部开票', effect: '完全合规', effects: { compliance: 10, risk: -8, transparency: 10 } },
        { id: 'B', text: '部分现金', effect: '轻微风险', effects: { cash: 150, compliance: -5, risk: 15 } },
        { id: 'C', text: '全部现金', effect: '中等风险', effects: { cash: 300, compliance: -20, risk: 35 } },
        { id: 'D', text: '虚开发票', effect: '高风险', effects: { cash: 250, compliance: -30, risk: 50 } },
        { id: 'E', text: '正规+让利', effect: '优化方案', effects: { cash: 50, compliance: 5 } }
      ]
    },
    {
      gridId: 'G1-03',
      position: 3,
      type: '成本',
      category: '成本管理',
      description: '第1年: 如何处理成本？',
      choices: [
        { id: 'A', text: '实事求是', effect: '完全规范', effects: { compliance: 8, transparency: 8 } },
        { id: 'B', text: '适度调整', effect: '小幅调整', effects: { cash: 50, compliance: -5, risk: 10 } },
        { id: 'C', text: '大幅调整', effect: '大幅调整', effects: { cash: 150, compliance: -20, risk: 30 } },
        { id: 'D', text: '关联交易', effect: '税务陷阱', effects: { cash: 100, compliance: -15, risk: 25 } },
        { id: 'E', text: '延期支付', effect: '延期风险', effects: { cash: 80, compliance: -3, risk: 5 } }
      ]
    },
    {
      gridId: 'G1-04',
      position: 4,
      type: '薪酬',
      category: '薪酬决策',
      description: '第1年: 如何处理员工薪酬？',
      choices: [
        { id: 'A', text: '正规代扣', effect: '合规操作', effects: { compliance: 10, transparency: 5 } },
        { id: 'B', text: '部分现金', effect: '绕过代扣', effects: { cash: 80, compliance: -8, risk: 12 } },
        { id: 'C', text: '全部现金', effect: '高风险避税', effects: { cash: 120, compliance: -20, risk: 30 } },
        { id: 'D', text: '虚假列支', effect: '虚假成本', effects: { cash: 100, compliance: -25, risk: 35 } },
        { id: 'E', text: '股权激励', effect: '合理节税', effects: { cash: 60, compliance: 3, risk: 5 } }
      ]
    },
    {
      gridId: 'G1-05',
      position: 5,
      type: '分配',
      category: '利润分配',
      description: '第1年: 如何分配利润？',
      choices: [
        { id: 'A', text: '全额分配', effect: '正常分配', effects: { cash: 100, compliance: -5 } },
        { id: 'B', text: '部分保留', effect: '保留一些', effects: { cash: 60, compliance: 5 } },
        { id: 'C', text: '全额保留', effect: '保留资金', effects: { cash: 0, compliance: 8 } },
        { id: 'D', text: '关联借款', effect: '隐形提取', effects: { cash: 150, compliance: -15, risk: 20 } },
        { id: 'E', text: '股息红利', effect: '税优分配', effects: { cash: 80, compliance: 5, risk: 3 } }
      ]
    },
    {
      gridId: 'G1-06',
      position: 6,
      type: '融资',
      category: '融资决策',
      description: '第1年: 如何融资？',
      choices: [
        { id: 'A', text: '透明融资', effect: '完全披露', effects: { compliance: 10 } },
        { id: 'B', text: '隐性融资', effect: '隐瞒资金', effects: { cash: 100, compliance: -5, risk: 20 } },
        { id: 'C', text: '税务融资', effect: '优化结构', effects: { cash: 80, compliance: 0, risk: 8 } },
        { id: 'D', text: '高利贷', effect: '高风险融资', effects: { cash: 200, compliance: -20, risk: 30 } },
        { id: 'E', text: '股权融资', effect: '增加股本', effects: { cash: 150, compliance: 8 } }
      ]
    }
  ];
  
  // 补充到120格
  for (let i = 7; i <= 120; i++) {
    const types = ['采购', '销售', '成本', '薪酬', '分配', '融资'];
    const type = types[(i - 1) % 6];
    gridDefinitions.value.push({
      gridId: `G${Math.ceil(i / 6)}-${(i - 1) % 6 + 1}`,
      position: i,
      type,
      category: `${type}决策`,
      description: `第${Math.ceil(i / 6)}年: ${type}相关决策`,
      choices: [
        { id: 'A', text: '保守方案', effect: '风险低', effects: { compliance: 5 } },
        { id: 'B', text: '平衡方案', effect: '适度风险', effects: { cash: 30, risk: 5 } },
        { id: 'C', text: '激进方案', effect: '高收益高风险', effects: { cash: 80, compliance: -10, risk: 15 } },
        { id: 'D', text: '风险方案', effect: '极端风险', effects: { cash: 150, compliance: -20, risk: 30 } },
        { id: 'E', text: '优化方案', effect: '合理避税', effects: { cash: 50, compliance: 3, risk: 5 } }
      ]
    });
  }
}

// ========================
// 游戏逻辑：掷骰子
// ========================
function rollDice() {
  // 检查是否到达年底（每6格）
  const previousYear = Math.ceil(currentPosition.value / 6);
  
  diceResult.value = Math.floor(Math.random() * 6) + 1;
  currentPosition.value += diceResult.value;
  
  // 限制最大120格
  if (currentPosition.value > 120) {
    currentPosition.value = 120;
  }

  // 更新年份
  currentYear.value = Math.ceil(currentPosition.value / 6);

  // 显示决策面板
  showDecision.value = true;
  diceResult.value = 0;

  // 掷骰子时随机变化指标（代表市场波动）
  compliance.value = Math.max(-50, Math.min(100, compliance.value + (Math.random() * 10 - 5)));
  risk.value = Math.max(0, risk.value + (Math.random() * 8 - 4));

  // 检查是否到达年底（6/12/18等）
  if (currentPosition.value % 6 === 0 && lastSettledYear.value !== currentYear.value) {
    // 延迟显示结算，让玩家先看到位置更新
    setTimeout(() => {
      triggerYearlySettlement();
    }, 500);
  }

  // 检查游戏是否结束
  checkGameOver();
}

// ========================
// 游戏逻辑：做决策
// ========================
function makeDecision(choice: any) {
  console.log('玩家选择:', choice);
  
  // 应用决策效果
  if (choice.effects) {
    if (choice.effects.cash !== undefined) {
      currentCash.value += choice.effects.cash;
      annualProfit.value += choice.effects.cash;
    }
    if (choice.effects.compliance !== undefined) {
      compliance.value = Math.max(-50, Math.min(100, compliance.value + choice.effects.compliance));
    }
    if (choice.effects.risk !== undefined) {
      risk.value = Math.max(0, risk.value + choice.effects.risk);
    }
    if (choice.effects.transparency !== undefined) {
      transparency.value = Math.max(0, Math.min(100, transparency.value + choice.effects.transparency));
    }
  }
  
  // 关闭决策面板，准备下一轮
  showDecision.value = false;
  diceResult.value = 0;

  // 检查游戏是否结束
  checkGameOver();
}

// ========================
// 年度结算逻辑
// ========================
function triggerYearlySettlement() {
  // 构建玩家状态
  const playerState: PlayerState = {
    currentPosition: currentPosition.value,
    currentYear: currentYear.value,
    compliance: compliance.value,
    risk: risk.value,
    transparency: transparency.value,
    riskTolerance: riskTolerance.value,
    cash: currentCash.value,
    taxReserve: taxReserve.value,
    annualProfit: annualProfit.value,
    knowledge: 50, // 临时值
    auditHistory: [] // 临时值
  };

  // 调用规则引擎进行年度结算
  const { newState, settlement } = GameRulesEngine.yearlySettlement(playerState);

  // 更新结算数据
  settlementData.value = settlement;

  // 显示结算面板
  showSettlement.value = true;
  lastSettledYear.value = currentYear.value;

  // 保存新状态（待确认后应用）
  // 这里先保存到临时变量，等玩家点击"继续游戏"后再真正应用
  console.log('年度结算完成:', settlement);
}

function closeSettlement() {
  showSettlement.value = false;
  // 不应用更改，让玩家重新选择
}

function continueAfterSettlement() {
  // 应用结算后的状态
  const playerState: PlayerState = {
    currentPosition: currentPosition.value,
    currentYear: currentYear.value,
    compliance: compliance.value,
    risk: risk.value,
    transparency: transparency.value,
    riskTolerance: riskTolerance.value,
    cash: currentCash.value,
    taxReserve: taxReserve.value,
    annualProfit: annualProfit.value,
    knowledge: 50,
    auditHistory: []
  };

  const { newState, settlement } = GameRulesEngine.yearlySettlement(playerState);

  // 更新玩家状态
  compliance.value = newState.compliance;
  risk.value = newState.risk;
  transparency.value = newState.transparency;
  riskTolerance.value = newState.riskTolerance;
  currentCash.value = newState.cash;
  taxReserve.value = newState.taxReserve;
  annualProfit.value = 0; // 重置年度利润

  // 关闭结算面板
  showSettlement.value = false;

  // 检查游戏是否结束
  checkGameOver();
}

// ========================
// 游戏结束检测
// ========================
function checkGameOver() {
  // 现金不足
  if (currentCash.value <= 0) {
    endGame('现金不足：破产出局', false);
    return;
  }

  // 风险承受度不足
  if (riskTolerance.value <= 0) {
    endGame('风险承受度不足：无法继续运营', false);
    return;
  }

  // 合规意识过低导致刑事处罚
  if (compliance.value < -50) {
    endGame('严重违规：被刑事处罚，企业清算', false);
    return;
  }

  // 完成20年
  if (currentPosition.value >= 120) {
    // 判断评级
    let rating = '及格企业';
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
  gameOverStatus.value = {
    isOver: true,
    isWin,
    reason
  };
}

function backToHome() {
  // 返回首页
  window.location.href = '/';
}

// ========================
// 辅助函数
// ========================
function getRiskColor(): string {
  if (risk.value < 50) return '#4caf50'; // 绿色
  if (risk.value < 100) return '#ff9800'; // 橙色
  return '#f44336'; // 红色
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
  to {
    transform: rotate(360deg);
  }
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 游戏结束面板 */
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
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.game-over-modal h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #333;
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
  gap: 1rem;
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
  font-size: 0.95rem;
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

.choice-card:active {
  transform: translateX(3px);
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
  white-space: nowrap;
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

  .choices {
    grid-template-columns: 1fr;
  }

  .game-over-stats {
    grid-template-columns: 1fr;
  }
}
</style>
