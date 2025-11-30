/**
 * 游戏实时同步管理器
 * Phase 4: 多人游戏状态同步
 */

import RoomManager, { GameRoom } from './RoomManager';

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

export interface StateSnapshot {
  roomId: string;
  timestamp: Date;
  gameState: any;
  playersState: any[];
  currentTurn: string;
}

class GameSyncManager {
  private syncHistory: Map<string, StateSnapshot[]> = new Map(); // roomId -> 状态历史
  private lastSyncTime: Map<string, Date> = new Map(); // roomId -> 最后同步时间
  private conflictLog: any[] = []; // 冲突日志

  /**
   * 获取玩家的完整同步状态
   */
  getSyncState(roomId: string, playerId: string): SyncState | null {
    const room = RoomManager.getRoom(roomId);
    if (!room) return null;

    const player = room.players.find((p) => p.playerId === playerId);
    if (!player) return null;

    return {
      roomId,
      playerId,
      playerName: player.playerName,
      currentYear: room.gameState?.currentYear || 1,
      currentTurn: room.currentTurn,
      isMyTurn: room.currentTurn === playerId,
      gameState: room.gameState,
      players: room.players.map((p) => ({
        playerId: p.playerId,
        playerName: p.playerName,
        status: p.status,
        isHost: p.isHost,
      })),
      timestamp: new Date(),
    };
  }

  /**
   * 同步玩家数据（如指标值）
   */
  syncPlayerData(
    roomId: string,
    playerId: string,
    playerData: {
      cash?: number;
      compliance?: number;
      risk?: number;
      transparency?: number;
      riskTolerance?: number;
      position?: number;
      year?: number;
    }
  ): boolean {
    const room = RoomManager.getRoom(roomId);
    if (!room) return false;

    // 更新房间游戏状态中的玩家数据
    if (!room.gameState.playersData) {
      room.gameState.playersData = {};
    }

    if (!room.gameState.playersData[playerId]) {
      room.gameState.playersData[playerId] = {};
    }

    room.gameState.playersData[playerId] = {
      ...room.gameState.playersData[playerId],
      ...playerData,
      updatedAt: new Date(),
    };

    room.updatedAt = new Date();
    this.recordSnapshot(roomId, room);

    return true;
  }

  /**
   * 同步决策历史
   */
  recordDecision(
    roomId: string,
    playerId: string,
    decision: {
      year: number;
      gridPosition: number;
      gridType: string;
      choice: string;
      effects: any;
    }
  ): boolean {
    const room = RoomManager.getRoom(roomId);
    if (!room) return false;

    if (!room.gameState.decisions) {
      room.gameState.decisions = [];
    }

    room.gameState.decisions.push({
      playerId,
      playerName: room.players.find((p) => p.playerId === playerId)?.playerName,
      ...decision,
      timestamp: new Date(),
    });

    room.updatedAt = new Date();
    this.recordSnapshot(roomId, room);

    return true;
  }

  /**
   * 同步审计结果
   */
  recordAudit(
    roomId: string,
    playerId: string,
    auditResult: {
      year: number;
      triggered: boolean;
      severity?: string;
      penaltyAmount?: number;
      violations?: any[];
    }
  ): boolean {
    const room = RoomManager.getRoom(roomId);
    if (!room) return false;

    if (!room.gameState.audits) {
      room.gameState.audits = [];
    }

    room.gameState.audits.push({
      playerId,
      playerName: room.players.find((p) => p.playerId === playerId)?.playerName,
      ...auditResult,
      timestamp: new Date(),
    });

    room.updatedAt = new Date();
    this.recordSnapshot(roomId, room);

    return true;
  }

  /**
   * 同步年度结算结果
   */
  recordSettlement(
    roomId: string,
    playerId: string,
    settlementData: {
      year: number;
      totalIncome: number;
      taxAmount: number;
      flowType: string;
      finalBalance: number;
    }
  ): boolean {
    const room = RoomManager.getRoom(roomId);
    if (!room) return false;

    if (!room.gameState.settlements) {
      room.gameState.settlements = [];
    }

    room.gameState.settlements.push({
      playerId,
      playerName: room.players.find((p) => p.playerId === playerId)?.playerName,
      ...settlementData,
      timestamp: new Date(),
    });

    room.updatedAt = new Date();
    this.recordSnapshot(roomId, room);

    return true;
  }

