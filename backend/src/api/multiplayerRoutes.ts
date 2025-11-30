/**
 * 多人游戏 API 路由
 * Phase 4: 房间管理和多人同步
 */

import { Router, Request, Response } from 'express';
import RoomManager from '../services/RoomManager';

const router = Router();

/**
 * POST /api/multiplayer/room/create
 * 创建游戏房间
 */
router.post('/room/create', (req: Request, res: Response) => {
  try {
    const { hostId, roomName } = req.body;

    if (!hostId || !roomName) {
      return res.status(400).json({
        success: false,
        message: 'hostId 和 roomName 是必需的',
      });
    }

    const room = RoomManager.createRoom(hostId, roomName, 4);

    res.json({
      success: true,
      message: '房间创建成功',
      room,
    });
  } catch (error) {
    console.error('创建房间错误:', error);
    res.status(500).json({
      success: false,
      message: '创建房间失败',
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/multiplayer/rooms
 * 获取所有可用房间
 */
router.get('/rooms', (req: Request, res: Response) => {
  try {
    const rooms = RoomManager.getAllRooms();

    res.json({
      success: true,
      total: rooms.length,
      rooms: rooms.map((r) => ({
        roomId: r.roomId,
        roomName: r.roomName,
        hostName: r.players[0]?.playerName || 'Unknown',
        playerCount: r.players.length,
        maxPlayers: r.maxPlayers,
        status: r.status,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('获取房间列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取房间列表失败',
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/multiplayer/room/:roomId
 * 获取房间详情
 */
router.get('/room/:roomId', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = RoomManager.getRoom(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: '房间不存在',
      });
    }

    res.json({
      success: true,
      room,
    });
  } catch (error) {
    console.error('获取房间详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取房间详情失败',
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/multiplayer/room/:roomId/join
 * 加入房间
 */
router.post('/room/:roomId/join', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { playerId, playerName } = req.body;

    if (!playerId || !playerName) {
      return res.status(400).json({
        success: false,
        message: 'playerId 和 playerName 是必需的',
      });
    }

    const room = RoomManager.joinRoom(roomId, playerId, playerName);

    if (!room) {
      return res.status(400).json({
        success: false,
        message: '房间不存在或已满',
      });
    }

    res.json({
      success: true,
      message: '加入房间成功',
      room,
    });
  } catch (error) {
    console.error('加入房间错误:', error);
    res.status(500).json({
      success: false,
      message: '加入房间失败',
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/multiplayer/room/:roomId/leave
 * 离开房间
 */
router.post('/room/:roomId/leave', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({
        success: false,
        message: 'playerId 是必需的',
      });
    }

    const room = RoomManager.leaveRoom(playerId);

    res.json({
      success: true,
      message: '离开房间成功',
      room,
    });
  } catch (error) {
    console.error('离开房间错误:', error);
    res.status(500).json({
      success: false,
      message: '离开房间失败',
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/multiplayer/room/:roomId/start
 * 开始游戏
 */
router.post('/room/:roomId/start', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { hostId } = req.body;

    if (!hostId) {
      return res.status(400).json({
        success: false,
        message: 'hostId 是必需的',
      });
    }

    const room = RoomManager.startGame(roomId, hostId);

    if (!room) {
      return res.status(400).json({
        success: false,
        message: '无权开始游戏',
      });
    }

    res.json({
      success: true,
      message: '游戏已开始',
      room,
    });
  } catch (error) {
    console.error('开始游戏错误:', error);
    res.status(500).json({
      success: false,
      message: '开始游戏失败',
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/multiplayer/player/:playerId/room
 * 获取玩家所在的房间
 */
router.get('/player/:playerId/room', (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    const room = RoomManager.getPlayerRoom(playerId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: '玩家未在任何房间中',
      });
    }

    res.json({
      success: true,
      room,
    });
  } catch (error) {
    console.error('获取玩家房间错误:', error);
    res.status(500).json({
      success: false,
      message: '获取玩家房间失败',
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/multiplayer/room/:roomId/state
 * 更新房间游戏状态
 */
router.post('/room/:roomId/state', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const gameState = req.body;

    const room = RoomManager.updateGameState(roomId, gameState);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: '房间不存在',
      });
    }

    res.json({
      success: true,
      message: '游戏状态已更新',
      room,
    });
  } catch (error) {
    console.error('更新游戏状态错误:', error);
    res.status(500).json({
      success: false,
      message: '更新游戏状态失败',
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/multiplayer/room/:roomId/next-turn
 * 切换到下一个玩家的回合
 */
router.post('/room/:roomId/next-turn', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const nextTurnPlayerId = RoomManager.nextTurn(roomId);

    if (!nextTurnPlayerId) {
      return res.status(404).json({
        success: false,
        message: '房间不存在',
      });
    }

    const room = RoomManager.getRoom(roomId);

    res.json({
      success: true,
      message: '回合已切换',
      currentTurn: nextTurnPlayerId,
      room,
    });
  } catch (error) {
    console.error('切换回合错误:', error);
    res.status(500).json({
      success: false,
      message: '切换回合失败',
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/multiplayer/room/:roomId/events
 * 获取房间事件历史
 */
router.get('/room/:roomId/events', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const events = RoomManager.getRoomEvents(roomId);

    res.json({
      success: true,
      total: events.length,
      events,
    });
  } catch (error) {
    console.error('获取房间事件错误:', error);
    res.status(500).json({
      success: false,
      message: '获取房间事件失败',
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/multiplayer/room/:roomId/end
 * 结束游戏
 */
router.post('/room/:roomId/end', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = RoomManager.endGame(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: '房间不存在',
      });
    }

    res.json({
      success: true,
      message: '游戏已结束',
      room,
    });
  } catch (error) {
    console.error('结束游戏错误:', error);
    res.status(500).json({
      success: false,
      message: '结束游戏失败',
      error: (error as Error).message,
    });
  }
});

export default router;
