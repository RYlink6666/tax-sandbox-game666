/**
 * 游戏同步服务 - 前端同步和状态管理
 * Phase 4: 实时状态同步
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/sync';

export interface SyncState {
  roomId: string;
  playerId: string;
  playerName: string;
  currentYear: number;
  currentTurn: string;
  isMyTurn: boolean;
  gameState: any;
  players: any[];
  timestamp: Date;
}

export interface TurnState {
  roomId: string;
  currentPlayer: string;
  diceRolled: boolean;
  decisionMade: boolean;
  turnStartTime: Date;
  remainingTime: number;
  actions: any[];
}

class GameSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_FREQUENCY = 1000; // 1秒同步一次

  /**
   * 获取玩家的同步状态
   */
  async getSyncState(roomId: string, playerId: string): Promise<SyncState> {
    try {
      const response = await axios.get(`${API_BASE}/state/${roomId}/${playerId}`);
      if (response.data.success) {
        return response.data.state;
      }
      throw new Error(response.data.message);
    } catch (error) {
      console.error('[GameSync] 获取同步状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取房间的回合状态
   */
  async getTurnState(roomId: string): Promise<TurnState> {
    try {
      const response = await axios.get(`${API_BASE}/turn/${roomId}`);
      if (response.data.success) {
        return response.data.turn;
      }
      throw new Error(response.data.message);
    } catch (error) {
      console.error('[GameSync] 获取回合状态失败:', error);
      throw error;
    }
  }

  /**
   * 提交决策
   */
  async submitDecision(
    roomId: string,
    playerId: string,
    decision: {
      year: number;
      gridPosition: number;
      gridType: string;
      choice: string;
    }
  ): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE}/decision`, {
        roomId,
        playerId,
        decision,
      });

      if (response.data.success) {
        return response.data.result;
      }
      throw new Error(response.data.message);
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('操作过于频繁，请稍候');
      }
      console.error('[GameSync] 提交决策失败:', error);
      throw error;
    }
  }

  /**
   * 进行年度结算
   */
  async annualSettle(roomId: string, playerId: string): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE}/annual-settle`, {
        roomId,
        playerId,
      });

      if (response.data.success) {
        return response.data.settlement;
      }
      throw new Error(response.data.message);
    } catch (error) {
      console.error('[GameSync] 年度结算失败:', error);
      throw error;
    }
  }

  /**
   * 进行下一个回合
   */
  async nextTurn(roomId: string, playerId: string): Promise<string> {
    try {
      const response = await axios.post(`${API_BASE}/next-turn`, {
        roomId,
        playerId,
      });

      if (response.data.success) {
        return response.data.nextPlayer;
      }
      throw new Error(response.data.reason);
    } catch (error) {
      console.error('[GameSync] 切换回合失败:', error);
      throw error;
    }
  }

  /**
   * 推进到下一年
   */
  async advanceYear(roomId: string): Promise<number> {
    try {
      const response = await axios.post(`${API_BASE}/advance-year`, {
        roomId,
      });

      if (response.data.success) {
        return response.data.newYear;
      }
      throw new Error(response.data.message);
    } catch (error) {
      console.error('[GameSync] 推进年份失败:', error);
      throw error;
    }
  }

  /**
   * 获取玩家的决策历史
   */
  async getDecisionHistory(roomId: string, playerId: string): Promise<any[]> {
    try {
      const response = await axios.get(`${API_BASE}/decisions/${roomId}/${playerId}`);
      if (response.data.success) {
        return response.data.decisions;
      }
      throw new Error(response.data.message);
    } catch (error) {
      console.error('[GameSync] 获取决策历史失败:', error);
      throw error;
    }
  }

  /**
   * 验证状态一致性
   */
  async validateConsistency(roomId: string): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const response = await axios.get(`${API_BASE}/consistency/${roomId}`);
      return {
        valid: response.data.consistent,
        errors: response.data.errors,
      };
    } catch (error) {
      console.error('[GameSync] 验证状态一致性失败:', error);
      throw error;
    }
  }

  /**
   * 获取游戏事件日志
   */
  async getGameEvents(roomId: string, limit: number = 50): Promise<any[]> {
    try {
      const response = await axios.get(`${API_BASE}/events/${roomId}`, {
        params: { limit },
      });

      if (response.data.success) {
        return response.data.events;
      }
      throw new Error(response.data.message);
    } catch (error) {
      console.error('[GameSync] 获取事件日志失败:', error);
      throw error;
    }
  }

  /**
   * 检查游戏是否结束
   */
  async checkGameEnd(roomId: string): Promise<{
    ended: boolean;
    reason?: string;
    winners?: string[];
  }> {
    try {
      const response = await axios.post(`${API_BASE}/check-end`, {
        roomId,
      });

      if (response.data.success) {
        return {
          ended: response.data.ended,
          reason: response.data.reason,
          winners: response.data.winners,
        };
      }
      throw new Error(response.data.message);
    } catch (error) {
      console.error('[GameSync] 检查游戏结束失败:', error);
      throw error;
    }
  }

  /**
   * 结束游戏
   */
  async endGame(roomId: string): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE}/end-game`, {
        roomId,
      });

      if (response.data.success) {
        return response.data.gameStats;
      }
      throw new Error(response.data.message);
    } catch (error) {
      console.error('[GameSync] 结束游戏失败:', error);
      throw error;
    }
  }

  /**
   * 开始定期同步
   */
  startPeriodicSync(
    roomId: string,
    playerId: string,
    onSync: (state: SyncState) => void
  ): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      try {
        const state = await this.getSyncState(roomId, playerId);
        onSync(state);
      } catch (error) {
        console.warn('[GameSync] 定期同步失败:', error);
      }
    }, this.SYNC_FREQUENCY);
  }

  /**
   * 停止定期同步
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

export default new GameSyncService();
