/**
 * WebSocket 游戏通信处理
 * Phase 4: 实时多人同步
 */

import { Server as HTTPServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import RoomManager, { GameRoom } from '../services/RoomManager';

interface SocketData {
  playerId?: string;
  playerName?: string;
  roomId?: string;
}

export class GameSocket {
  private io: IOServer;
  private userSockets: Map<string, string> = new Map(); // playerId -> socketId

  constructor(httpServer: HTTPServer) {
    this.io = new IOServer(httpServer, {
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
        methods: ['GET', 'POST'],
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[WebSocket] 新连接: ${socket.id}`);

      // 加入房间事件
      socket.on('join_room', (data: { playerId: string; playerName: string; roomId: string }, callback) => {
        this.handleJoinRoom(socket, data, callback);
      });

      // 创建房间事件
      socket.on('create_room', (data: { hostId: string; roomName: string }, callback) => {
        this.handleCreateRoom(socket, data, callback);
      });

      // 获取可用房间列表
      socket.on('list_rooms', (callback) => {
        this.handleListRooms(callback);
      });

      // 开始游戏事件
      socket.on('start_game', (data: { roomId: string; hostId: string }, callback) => {
        this.handleStartGame(socket, data, callback);
      });

      // 游戏决策事件
      socket.on('make_decision', (data: any, callback) => {
        this.handleMakeDecision(socket, data, callback);
      });

      // 掷骰子事件
      socket.on('roll_dice', (data: any, callback) => {
        this.handleRollDice(socket, data, callback);
      });

      // 年度结算事件
      socket.on('annual_settle', (data: any, callback) => {
        this.handleAnnualSettle(socket, data, callback);
      });

      // 消息事件（用于玩家间通信）
      socket.on('send_message', (data: { message: string }, callback) => {
        this.handleSendMessage(socket, data, callback);
      });

      // 离开房间事件
      socket.on('leave_room', (data: { playerId: string }, callback) => {
        this.handleLeaveRoom(socket, data, callback);
      });

      // 断开连接事件
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // 心跳检测
      socket.on('ping', (callback) => {
        callback({ pong: true, timestamp: Date.now() });
      });
    });
  }

  /**
   * 处理加入房间
   */
  private handleJoinRoom(
    socket: Socket,
    data: { playerId: string; playerName: string; roomId: string },
    callback: Function
  ): void {
    const { playerId, playerName, roomId } = data;

    const room = RoomManager.joinRoom(roomId, playerId, playerName);
    if (!room) {
      callback({ success: false, message: '房间不存在或已满' });
      return;
    }

    // 保存socket映射
    this.userSockets.set(playerId, socket.id);
    RoomManager.updatePlayerSocket(playerId, socket.id);

    // 加入socket.io房间
    socket.join(`room_${roomId}`);
    socket.data = { playerId, playerName, roomId };

    console.log(`[WebSocket] 玩家 ${playerName} 加入房间 ${roomId}`);

    // 通知房间内其他玩家
    this.io.to(`room_${roomId}`).emit('player_joined', {
      playerId,
      playerName,
      players: room.players,
      timestamp: new Date(),
    });

    callback({ success: true, room, message: '加入房间成功' });
  }

  /**
   * 处理创建房间
   */
  private handleCreateRoom(
    socket: Socket,
    data: { hostId: string; roomName: string },
    callback: Function
  ): void {
    const { hostId, roomName } = data;

    const room = RoomManager.createRoom(hostId, roomName, 4);

    // 保存socket映射
    this.userSockets.set(hostId, socket.id);
    RoomManager.updatePlayerSocket(hostId, socket.id);

    // 加入socket.io房间
    socket.join(`room_${room.roomId}`);
    socket.data = { playerId: hostId, playerName: room.players[0].playerName, roomId: room.roomId };

    console.log(`[WebSocket] 玩家创建房间: ${room.roomName} (${room.roomId})`);

    callback({ success: true, room, message: '房间创建成功' });
  }

  /**
   * 处理获取房间列表
   */
  private handleListRooms(callback: Function): void {
    const rooms = RoomManager.getAllRooms();
    callback({
      success: true,
      rooms: rooms.map((r) => ({
        roomId: r.roomId,
        roomName: r.roomName,
        playerCount: r.players.length,
        maxPlayers: r.maxPlayers,
        hostName: r.players[0]?.playerName,
      })),
    });
  }

  /**
   * 处理开始游戏
   */
  private handleStartGame(
    socket: Socket,
    data: { roomId: string; hostId: string },
    callback: Function
  ): void {
    const { roomId, hostId } = data;

    const room = RoomManager.startGame(roomId, hostId);
    if (!room) {
      callback({ success: false, message: '无权开始游戏或房间不存在' });
      return;
    }

    console.log(`[WebSocket] 房间 ${roomId} 开始游戏`);

    // 通知所有玩家游戏开始
    this.io.to(`room_${roomId}`).emit('game_started', {
      room,
      currentTurn: room.currentTurn,
      timestamp: new Date(),
    });

    callback({ success: true, message: '游戏已开始' });
  }

  /**
   * 处理游戏决策
   */
  private handleMakeDecision(socket: Socket, data: any, callback: Function): void {
    const playerId = socket.data?.playerId;
    const roomId = socket.data?.roomId;

    if (!playerId || !roomId) {
      callback({ success: false, message: '未在房间中' });
      return;
    }

    const room = RoomManager.getRoom(roomId);
    if (!room || room.currentTurn !== playerId) {
      callback({ success: false, message: '不是你的回合' });
      return;
    }

    console.log(`[WebSocket] 玩家 ${playerId} 做出决策 (房间 ${roomId})`);

    // 更新游戏状态
    RoomManager.updateGameState(roomId, {
      lastDecision: data,
      lastDecisionBy: playerId,
      lastDecisionAt: new Date(),
    });

    // 通知房间内所有玩家
    this.io.to(`room_${roomId}`).emit('decision_made', {
      playerId,
      decision: data,
      timestamp: new Date(),
    });

    callback({ success: true, message: '决策已提交' });
  }

  /**
   * 处理掷骰子
   */
  private handleRollDice(socket: Socket, data: any, callback: Function): void {
    const playerId = socket.data?.playerId;
    const roomId = socket.data?.roomId;

    if (!playerId || !roomId) {
      callback({ success: false, message: '未在房间中' });
      return;
    }

    const room = RoomManager.getRoom(roomId);
    if (!room || room.currentTurn !== playerId) {
      callback({ success: false, message: '不是你的回合' });
      return;
    }

    // 生成骰子结果
    const diceResult = Math.floor(Math.random() * 6) + 1;

    console.log(`[WebSocket] 玩家 ${playerId} 掷骰子: ${diceResult}`);

    // 通知房间内所有玩家
    this.io.to(`room_${roomId}`).emit('dice_rolled', {
      playerId,
      result: diceResult,
      timestamp: new Date(),
    });

    callback({ success: true, result: diceResult });
  }

  /**
   * 处理年度结算
   */
  private handleAnnualSettle(socket: Socket, data: any, callback: Function): void {
    const playerId = socket.data?.playerId;
    const roomId = socket.data?.roomId;

    if (!playerId || !roomId) {
      callback({ success: false, message: '未在房间中' });
      return;
    }

    const room = RoomManager.getRoom(roomId);
    if (!room) {
      callback({ success: false, message: '房间不存在' });
      return;
    }

    console.log(`[WebSocket] 玩家 ${playerId} 进行年度结算 (房间 ${roomId})`);

    // 更新游戏状态
    RoomManager.updateGameState(roomId, {
      currentYear: (room.gameState.currentYear || 1) + 1,
      lastSettledBy: playerId,
      lastSettledAt: new Date(),
    });

    // 通知房间内所有玩家
    this.io.to(`room_${roomId}`).emit('annual_settled', {
      playerId,
      data,
      currentYear: room.gameState.currentYear,
      timestamp: new Date(),
    });

    callback({ success: true, message: '年度结算完成' });
  }

  /**
   * 处理发送消息
   */
  private handleSendMessage(socket: Socket, data: { message: string }, callback: Function): void {
    const playerId = socket.data?.playerId;
    const playerName = socket.data?.playerName;
    const roomId = socket.data?.roomId;

    if (!playerId || !roomId) {
      callback({ success: false, message: '未在房间中' });
      return;
    }

    console.log(`[WebSocket] 玩家 ${playerName} 在房间 ${roomId} 发送消息`);

    // 广播消息到房间内所有玩家
    this.io.to(`room_${roomId}`).emit('message_received', {
      playerId,
      playerName,
      message: data.message,
      timestamp: new Date(),
    });

    callback({ success: true });
  }

  /**
   * 处理离开房间
   */
  private handleLeaveRoom(socket: Socket, data: { playerId: string }, callback: Function): void {
    const { playerId } = data;
    const roomId = socket.data?.roomId;

    if (roomId) {
      const room = RoomManager.leaveRoom(playerId);

      // 离开socket.io房间
      socket.leave(`room_${roomId}`);

      console.log(`[WebSocket] 玩家 ${playerId} 离开房间 ${roomId}`);

      // 通知其他玩家
      this.io.to(`room_${roomId}`).emit('player_left', {
        playerId,
        remainingPlayers: room?.players || [],
        timestamp: new Date(),
      });

      this.userSockets.delete(playerId);
    }

    callback({ success: true });
  }

  /**
   * 处理断开连接
   */
  private handleDisconnect(socket: Socket): void {
    const playerId = socket.data?.playerId;
    const roomId = socket.data?.roomId;

    if (playerId && roomId) {
      console.log(`[WebSocket] 玩家 ${playerId} 断开连接 (房间 ${roomId})`);

      const room = RoomManager.leaveRoom(playerId);

      // 通知其他玩家
      this.io.to(`room_${roomId}`).emit('player_disconnected', {
        playerId,
        remainingPlayers: room?.players || [],
        timestamp: new Date(),
      });

      this.userSockets.delete(playerId);
    }

    console.log(`[WebSocket] 连接关闭: ${socket.id}`);
  }

  /**
   * 广播消息到特定房间
   */
  broadcastToRoom(roomId: string, event: string, data: any): void {
    this.io.to(`room_${roomId}`).emit(event, {
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * 发送消息给特定玩家
   */
  sendToPlayer(playerId: string, event: string, data: any): void {
    const socketId = this.userSockets.get(playerId);
    if (socketId) {
      this.io.to(socketId).emit(event, {
        ...data,
        timestamp: new Date(),
      });
    }
  }

  /**
   * 获取在线人数
   */
  getOnlineCount(): number {
    return this.io.engine.clientsCount;
  }

  /**
   * 获取房间中在线人数
   */
  getRoomOnlineCount(roomId: string): number {
    const room = this.io.sockets.adapter.rooms.get(`room_${roomId}`);
    return room ? room.size : 0;
  }
}

export default GameSocket;
