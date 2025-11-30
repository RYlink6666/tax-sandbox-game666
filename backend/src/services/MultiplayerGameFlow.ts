/**
 * 多人游戏流程管理
 * Phase 4: 集成决策、审计、结算全流程
 */

import RoomManager from './RoomManager';
import GameSyncManager from './GameSyncManager';
import TurnController from './TurnController';

export interface GameFlowEvent {
  type: 'decision_made' | 'audit_triggered' | 'settlement_completed' | 'year_advanced' | 'game_ended';
  roomId: string;
  playerId: string;
  data: any;
  timestamp: Date;
}

class MultiplayerGameFlow {
  private gameEvents: Map<string, GameFlowEvent[]> = new Map(); // roomId -> events
  private ruleEngine: any; // 会在constructor中注入

  constructor() {
    // 延迟导入避免循环依赖
    this.initRuleEngine();
  }

  private initRuleEngine() {
    try {
      // 动态导入RuleEngine
      // const { default } = require('../services/RuleEngine');
      // this.ruleEngine = default;
    } catch (error) {
      console.warn('[MultiplayerGameFlow] RuleEngine尚未初始化');
    }
  }

  /**
   * 处理玩家决策
   */
  async processDecision(
    roomId: string,
    playerId: string,
    decision: {
      year: number;
      gridPosition: number;
      gridType: string;
      choice: string;
    }
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    const room = RoomManager.getRoom(roomId);
    if (!room) {
      return { success: false, error: '房间不存在' };
    }

    // 验证决策权限
    const canDecide = TurnController.canMakeDecision(roomId, playerId);
    if (!canDecide.allowed) {
      return { success: false, error: canDecide.reason };
    }

    // 记录决策到轮流控制器
    const recorded = TurnController.recordDecision(roomId, playerId, decision);
    if (!recorded) {
      return { success: false, error: '无法记录决策' };
    }

    // 同步决策到游戏状态
    const syncSuccess = GameSyncManager.recordDecision(roomId, playerId, decision);
    if (!syncSuccess) {
      return { success: false, error: '同步决策失败' };
    }

    // 更新玩家数据（模拟效果计算）
    const effectResult = this.calculateDecisionEffect(decision);

    GameSyncManager.syncPlayerData(roomId, playerId, effectResult);

    // 记录事件
    this.recordEvent(roomId, {
      type: 'decision_made',
      roomId,
      playerId,
      data: {
        decision,
        effects: effectResult,
      },
      timestamp: new Date(),
    });

    return {
      success: true,
      result: {
        decision,
        effects: effectResult,
      },
    };
  }

  /**
   * 计算决策效果（简化版）
   */
  private calculateDecisionEffect(decision: any): any {
    const effectMap: Record<string, any> = {
      procurement: {
        A: { cash: -5, compliance: 10, transparency: 12, risk: 0 },
        B: { cash: 50000, compliance: -3, transparency: -8, risk: 15 },
        C: { cash: 200000, compliance: -15, transparency: 0, risk: 50 },
        D: { cash: 30000, compliance: -2, transparency: -5, risk: 10 },
        E: { cash: 0, compliance: 0, transparency: 0, risk: 8 },
      },
      sales: {
        A: { cash: 0, compliance: 8, transparency: 12, risk: 0 },
        B: { cash: 300000, compliance: -12, transparency: -15, risk: 45 },
        // ... 更多选项
      },
    };

    const effect = effectMap[decision.gridType]?.[decision.choice] || {
      cash: 0,
      compliance: 0,
      transparency: 0,
      risk: 0,
    };

    return effect;
  }

  /**
   * 处理年度结算
   */
  async processAnnualSettlement(
    roomId: string,
    playerId: string
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    const room = RoomManager.getRoom(roomId);
    if (!room) {
      return { success: false, error: '房间不存在' };
    }

    // 验证权限
    const canSettle = TurnController.canAnnualSettle(roomId, playerId);
    if (!canSettle.allowed) {
      return { success: false, error: canSettle.reason };
    }

    const currentYear = room.gameState?.currentYear || 1;
    const playerData = room.gameState?.playersData?.[playerId] || {};

    // 计算结算数据（简化版）
    const settlementData = {
      year: currentYear,
      totalIncome: 5000000, // 示例收入
      taxableIncome: 5000000,
      taxRate: 0.38,
      taxAmount: 1900000,
      flowType: 'gray',
      finalBalance: playerData.cash ? playerData.cash - 1900000 : 3100000,
    };

    // 记录结算
    TurnController.recordSettlement(roomId, playerId, settlementData);
    GameSyncManager.recordSettlement(roomId, playerId, settlementData);

    // 更新玩家数据
    GameSyncManager.syncPlayerData(roomId, playerId, {
      cash: settlementData.finalBalance,
      year: currentYear,
    });

    // 记录事件
    this.recordEvent(roomId, {
      type: 'settlement_completed',
      roomId,
      playerId,
      data: settlementData,
      timestamp: new Date(),
    });

    return {
      success: true,
      result: settlementData,
    };
  }

