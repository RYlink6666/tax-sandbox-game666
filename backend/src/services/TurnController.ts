/**
 * 轮流控制器 - 管理严格的回合制
 * Phase 4: 防止作弊和越界操作
 */

import RoomManager from './RoomManager';
import GameSyncManager from './GameSyncManager';

export interface TurnAction {
  playerId: string;
  action: 'roll_dice' | 'make_decision' | 'annual_settle' | 'skip_turn';
  data: any;
  timestamp: Date;
}

export interface TurnState {
  roomId: string;
  currentPlayer: string;
  diceRolled: boolean;
  decisionMade: boolean;
  turnStartTime: Date;
  actions: TurnAction[];
}

class TurnController {
  private turnStates: Map<string, TurnState> = new Map(); // roomId -> TurnState
  private turnTimeouts: Map<string, NodeJS.Timeout> = new Map(); // roomId -> timeout ID
  private readonly TURN_TIMEOUT = 5 * 60 * 1000; // 5分钟超时
  private readonly ACTION_COOLDOWN = 500; // 500ms操作冷却

  /**
   * 初始化房间的轮流状态
   */
  initializeTurnState(roomId: string): TurnState | null {
    const room = RoomManager.getRoom(roomId);
    if (!room) return null;

    const turnState: TurnState = {
      roomId,
      currentPlayer: room.currentTurn,
      diceRolled: false,
      decisionMade: false,
      turnStartTime: new Date(),
      actions: [],
    };

    this.turnStates.set(roomId, turnState);

    // 设置超时处理
    this.setTurnTimeout(roomId);

    return turnState;
  }

  /**
   * 获取回合状态
   */
  getTurnState(roomId: string): TurnState | null {
    return this.turnStates.get(roomId) || null;
  }

  /**
   * 验证玩家是否可以掷骰子
   */
  canRollDice(roomId: string, playerId: string): { allowed: boolean; reason?: string } {
    const room = RoomManager.getRoom(roomId);
    if (!room) {
      return { allowed: false, reason: '房间不存在' };
    }

    if (room.currentTurn !== playerId) {
      return { allowed: false, reason: '不是你的回合' };
    }

    const turnState = this.turnStates.get(roomId);
    if (!turnState) {
      return { allowed: false, reason: '回合状态未初始化' };
    }

    if (turnState.diceRolled) {
      return { allowed: false, reason: '本回合已掷骰子' };
    }

    return { allowed: true };
  }

