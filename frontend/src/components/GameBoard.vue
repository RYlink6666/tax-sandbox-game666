<template>
  <div class="game-board-wrapper">
    <div class="board-header">
      <h3>🎮 120格棋盘</h3>
      <div class="board-legend">
        <span class="legend-item"><span class="legend-color gray"></span>灰色流(70)</span>
        <span class="legend-item"><span class="legend-color green"></span>合规流(30)</span>
        <span class="legend-item"><span class="legend-color red"></span>违规流(20)</span>
      </div>
    </div>

    <div class="board-scroll-container">
      <div class="board-grid">
        <!-- 20年 × 6格/年 = 120格 -->
        <div v-for="grid in gridList" :key="grid.position" 
             :class="[
               'grid-cell',
               `grid-${grid.position}`,
               getGridClass(grid),
               currentPosition === grid.position ? 'current' : '',
               currentPosition > grid.position ? 'visited' : ''
             ]"
             :title="`格${grid.position} - ${grid.type}`">
          
          <!-- 格子编号 -->
          <div class="grid-number">{{ grid.position }}</div>
          
          <!-- 格子类型图标 -->
          <div class="grid-icon">{{ getGridIcon(grid.type) }}</div>
          
          <!-- 玩家token（如果在这格） -->
          <div v-if="currentPosition === grid.position" class="player-token">
            🎯
          </div>
          
          <!-- 年份标记（每6格一个） -->
          <div v-if="grid.position % 6 === 0" class="year-mark">
            Y{{ grid.position / 6 }}
          </div>
        </div>
      </div>
    </div>

    <div class="board-stats">
      <div class="stat-item">
        <span class="stat-label">当前位置</span>
        <span class="stat-value">{{ currentPosition }}/120</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">当前年份</span>
        <span class="stat-value">{{ Math.ceil(currentPosition / 6) }}/20</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">进度</span>
        <span class="stat-value">{{ Math.round((currentPosition / 120) * 100) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  currentPosition: number;
  grids?: any[];
}

const props = withDefaults(defineProps<Props>(), {
  currentPosition: 1,
  grids: () => []
});

// 生成120个格子
const gridList = computed(() => {
  const grids = [];
  
  for (let i = 1; i <= 120; i++) {
    const type = getGridType(i);
    const layer = getGridLayer(i);
    
    grids.push({
      position: i,
      type,
      layer,
      year: Math.ceil(i / 6)
    });
  }
  
  return grids;
});

// 根据位置确定格子类型
function getGridType(position: number): string {
  const types = ['采购', '销售', '成本', '薪酬', '分配', '融资'];
  return types[(position - 1) % 6];
}

// 根据位置确定所在层级
function getGridLayer(position: number): string {
  // 简化规则：1-70 = 灰色流，71-100 = 合规流，101-120 = 违规流
  if (position <= 70) return 'gray';
  if (position <= 100) return 'green';
  return 'red';
}

// 获取格子CSS类名
function getGridClass(grid: any): string {
  return `grid-${grid.layer}`;
}

// 获取格子图标
function getGridIcon(type: string): string {
  const icons: Record<string, string> = {
    '采购': '🛒',
    '销售': '💰',
    '成本': '📊',
    '薪酬': '👥',
    '分配': '📈',
    '融资': '💳'
  };
  return icons[type] || '📍';
}
</script>

<style scoped>
.game-board-wrapper {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #eee;
}

.board-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}

.board-legend {
  display: flex;
  gap: 1.5rem;
  font-size: 0.9rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #666;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.legend-color.gray {
  background: #ffd700;
}

.legend-color.green {
  background: #4caf50;
}

.legend-color.red {
  background: #f44336;
}

.board-scroll-container {
  overflow-x: auto;
  margin-bottom: 1.5rem;
  border-radius: 8px;
  border: 1px solid #eee;
}

.board-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
  grid-auto-rows: 60px;
  gap: 4px;
  padding: 12px;
  background: #f9f9f9;
  min-width: 100%;
}

.grid-cell {
  position: relative;
  border: 2px solid #ddd;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s;
  overflow: hidden;
  background: white;
  min-width: 60px;
  height: 60px;
}

/* 灰色流 */
.grid-cell.grid-gray {
  background: #fffacd;
  border-color: #ffd700;
}

.grid-cell.grid-gray:hover {
  background: #fff8b5;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
}

/* 合规流 */
.grid-cell.grid-green {
  background: #e8f5e9;
  border-color: #4caf50;
}

.grid-cell.grid-green:hover {
  background: #c8e6c9;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
}

/* 违规流 */
.grid-cell.grid-red {
  background: #ffebee;
  border-color: #f44336;
}

.grid-cell.grid-red:hover {
  background: #ffcdd2;
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
}

/* 当前位置 */
.grid-cell.current {
  border: 3px solid #667eea;
  box-shadow: 0 0 12px rgba(102, 126, 234, 0.5);
  z-index: 10;
  transform: scale(1.05);
}

/* 已访问过 */
.grid-cell.visited {
  opacity: 0.7;
}

.grid-number {
  font-size: 0.7rem;
  font-weight: 600;
  color: #666;
  position: absolute;
  top: 2px;
  left: 2px;
}

.grid-icon {
  font-size: 1.4rem;
  line-height: 1;
}

.player-token {
  position: absolute;
  font-size: 1.6rem;
  animation: bounce 1s infinite;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

@keyframes bounce {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -60%) scale(1.2);
  }
}

.year-mark {
  position: absolute;
  bottom: 2px;
  right: 2px;
  font-size: 0.65rem;
  font-weight: bold;
  color: #f39c12;
  background: rgba(243, 156, 18, 0.1);
  padding: 1px 3px;
  border-radius: 2px;
}

.board-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  padding-top: 1rem;
  border-top: 2px solid #eee;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.stat-label {
  font-size: 0.85rem;
  color: #999;
  font-weight: 500;
}

.stat-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: #667eea;
}

@media (max-width: 768px) {
  .board-grid {
    grid-template-columns: repeat(6, minmax(50px, 1fr));
  }
  
  .grid-cell {
    min-width: 50px;
    height: 50px;
    font-size: 0.65rem;
  }
  
  .grid-icon {
    font-size: 1.2rem;
  }
  
  .board-legend {
    flex-direction: column;
    gap: 0.8rem;
    font-size: 0.85rem;
  }
}
</style>
