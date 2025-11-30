/**
 * 多人游戏状态管理 - Pinia Store
 * Phase 4: 房间和玩家同步
 */

import { defineStore } from 'pinia';

export interface RoomPlayer {
  playerId: string;
  playerName: string;
  status: 'connected' | 'disconnected' | 'playing' | 'waiting';
  isHost: boolean;
  joinedAt: Date;
}

export interface GameRoom {
  roomId: string;
  roomName: string;
  hostId: string;
  players: RoomPlayer[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  currentTurn: string;
  gameState: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: Date;
}

export const useMultiplayerStore = defineStore('multiplayer', {
  state: () => ({
    currentRoom: null as GameRoom | null,
    currentPlayerId: '' as string,
    currentPlayerName: '' as string,
    availableRooms: [] as GameRoom[],
    chatMessages: [] as ChatMessage[],
    socketConnected: false,
    roomMessages: [] as string[],
  }),

  getters: {
    /**
     * 获取当前房间的其他玩家
     */
    otherPlayers: (state) => {
      if (!state.currentRoom) return [];
      return state.currentRoom.players.filter((p) => p.playerId !== state.currentPlayerId);
    },

    /**
     * 获取当前是否是我的回合
     */
    isMyTurn: (state) => {
      return state.currentRoom?.currentTurn === state.currentPlayerId;
    },

    /**
     * 获取房间中的玩家数
     */
    playerCount: (state) => {
      return state.currentRoom?.players.length || 0;
    },

    /**
     * 获取房间是否满员
     */
    isRoomFull: (state) => {
      if (!state.currentRoom) return false;
      return state.currentRoom.players.length >= state.currentRoom.maxPlayers;
    },

    /**
     * 获取房间是否在进行中
     */
    isGamePlaying: (state) => {
      return state.currentRoom?.status === 'playing';
    },

    /**
     * 获取我是否是房主
     */
    isHost: (state) => {
      return state.currentRoom?.hostId === state.currentPlayerId;
    },
  },

  actions: {
    /**
     * 设置当前玩家信息
     */
    setCurrentPlayer(playerId: string, playerName: string) {
      this.currentPlayerId = playerId;
      this.currentPlayerName = playerName;
    },

    /**
     * 设置当前房间
     */
    setCurrentRoom(room: GameRoom | null) {
      this.currentRoom = room;
    },

    /**
     * 更新房间信息
     */
    updateRoom(roomData: Partial<GameRoom>) {
      if (this.currentRoom) {
        this.currentRoom = {
          ...this.currentRoom,
          ...roomData,
        };
      }
    },

    /**
     * 设置可用房间列表
     */
    setAvailableRooms(rooms: GameRoom[]) {
      this.availableRooms = rooms;
    },

    /**
     * 添加可用房间
     */
    addAvailableRoom(room: GameRoom) {
      const exists = this.availableRooms.find((r) => r.roomId === room.roomId);
      if (!exists) {
        this.availableRooms.push(room);
      }
    },

    /**
     * 移除可用房间
     */
    removeAvailableRoom(roomId: string) {
      this.availableRooms = this.availableRooms.filter((r) => r.roomId !== roomId);
    },

    /**
     * 设置房间玩家列表
     */
    setRoomPlayers(players: RoomPlayer[]) {
      if (this.currentRoom) {
        this.currentRoom.players = players;
      }
    },

    /**
     * 添加房间玩家
     */
    addRoomPlayer(player: RoomPlayer) {
      if (this.currentRoom && !this.currentRoom.players.find((p) => p.playerId === player.playerId)) {
        this.currentRoom.players.push(player);
      }
    },

    /**
     * 移除房间玩家
     */
    removeRoomPlayer(playerId: string) {
      if (this.currentRoom) {
        this.currentRoom.players = this.currentRoom.players.filter((p) => p.playerId !== playerId);
      }
    },

    /**
     * 设置当前回合的玩家
     */
    setCurrentTurn(playerId: string) {
      if (this.currentRoom) {
        this.currentRoom.currentTurn = playerId;
      }
    },

    /**
     * 设置房间游戏状态
     */
    setGameState(gameState: any) {
      if (this.currentRoom) {
        this.currentRoom.gameState = gameState;
      }
    },

    /**
     * 更新房间游戏状态（合并）
     */
    updateGameState(gameState: any) {
      if (this.currentRoom) {
        this.currentRoom.gameState = {
          ...this.currentRoom.gameState,
          ...gameState,
        };
      }
    },

    /**
     * 设置房间状态
     */
    setRoomStatus(status: 'waiting' | 'playing' | 'finished') {
      if (this.currentRoom) {
        this.currentRoom.status = status;
      }
    },

    /**
     * 添加聊天消息
     */
    addChatMessage(message: ChatMessage) {
      this.chatMessages.push(message);

      // 保持消息数量在可控范围
      if (this.chatMessages.length > 100) {
        this.chatMessages.shift();
      }
    },

    /**
     * 清空聊天消息
     */
    clearChatMessages() {
      this.chatMessages = [];
    },

    /**
     * 设置Socket连接状态
     */
    setSocketConnected(connected: boolean) {
      this.socketConnected = connected;
    },

    /**
     * 添加房间消息（系统消息）
     */
    addRoomMessage(message: string) {
      this.roomMessages.push(message);

      // 保持消息数量在可控范围
      if (this.roomMessages.length > 50) {
        this.roomMessages.shift();
      }
    },

    /**
     * 清空房间消息
     */
    clearRoomMessages() {
      this.roomMessages = [];
    },

    /**
     * 重置所有状态
     */
    reset() {
      this.currentRoom = null;
      this.currentPlayerId = '';
      this.currentPlayerName = '';
      this.availableRooms = [];
      this.chatMessages = [];
      this.roomMessages = [];
      this.socketConnected = false;
    },
  },
});