  /**
   * 处理审计触发
   */
  async processAudit(
    roomId: string,
    playerId: string,
    auditData: {
      year: number;
      triggered: boolean;
      severity?: string;
      penaltyAmount?: number;
      violations?: any[];
    }
  ): Promise<{ success: boolean; result?: any }> {
    const room = RoomManager.getRoom(roomId);
    if (!room) {
      return { success: false };
    }

    // 记录审计
    GameSyncManager.recordAudit(roomId, playerId, auditData);

    // 如果有罚款，更新玩家现金
    if (auditData.penaltyAmount) {
      const playerData = room.gameState?.playersData?.[playerId] || {};
      GameSyncManager.syncPlayerData(roomId, playerId, {
        cash: (playerData.cash || 0) - auditData.penaltyAmount,
      });
    }

    // 记录事件
    this.recordEvent(roomId, {
      type: 'audit_triggered',
      roomId,
      playerId,
      data: auditData,
      timestamp: new Date(),
    });

    return {
      success: true,
      result: auditData,
    };
  }

  /**
   * 推进到下一年
   */
  async advanceYear(roomId: string): Promise<{ success: boolean; newYear?: number; error?: string }> {
    const room = RoomManager.getRoom(roomId);
    if (!room) {
      return { success: false, error: '房间不存在' };
    }

    const currentYear = room.gameState?.currentYear || 1;

    // 检查是否已到最后一年
    if (currentYear >= 20) {
      return { success: false, error: '游戏已结束' };
    }

    const newYear = currentYear + 1;

    // 更新游戏状态
    RoomManager.updateGameState(roomId, {
      currentYear: newYear,
      turnCount: 0,
    });

    // 重置所有玩家的年度标记
    if (room.gameState?.playersData) {
      for (const playerId of Object.keys(room.gameState.playersData)) {
        GameSyncManager.syncPlayerData(roomId, playerId, {
          settledThisYear: false,
        });
      }
    }

    // 记录事件
    this.recordEvent(roomId, {
      type: 'year_advanced',
      roomId,
      playerId: '',
      data: { newYear },
      timestamp: new Date(),
    });

    return {
      success: true,
      newYear,
    };
  }

  /**
   * 检查游戏是否结束
   */
  checkGameEnd(roomId: string): {
    ended: boolean;
    reason?: string;
    winners?: string[];
  } {
    const room = RoomManager.getRoom(roomId);
    if (!room) {
      return { ended: true, reason: '房间不存在' };
    }

    const currentYear = room.gameState?.currentYear || 1;

    // 检查是否已到第20年
    if (currentYear >= 20) {
      // 计算赢家（最高现金或评分）
      let maxCash = -Infinity;
      const winners: string[] = [];

      if (room.gameState?.playersData) {
        for (const playerId of Object.keys(room.gameState.playersData)) {
          const playerData = room.gameState.playersData[playerId];
          const playerCash = playerData.cash || 0;

          if (playerCash > maxCash) {
            maxCash = playerCash;
            winners.length = 0;
            winners.push(playerId);
          } else if (playerCash === maxCash && playerCash > -Infinity) {
            winners.push(playerId);
          }
        }
      }

      return {
        ended: true,
        reason: '已完成20年游戏',
        winners,
      };
    }

    // 检查是否有玩家破产
    if (room.gameState?.playersData) {
      for (const playerId of Object.keys(room.gameState.playersData)) {
        const playerData = room.gameState.playersData[playerId];
        if (playerData.cash < 0) {
          return {
            ended: false, // 不立即结束，允许继续
            reason: `玩家 ${playerId} 已破产`,
          };
        }
      }
    }

    return { ended: false };
  }

  /**
   * 结束游戏
   */
  async endGame(roomId: string): Promise<{ success: boolean; gameStats?: any }> {
    const room = RoomManager.getRoom(roomId);
    if (!room) {
      return { success: false };
    }

    // 计算最终统计
    const gameStats = this.calculateGameStats(roomId);

    // 更新房间状态
    RoomManager.endGame(roomId);

    // 清理数据
    TurnController.clearRoomData(roomId);
    GameSyncManager.clearRoomData(roomId);

    // 记录事件
    this.recordEvent(roomId, {
      type: 'game_ended',
      roomId,
      playerId: '',
      data: gameStats,
      timestamp: new Date(),
    });

    return {
      success: true,
      gameStats,
    };
  }

  /**
   * 计算游戏统计数据
   */
  private calculateGameStats(roomId: string): any {
    const room = RoomManager.getRoom(roomId);
    if (!room) return null;

    const playerStats = room.players.map((player) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      finalCash: room.gameState?.playersData?.[player.playerId]?.cash || 0,
      decisions: GameSyncManager.getPlayerDecisions(roomId, player.playerId).length,
      audits: GameSyncManager.getPlayerAudits(roomId, player.playerId).length,
      totalPenalties: GameSyncManager.getPlayerAudits(roomId, player.playerId).reduce(
        (sum, audit) => sum + (audit.penaltyAmount || 0),
        0
      ),
    }));

    return {
      roomId,
      totalTurns: room.gameState?.turnCount || 0,
      finalYear: room.gameState?.currentYear || 1,
      playerStats,
      endTime: new Date(),
    };
  }

  /**
   * 获取游戏事件日志
   */
  getGameEvents(roomId: string, limit: number = 100): GameFlowEvent[] {
    const events = this.gameEvents.get(roomId) || [];
    return events.slice(-limit);
  }

  /**
   * 记录游戏事件
   */
  private recordEvent(roomId: string, event: GameFlowEvent): void {
    if (!this.gameEvents.has(roomId)) {
      this.gameEvents.set(roomId, []);
    }

    const events = this.gameEvents.get(roomId)!;
    events.push(event);

    // 保持历史在可控范围
    if (events.length > 1000) {
      events.shift();
    }
  }

  /**
   * 清理房间事件
   */
  clearRoomEvents(roomId: string): void {
    this.gameEvents.delete(roomId);
  }
}

export default new MultiplayerGameFlow();
