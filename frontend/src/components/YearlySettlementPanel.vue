<template>
  <div class="settlement-panel" v-if="show">
    <div class="settlement-overlay" @click="close"></div>
    
    <div class="settlement-modal">
      <div class="settlement-header">
        <h2>📊 第{{ settlementData.year }}年度结算</h2>
        <button class="close-btn" @click="close">✕</button>
      </div>

      <div class="settlement-body">
        <!-- 利润和税款 -->
        <div class="settlement-section">
          <h3>💰 收支结算</h3>
          <div class="settlement-row">
            <span class="label">年度利润</span>
            <span class="value positive">¥{{ settlementData.profit.toLocaleString() }}万</span>
          </div>
          <div class="settlement-row">
            <span class="label">税率</span>
            <span class="value">{{ (settlementData.taxRate * 100).toFixed(0) }}%</span>
          </div>
          <div class="settlement-row">
            <span class="label">应缴税款</span>
            <span class="value negative">-¥{{ settlementData.taxPayable.toLocaleString() }}万</span>
          </div>
        </div>

        <!-- 审计情况 -->
        <div class="settlement-section" v-if="settlementData.auditTriggered">
          <h3>⚠️ 税务审计</h3>
          <div class="audit-status" :class="auditStatusClass">
            <p class="audit-reason">{{ settlementData.auditReason }}</p>
            <div class="settlement-row">
              <span class="label">罚款金额</span>
              <span class="value danger">-¥{{ settlementData.fine.toLocaleString() }}万</span>
            </div>
          </div>
        </div>

        <!-- 税务储备变化 -->
        <div class="settlement-section">
          <h3>🏦 税务储备变化</h3>
          <div class="reserve-diagram">
            <!-- 储备前 -->
            <div class="reserve-step">
              <div class="step-label">储备前</div>
              <div class="reserve-bar" :style="{ height: (reserveBefore / reserveMax * 100) + '%' }">
                <span class="reserve-value">¥{{ reserveBefore }}万</span>
              </div>
            </div>

            <!-- 箭头 -->
            <div class="reserve-arrow">+</div>

            <!-- 强制提取 -->
            <div class="reserve-step">
              <div class="step-label">+强制提取</div>
              <div class="reserve-bar extraction" :style="{ height: (settlementData.reserveExtraction / reserveMax * 100) + '%' }">
                <span class="reserve-value" v-if="settlementData.reserveExtraction > 0">
                  +¥{{ settlementData.reserveExtraction.toFixed(1) }}万
                </span>
              </div>
            </div>

            <!-- 箭头 -->
            <div class="reserve-arrow">{{ settlementData.fine > 0 ? '-' : '=' }}</div>

            <!-- 储备后 -->
            <div class="reserve-step">
              <div class="step-label">储备后</div>
              <div class="reserve-bar final" :style="{ 
                height: (settlementData.reserveBalance / reserveMax * 100) + '%',
                background: settlementData.reserveBalance > 0 ? '#4caf50' : '#f44336'
              }">
                <span class="reserve-value">¥{{ settlementData.reserveBalance.toLocaleString() }}万</span>
              </div>
            </div>
          </div>

          <div class="reserve-notes">
            <p v-if="settlementData.reserveExtraction > 0">
              ✓ 从利润中强制提取 <strong>{{ (settlementData.reserveExtraction / settlementData.profit * 100).toFixed(1) }}%</strong> 作为储备
            </p>
            <p v-if="settlementData.fine > 0" class="warning">
              ⚠️ 罚款 <strong>¥{{ settlementData.fine }}万</strong> 从储备中扣除
            </p>
            <p v-if="settlementData.reserveBalance <= 0" class="danger">
              ❌ 危险！储备不足，下次罚款将直接影响现金
            </p>
          </div>
        </div>

        <!-- 总结 -->
        <div class="settlement-section summary">
          <h3>📋 本年小结</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">年度利润</span>
              <span class="summary-value">¥{{ settlementData.profit }}万</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">支出合计</span>
              <span class="summary-value negative">
                ¥{{ (settlementData.taxPayable + settlementData.fine + settlementData.reserveExtraction).toLocaleString() }}万
              </span>
            </div>
            <div class="summary-item">
              <span class="summary-label">储备余额</span>
              <span class="summary-value" :class="{ danger: settlementData.reserveBalance <= 0 }">
                ¥{{ settlementData.reserveBalance.toLocaleString() }}万
              </span>
            </div>
          </div>
        </div>

        <!-- 警告提示 -->
        <div v-if="warnings.length > 0" class="warnings">
          <div v-for="(warn, idx) in warnings" :key="idx" class="warning-box">
            {{ warn }}
          </div>
        </div>
      </div>

      <div class="settlement-footer">
        <button class="btn-confirm" @click="confirm">
          继续游戏 →
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  show: boolean;
  settlementData: any;
}