  /**
   * 记录掷骰子操作
   */
  recordDiceRoll(roomId: string, playerId: string, result: number): boolean {
    const canRoll = this.canRollDice(roomId, playerId);
    if (!canRoll.allowed) {
      return false;
    }

    const turnState = this.turnStates.get(roomId);
    if (!turnState) return false;

    turnState.diceRolled = true;
    turnState.actions.push({
      playerId,
      action: 'roll_dice',
      data: { result },
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * 验证玩家是否可以做决策
   */
  canMakeDecision(roomId: string, playerId: string): { allowed: boolean; reason?: string } {
    const room = RoomManager.getRoom(roomId);
    if (!room) {
      return { allowed: false, reason: '房间不存在' };
    }

    if (room.currentTurn !== playerId) {
      return { allowed: false, reason: '不是你的回合' };
    }

    const turnState = this.turnStates.get(roomId);
    if (!turnState) {
      return { allowed: false, reason: '回合状态未初始化' };
    }

    if (!turnState.diceRolled) {
      return { allowed: false, reason: '还未掷骰子' };
    }

    if (turnState.decisionMade) {
      return { allowed: false, reason: '本回合已做出决策' };
    }

    return { allowed: true };
  }

  /**
   * 记录决策操作
   */
  recordDecision(roomId: string, playerId: string, decisionData: any): boolean {
    const canDecide = this.canMakeDecision(roomId, playerId);
    if (!canDecide.allowed) {
      return false;
    }

    const turnState = this.turnStates.get(roomId);
    if (!turnState) return false;

    turnState.decisionMade = true;
    turnState.actions.push({
      playerId,
      action: 'make_decision',
      data: decisionData,
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * 验证玩家是否可以进行年度结算
   */
  canAnnualSettle(roomId: string, playerId: string): { allowed: boolean; reason?: string } {
    const room = RoomManager.getRoom(roomId);
    if (!room) {
      return { allowed: false, reason: '房间不存在' };
    }

    const turnState = this.turnStates.get(roomId);
    if (!turnState) {
      return { allowed: false, reason: '回合状态未初始化' };
    }

    // 年度结算可以在任何时间进行（不限制只有当前玩家）
    // 但需要确认所有玩家都已完成本年的操作
    const allPlayersCompleted = room.players.every((p) => {
      const playerData = room.gameState?.playersData?.[p.playerId];
      return playerData?.settledThisYear === true || p.playerId === playerId;
    });

    if (!allPlayersCompleted) {
      return { allowed: false, reason: '还有玩家未完成操作' };
    }

    return { allowed: true };
  }

  /**
   * 记录年度结算操作
   */
  recordSettlement(roomId: string, playerId: string, settlementData: any): boolean {
    const canSettle = this.canAnnualSettle(roomId, playerId);
    if (!canSettle.allowed) {
      return false;
    }

    const turnState = this.turnStates.get(roomId);
    if (!turnState) return false;

    turnState.actions.push({
      playerId,
      action: 'annual_settle',
      data: settlementData,
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * 进行下一个回合
   */
  nextTurn(roomId: string, currentPlayerId: string): { success: boolean; nextPlayer?: string; reason?: string } {
    const room = RoomManager.getRoom(roomId);
    if (!room) {
      return { success: false, reason: '房间不存在' };
    }

    if (room.currentTurn !== currentPlayerId) {
      return { success: false, reason: '当前不是你的回合' };
    }

    const turnState = this.turnStates.get(roomId);
    if (!turnState) {
      return { success: false, reason: '回合状态未初始化' };
    }

    // 验证本回合的操作是否完整
    if (!turnState.diceRolled || !turnState.decisionMade) {
      return { success: false, reason: '本回合操作未完成' };
    }

    // 切换到下一个玩家
    const nextPlayer = RoomManager.nextTurn(roomId);
    if (!nextPlayer) {
      return { success: false, reason: '无法切换到下一个玩家' };
    }

    // 重置回合状态
    const newTurnState: TurnState = {
      roomId,
      currentPlayer: nextPlayer,
      diceRolled: false,
      decisionMade: false,
      turnStartTime: new Date(),
      actions: [],
    };

    this.turnStates.set(roomId, newTurnState);

    // 重新设置超时
    this.clearTurnTimeout(roomId);
    this.setTurnTimeout(roomId);

    return { success: true, nextPlayer };
  }

  /**
   * 跳过当前回合（超时或玩家主动）
   */
  skipTurn(roomId: string): { success: boolean; nextPlayer?: string; reason?: string } {
    const room = RoomManager.getRoom(roomId);
    if (!room) {
      return { success: false, reason: '房间不存在' };
    }

    const turnState = this.turnStates.get(roomId);
    if (!turnState) {
      return { success: false, reason: '回合状态未初始化' };
    }

    // 记录跳过操作
    turnState.actions.push({
      playerId: room.currentTurn,
      action: 'skip_turn',
      data: { reason: '超时或主动跳过' },
      timestamp: new Date(),
    });

    // 切换到下一个玩家
    const nextPlayer = RoomManager.nextTurn(roomId);
    if (!nextPlayer) {
      return { success: false, reason: '无法切换到下一个玩家' };
    }

    // 重置回合状态
    const newTurnState: TurnState = {
      roomId,
      currentPlayer: nextPlayer,
      diceRolled: false,
      decisionMade: false,
      turnStartTime: new Date(),
      actions: [],
    };

    this.turnStates.set(roomId, newTurnState);

    // 重新设置超时
    this.clearTurnTimeout(roomId);
    this.setTurnTimeout(roomId);

    return { success: true, nextPlayer };
  }

  /**
   * 获取回合的操作记录
   */
  getTurnActions(roomId: string): TurnAction[] {
    const turnState = this.turnStates.get(roomId);
    return turnState?.actions || [];
  }

  /**
   * 获取回合剩余时间（毫秒）
   */
  getTurnRemainingTime(roomId: string): number {
    const turnState = this.turnStates.get(roomId);
    if (!turnState) return 0;

    const elapsed = Date.now() - turnState.turnStartTime.getTime();
    const remaining = Math.max(0, this.TURN_TIMEOUT - elapsed);

    return remaining;
  }

  /**
   * 设置回合超时处理
   */
  private setTurnTimeout(roomId: string): void {
    const timeout = setTimeout(() => {
      console.log(`[TurnController] 房间 ${roomId} 回合超时，自动跳过`);
      this.skipTurn(roomId);

      // 通知所有玩家（由WebSocket处理）
    }, this.TURN_TIMEOUT);

    this.turnTimeouts.set(roomId, timeout);
  }

  /**
   * 清除回合超时
   */
  private clearTurnTimeout(roomId: string): void {
    const timeout = this.turnTimeouts.get(roomId);
    if (timeout) {
      clearTimeout(timeout);
      this.turnTimeouts.delete(roomId);
    }
  }

  /**
   * 验证操作频率（防止刷屏）
   */
  validateActionFrequency(roomId: string, playerId: string): { allowed: boolean; cooldownRemaining?: number } {
    const turnState = this.turnStates.get(roomId);
    if (!turnState) {
      return { allowed: false };
    }

    const lastAction = turnState.actions[turnState.actions.length - 1];
    if (!lastAction) {
      return { allowed: true };
    }

    const timeSinceLastAction = Date.now() - lastAction.timestamp.getTime();
    if (timeSinceLastAction < this.ACTION_COOLDOWN) {
      return {
        allowed: false,
        cooldownRemaining: this.ACTION_COOLDOWN - timeSinceLastAction,
      };
    }

    return { allowed: true };
  }

  /**
   * 清理房间数据（游戏结束时）
   */
  clearRoomData(roomId: string): void {
    this.turnStates.delete(roomId);
    this.clearTurnTimeout(roomId);
  }
}

export default new TurnController();