  /**
   * 获取玩家的决策历史
   */
  getPlayerDecisions(roomId: string, playerId: string): any[] {
    const room = RoomManager.getRoom(roomId);
    if (!room || !room.gameState.decisions) return [];

    return room.gameState.decisions.filter((d: any) => d.playerId === playerId);
  }

  /**
   * 获取玩家的审计历史
   */
  getPlayerAudits(roomId: string, playerId: string): any[] {
    const room = RoomManager.getRoom(roomId);
    if (!room || !room.gameState.audits) return [];

    return room.gameState.audits.filter((a: any) => a.playerId === playerId);
  }

  /**
   * 获取玩家的结算历史
   */
  getPlayerSettlements(roomId: string, playerId: string): any[] {
    const room = RoomManager.getRoom(roomId);
    if (!room || !room.gameState.settlements) return [];

    return room.gameState.settlements.filter((s: any) => s.playerId === playerId);
  }

  /**
   * 验证状态一致性
   */
  validateStateConsistency(roomId: string): { valid: boolean; errors: string[] } {
    const room = RoomManager.getRoom(roomId);
    const errors: string[] = [];

    if (!room) {
      return { valid: false, errors: ['房间不存在'] };
    }

    // 检查当前回合的玩家是否存在
    if (!room.players.find((p) => p.playerId === room.currentTurn)) {
      errors.push(`当前回合玩家 ${room.currentTurn} 不在房间中`);
    }

    // 检查年份范围
    if ((room.gameState?.currentYear || 1) < 1 || (room.gameState?.currentYear || 1) > 20) {
      errors.push(`年份越界: ${room.gameState?.currentYear}`);
    }

    // 检查玩家数据完整性
    if (room.gameState?.playersData) {
      for (const playerId of Object.keys(room.gameState.playersData)) {
        if (!room.players.find((p) => p.playerId === playerId)) {
          errors.push(`玩家数据中存在不在房间中的玩家: ${playerId}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 解决状态冲突（简单策略：服务器状态优先）
   */
  resolveConflict(
    roomId: string,
    clientState: any,
    serverState: any
  ): any {
    const conflict = {
      roomId,
      clientState,
      serverState,
      resolvedAt: new Date(),
      strategy: 'server_priority',
    };

    this.conflictLog.push(conflict);

    // 保持历史记录在可控范围
    if (this.conflictLog.length > 1000) {
      this.conflictLog.shift();
    }

    // 服务器状态优先
    return serverState;
  }

  /**
   * 获取冲突日志
   */
  getConflictLog(): any[] {
    return this.conflictLog;
  }

  /**
   * 记录状态快照
   */
  private recordSnapshot(roomId: string, room: GameRoom): void {
    const snapshot: StateSnapshot = {
      roomId,
      timestamp: new Date(),
      gameState: JSON.parse(JSON.stringify(room.gameState)),
      playersState: room.players.map((p) => ({
        playerId: p.playerId,
        playerName: p.playerName,
        status: p.status,
      })),
      currentTurn: room.currentTurn,
    };

    if (!this.syncHistory.has(roomId)) {
      this.syncHistory.set(roomId, []);
    }

    const history = this.syncHistory.get(roomId)!;
    history.push(snapshot);

    // 保持历史大小在可控范围（最近100条）
    if (history.length > 100) {
      history.shift();
    }

    this.lastSyncTime.set(roomId, new Date());
  }

  /**
   * 获取房间的状态历史
   */
  getStateHistory(roomId: string, limit: number = 20): StateSnapshot[] {
    const history = this.syncHistory.get(roomId) || [];
    return history.slice(-limit);
  }

  /**
   * 清空房间数据（游戏结束时）
   */
  clearRoomData(roomId: string): void {
    this.syncHistory.delete(roomId);
    this.lastSyncTime.delete(roomId);
  }

  /**
   * 获取房间的最后同步时间
   */
  getLastSyncTime(roomId: string): Date | null {
    return this.lastSyncTime.get(roomId) || null;
  }
}

export default new GameSyncManager();