interface Emits {
  (e: 'close'): void;
  (e: 'confirm'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const reserveMax = 200; // 用于柱状图的最大值

const reserveBefore = computed(() => {
  return props.settlementData.reserveBalance - props.settlementData.reserveExtraction;
});

const auditStatusClass = computed(() => {
  const status = 'penalty'; // 可以根据实际状态改变
  return {
    'passed': status === 'passed',
    'warning': status === 'warning',
    'penalty': status === 'penalty',
    'criminal': status === 'criminal'
  };
});

const warnings = computed(() => {
  const warns = [];
  
  if (props.settlementData.fine > 50) {
    warns.push('⚠️ 罚款金额较大，请注意降低风险值');
  }
  
  if (props.settlementData.reserveBalance < props.settlementData.profit * 0.1) {
    warns.push('⚠️ 储备不足，建议下年增加提取比例');
  }
  
  if (props.settlementData.taxRate > 0.4) {
    warns.push('⚠️ 税率较高，请考虑提高合规意识');
  }
  
  return warns;
});

function close() {
  emit('close');
}

function confirm() {
  emit('confirm');
}
</script>

<style scoped>
.settlement-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.settlement-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  cursor: pointer;
}

.settlement-modal {
  position: relative;
  z-index: 1001;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
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

.settlement-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  border-bottom: 2px solid #eee;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
}

.settlement-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  transition: all 0.3s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.4);
}

.settlement-body {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.settlement-section {
  background: #f9f9f9;
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.settlement-section h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.1rem;
}

.settlement-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 0;
  border-bottom: 1px solid #eee;
}

.settlement-row:last-child {
  border-bottom: none;
}

.label {
  color: #666;
  font-weight: 500;
}

.value {
  font-weight: 600;
  font-size: 1.1rem;
}

.value.positive {
  color: #4caf50;
}

.value.negative {
  color: #f44336;
}

.value.danger {
  color: #d32f2f;
  font-weight: 700;
}

/* 审计状态 */
.audit-status {
  border: 2px solid #ff9800;
  border-radius: 8px;
  padding: 1rem;
  background: #fff3e0;
}

.audit-status.passed {
  border-color: #4caf50;
  background: #e8f5e9;
}

.audit-status.warning {
  border-color: #ff9800;
  background: #fff3e0;
}

.audit-status.penalty {
  border-color: #f44336;
  background: #ffebee;
}

.audit-status.criminal {
  border-color: #d32f2f;
  background: #b71c1c;
  color: white;
}

.audit-reason {
  margin: 0 0 1rem 0;
  font-weight: 600;
}

/* 储备变化图 */
.reserve-diagram {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 0.5rem;
  height: 150px;
  margin: 1.5rem 0;
}

.reserve-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.step-label {
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
  text-align: center;
}

.reserve-bar {
  width: 100%;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px 4px 0 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0.5rem;
  position: relative;
  min-height: 20px;
}

.reserve-bar.extraction {
  background: #4caf50;
}

.reserve-bar.final {
  background: #667eea;
}

.reserve-value {
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
  line-height: 1;
}

.reserve-arrow {
  font-size: 1.5rem;
  color: #999;
  margin-top: 3rem;
}

.reserve-notes {
  background: #f0f4ff;
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #555;
}

.reserve-notes p {
  margin: 0.5rem 0;
}

.reserve-notes strong {
  color: #667eea;
  font-weight: 600;
}

.reserve-notes .warning {
  color: #ff9800;
}

.reserve-notes .danger {
  color: #f44336;
}

/* 总结 */
.summary {
  border-left-color: #4caf50;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.summary-item {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #ddd;
}

.summary-label {
  display: block;
  font-size: 0.85rem;
  color: #999;
  margin-bottom: 0.5rem;
}

.summary-value {
  display: block;
  font-size: 1.2rem;
  font-weight: 700;
  color: #667eea;
}

.summary-value.negative {
  color: #f44336;
}

.summary-value.danger {
  color: #d32f2f;
}

/* 警告 */
.warnings {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.warning-box {
  background: #fff3cd;
  border-left: 4px solid #ff9800;
  padding: 1rem;
  border-radius: 4px;
  color: #856404;
  font-size: 0.9rem;
}

/* 页脚 */
.settlement-footer {
  padding: 1.5rem 2rem;
  border-top: 2px solid #eee;
  display: flex;
  gap: 1rem;
}

.btn-confirm {
  flex: 1;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-confirm:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

@media (max-width: 600px) {
  .settlement-modal {
    width: 95%;
  }

  .settlement-body {
    padding: 1.5rem;
  }

  .settlement-section {
    padding: 1rem;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .reserve-diagram {
    height: 120px;
  }
}
</style>
