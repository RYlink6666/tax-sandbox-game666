/**
 * WebSocket 客户端服务
 * Phase 4: 前端实时同步
 */

import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../stores/gameStore';
import { usePlayerStore } from '../stores/playerStore';

export interface SocketEvent {
  type: string;
  data: any;
}

class SocketService {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;

  /**
   * 连接到WebSocket服务器
   */
  connect(url: string = 'http://localhost:3001'): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.socket = io(url, {
          reconnection: true,
          reconnectionDelay: this.reconnectDelay,
          reconnectionDelayMax: 10000,
          reconnectionAttempts: this.maxReconnectAttempts,
          transports: ['websocket', 'polling'],
        });

        // 连接成功
        this.socket.on('connect', () => {
          console.log('[Socket] 已连接到服务器');
          this.connected = true;
          this.reconnectAttempts = 0;
          resolve(true);
        });

        // 连接失败
        this.socket.on('connect_error', (error: any) => {
          console.error('[Socket] 连接错误:', error);
          if (this.reconnectAttempts === 0) {
            resolve(false);
          }
        });

        // 断开连接
        this.socket.on('disconnect', () => {
          console.log('[Socket] 已断开连接');
          this.connected = false;
        });

        // 设置事件监听
        this.setupEventListeners();
      } catch (error) {
        console.error('[Socket] 连接异常:', error);
        resolve(false);
      }
    });
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // 玩家加入事件
    this.socket.on('player_joined', (data) => {
      console.log('[Socket] 玩家加入:', data);
      const gameStore = useGameStore();
      gameStore.setRoomPlayers(data.players);
    });

    // 玩家离开事件
    this.socket.on('player_left', (data) => {
      console.log('[Socket] 玩家离开:', data);
      const gameStore = useGameStore();
      gameStore.setRoomPlayers(data.remainingPlayers);
    });

    // 玩家断开连接
    this.socket.on('player_disconnected', (data) => {
      console.log('[Socket] 玩家断开连接:', data);
      const gameStore = useGameStore();
      gameStore.setRoomPlayers(data.remainingPlayers);
    });

    // 游戏开始事件
    this.socket.on('game_started', (data) => {
      console.log('[Socket] 游戏开始');
      const gameStore = useGameStore();
      gameStore.setGameStatus('playing');
      gameStore.setCurrentTurn(data.currentTurn);
    });

    // 游戏结束事件
    this.socket.on('game_ended', (data) => {
      console.log('[Socket] 游戏结束');
      const gameStore = useGameStore();
      gameStore.setGameStatus('finished');
    });

    // 掷骰子结果
    this.socket.on('dice_rolled', (data) => {
      console.log('[Socket] 掷骰子结果:', data);
      const gameStore = useGameStore();
      gameStore.setLastDiceResult(data.result);
      gameStore.notifyDiceRoll(data);
    });

    // 决策提交事件
    this.socket.on('decision_made', (data) => {
      console.log('[Socket] 决策提交:', data);
      const playerStore = usePlayerStore();
      playerStore.recordDecision(data);
    });

    // 年度结算事件
    this.socket.on('annual_settled', (data) => {
      console.log('[Socket] 年度结算完成');
      const gameStore = useGameStore();
      gameStore.setCurrentYear(data.currentYear);
    });

    // 游戏状态更新
    this.socket.on('state_updated', (data) => {
      console.log('[Socket] 游戏状态更新');
      const gameStore = useGameStore();
      gameStore.updateGameState(data);
    });

    // 回合切换
    this.socket.on('turn_changed', (data) => {
      console.log('[Socket] 回合切换:', data.newTurn);
      const gameStore = useGameStore();
      gameStore.setCurrentTurn(data.newTurn);
    });

    // 消息接收
    this.socket.on('message_received', (data) => {
      console.log('[Socket] 收到消息:', data.message);
      const gameStore = useGameStore();
      gameStore.addChatMessage(data);
    });
  }

  /**
   * 创建房间
   */
  createRoom(hostId: string, roomName: string): Promise<any> {
    return this.emit('create_room', {
      hostId,
      roomName,
    });
  }

  /**
   * 加入房间
   */
  joinRoom(roomId: string, playerId: string, playerName: string): Promise<any> {
    return this.emit('join_room', {
      roomId,
      playerId,
      playerName,
    });
  }

  /**
   * 获取房间列表
   */
  listRooms(): Promise<any> {
    return this.emit('list_rooms', {});
  }

  /**
   * 开始游戏
   */
  startGame(roomId: string, hostId: string): Promise<any> {
    return this.emit('start_game', {
      roomId,
      hostId,
    });
  }

  /**
   * 提交决策
   */
  makeDecision(data: any): Promise<any> {
    return this.emit('make_decision', data);
  }

  /**
   * 掷骰子
   */
  rollDice(data: any): Promise<any> {
    return this.emit('roll_dice', data);
  }

  /**
   * 年度结算
   */
  annualSettle(data: any): Promise<any> {
    return this.emit('annual_settle', data);
  }

  /**
   * 发送聊天消息
   */
  sendMessage(message: string): Promise<any> {
    return this.emit('send_message', { message });
  }

  /**
   * 离开房间
   */
  leaveRoom(playerId: string): Promise<any> {
    return this.emit('leave_room', { playerId });
  }

  /**
   * 心跳检测
   */
  ping(): Promise<any> {
    return this.emit('ping', {});
  }

  /**
   * 发送事件
   */
  private emit(event: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.connected) {
        reject(new Error('Socket未连接'));
        return;
      }

      this.socket.emit(event, data, (response: any) => {
        if (response?.success === false) {
          reject(new Error(response?.message || '操作失败'));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
    }
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.connected && (this.socket?.connected || false);
  }

  /**
   * 重新连接
   */
  reconnect(): Promise<boolean> {
    if (this.socket) {
      this.socket.connect();
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(this.isConnected());
        }, 3000);

        this.socket?.once('connect', () => {
          clearTimeout(timeout);
          resolve(true);
        });
      });
    }
    return Promise.resolve(false);
  }

  /**
   * 获取socket实例
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

export default new SocketService();
