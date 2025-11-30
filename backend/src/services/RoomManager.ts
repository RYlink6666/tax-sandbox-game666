/**
 * 房间管理系统 - 支持多人游戏
 * Phase 4: 多人实时同步
 */

import { v4 as uuidv4 } from 'uuid';

export interface GameRoom {
  roomId: string;
  roomName: string;
  hostId: string;
  players: RoomPlayer[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  currentTurn: string; // 当前玩家ID
  gameState: any; // 游戏状态
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomPlayer {
  playerId: string;
  playerName: string;
  socketId?: string;
  status: 'connected' | 'disconnected' | 'playing' | 'waiting';
  isHost: boolean;
  joinedAt: Date;
}

export interface RoomEvent {
  type: 'player_joined' | 'player_left' | 'game_started' | 'game_ended' | 'turn_changed' | 'state_updated';
  playerId?: string;
  data: any;
  timestamp: Date;
}

class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private playerRoomMap: Map<string, string> = new Map(); // playerId -> roomId
  private roomEvents: Map<string, RoomEvent[]> = new Map(); // 房间事件日志

  /**
   * 创建新房间
   */
  createRoom(hostId: string, roomName: string, maxPlayers: number = 4): GameRoom {
    const roomId = uuidv4();
    const now = new Date();

    const room: GameRoom = {
      roomId,
      roomName,
      hostId,
      players: [
        {
          playerId: hostId,
          playerName: `Player_${hostId.substring(0, 6)}`,
          status: 'connected',
          isHost: true,
          joinedAt: now,
        },
      ],
      maxPlayers,
      status: 'waiting',
      currentTurn: hostId,
      gameState: {
        year: 1,
        turnCount: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.rooms.set(roomId, room);
    this.playerRoomMap.set(hostId, roomId);
    this.roomEvents.set(roomId, []);

    return room;
  }

  /**
   * 加入房间
   */
  joinRoom(roomId: string, playerId: string, playerName: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    // 检查房间是否已满
    if (room.players.length >= room.maxPlayers) {
      return null;
    }

    // 检查玩家是否已在房间中
    if (room.players.find((p) => p.playerId === playerId)) {
      return null;
    }

    // 添加玩家
    const newPlayer: RoomPlayer = {
      playerId,
      playerName,
      status: 'connected',
      isHost: false,
      joinedAt: new Date(),
    };

    room.players.push(newPlayer);
    room.updatedAt = new Date();
    this.playerRoomMap.set(playerId, roomId);

    // 记录事件
    this.recordEvent(roomId, {
      type: 'player_joined',
      playerId,
      data: { playerName },
      timestamp: new Date(),
    });

    return room;
  }

  /**
   * 离开房间
   */
  leaveRoom(playerId: string): GameRoom | null {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    // 移除玩家
    room.players = room.players.filter((p) => p.playerId !== playerId);
    room.updatedAt = new Date();
    this.playerRoomMap.delete(playerId);

    // 记录事件
    this.recordEvent(roomId, {
      type: 'player_left',
      playerId,
      data: {},
      timestamp: new Date(),
    });

    // 如果房间为空，删除房间
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      this.roomEvents.delete(roomId);
    } else if (room.hostId === playerId) {
      // 如果主机离开，转移主机权限
      room.players[0].isHost = true;
      room.hostId = room.players[0].playerId;
    }

    return room;
  }

  /**
   * 获取房间信息
   */
  getRoom(roomId: string): GameRoom | null {
    return this.rooms.get(roomId) || null;
  }

  /**
   * 获取所有房间
   */
  getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values()).filter((r) => r.status === 'waiting');
  }

  /**
   * 获取玩家所在房间
   */
  getPlayerRoom(playerId: string): GameRoom | null {
    const roomId = this.playerRoomMap.get(playerId);
    return roomId ? this.rooms.get(roomId) || null : null;
  }

  /**
   * 开始游戏
   */
  startGame(roomId: string, hostId: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room || room.hostId !== hostId) return null;

    room.status = 'playing';
    room.updatedAt = new Date();
    room.currentTurn = room.players[0].playerId;

    this.recordEvent(roomId, {
      type: 'game_started',
      data: { players: room.players.length },
      timestamp: new Date(),
    });

    return room;
  }

  /**
   * 更新游戏状态
   */
  updateGameState(roomId: string, gameState: any): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.gameState = {
      ...room.gameState,
      ...gameState,
    };
    room.updatedAt = new Date();

    this.recordEvent(roomId, {
      type: 'state_updated',
      data: gameState,
      timestamp: new Date(),
    });

    return room;
  }

  /**
   * 切换玩家轮流
   */
  nextTurn(roomId: string): string | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const currentIndex = room.players.findIndex((p) => p.playerId === room.currentTurn);
    const nextIndex = (currentIndex + 1) % room.players.length;
    room.currentTurn = room.players[nextIndex].playerId;
    room.gameState.turnCount = (room.gameState.turnCount || 0) + 1;
    room.updatedAt = new Date();

    this.recordEvent(roomId, {
      type: 'turn_changed',
      data: { newTurn: room.currentTurn },
      timestamp: new Date(),
    });

    return room.currentTurn;
  }

  /**
   * 结束游戏
   */
  endGame(roomId: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.status = 'finished';
    room.updatedAt = new Date();

    this.recordEvent(roomId, {
      type: 'game_ended',
      data: { finalState: room.gameState },
      timestamp: new Date(),
    });

    return room;
  }

  /**
   * 获取房间事件历史
   */
  getRoomEvents(roomId: string): RoomEvent[] {
    return this.roomEvents.get(roomId) || [];
  }

  /**
   * 记录房间事件
   */
  private recordEvent(roomId: string, event: RoomEvent): void {
    const events = this.roomEvents.get(roomId) || [];
    events.push(event);
    this.roomEvents.set(roomId, events);

    // 保持历史大小在可控范围
    if (events.length > 1000) {
      events.shift();
    }
  }

  /**
   * 更新玩家的socket ID
   */
  updatePlayerSocket(playerId: string, socketId: string): boolean {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return false;

    const room = this.rooms.get(roomId);
    if (!room) return false;

    const player = room.players.find((p) => p.playerId === playerId);
    if (player) {
      player.socketId = socketId;
      return true;
    }

    return false;
  }

  /**
   * 获取房间中的所有socket ID
   */
  getRoomSocketIds(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return room.players
      .filter((p) => p.socketId)
      .map((p) => p.socketId!)
      .filter((id) => id !== null);
  }

  /**
   * 验证房间是否还有足够的连接玩家
   */
  hasEnoughPlayers(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const connectedPlayers = room.players.filter((p) => p.status === 'connected').length;
    return connectedPlayers >= 1; // 至少需要1个连接的玩家
  }
}

export default new RoomManager();
