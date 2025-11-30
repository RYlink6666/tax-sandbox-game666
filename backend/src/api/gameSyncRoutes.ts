/**
 * 游戏同步 API 路由
 * Phase 4: 实时状态同步和决策处理
 */

import { Router, Request, Response } from 'express';
import GameSyncManager from '../services/GameSyncManager';
import TurnController from '../services/TurnController';
import MultiplayerGameFlow from '../services/MultiplayerGameFlow';

const router = Router();

/**
 * GET /api/sync/state/:roomId/:playerId
 * 获取玩家的完整同步状态
 */
router.get('/state/:roomId/:playerId', (req: Request, res: Response) => {
  try {
    const { roomId, playerId } = req.params;
    const syncState = GameSyncManager.getSyncState(roomId, playerId);

    if (!syncState) {
      return res.status(404).json({
        success: false,
        message: '玩家或房间不存在',
      });
    }

    res.json({
      success: true,
      state: syncState,
    });
  } catch (error) {
    console.error('获取同步状态错误:', error);
    res.status(500).json({
      success: false,
      message: '获取同步状态失败',
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/sync/turn/:roomId
 * 获取房间的回合状态
 */
router.get('/turn/:roomId', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const turnState = TurnController.getTurnState(roomId);

    if (!turnState) {
      return res.status(404).json({
        success: false,
        message: '房间不存在或回合未初始化',
      });
    }

    const remainingTime = TurnController.getTurnRemainingTime(roomId);

    res.json({
      success: true,
      turn: {
        ...turnState,
        remainingTime,
      },
    });
  } catch (error) {
    console.error('获取回合状态错误:', error);
    res.status(500).json({
      success: false,
      message: '获取回合状态失败',
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/sync/decision
 * 提交游戏决策
 */
router.post('/decision', async (req: Request, res: Response) => {
  try {
    const { roomId, playerId, decision } = req.body;

    if (!roomId || !playerId || !decision) {
      return res.status(400).json({
        success: false,
        message: 'roomId, playerId 和 decision 是必需的',
      });
    }

    // 验证操作频率
    const freqCheck = TurnController.validateActionFrequency(roomId, playerId);
    if (!freqCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: '操作过于频繁，请稍候',
        cooldownRemaining: freqCheck.cooldownRemaining,
      });
    }

    // 处理决策
    const result = await MultiplayerGameFlow.processDecision(roomId, playerId, decision);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: '决策已提交',
      result: result.result,
    });
  } catch (error) {
    console.error('提交决策错误:', error);
    res.status(500).json({
      success: false,
      message: '提交决策失败',
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/sync/annual-settle
 * 进行年度结算
 */
router.post('/annual-settle', async (req: Request, res: Response) => {
  try {
    const { roomId, playerId } = req.body;

    if (!roomId || !playerId) {
      return res.status(400).json({
        success: false,
        message: 'roomId 和 playerId 是必需的',
      });
    }

    const result = await MultiplayerGameFlow.processAnnualSettlement(roomId, playerId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: '年度结算完成',
      settlement: result.result,
    });
  } catch (error) {
    console.error('年度结算错误:', error);
    res.status(500).json({
      success: false,
      message: '年度结算失败',
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/sync/next-turn
 * 进行下一个回合
 */
router.post('/next-turn', (req: Request, res: Response) => {
  try {
    const { roomId, playerId } = req.body;

    if (!roomId || !playerId) {
      return res.status(400).json({
        success: false,
        message: 'roomId 和 playerId 是必需的',
      });
    }

    const result = TurnController.nextTurn(roomId, playerId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.reason,
      });
    }

    res.json({
      success: true,
      message: '回合已切换',
      nextPlayer: result.nextPlayer,
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
 * POST /api/sync/advance-year
 * 推进到下一年
 */
router.post('/advance-year', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'roomId 是必需的',
      });
    }

    const result = await MultiplayerGameFlow.advanceYear(roomId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: '已推进到下一年',
      newYear: result.newYear,
    });
  } catch (error) {
    console.error('推进年份错误:', error);
    res.status(500).json({
      success: false,
      message: '推进年份失败',
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/sync/decisions/:roomId/:playerId
 * 获取玩家的决策历史
 */
router.get('/decisions/:roomId/:playerId', (req: Request, res: Response) => {
  try {
    const { roomId, playerId } = req.params;
    const decisions = GameSyncManager.getPlayerDecisions(roomId, playerId);

    res.json({
      success: true,
      total: decisions.length,
      decisions,
    });
  } catch (error) {
    console.error('获取决策历史错误:', error);
    res.status(500).json({
      success: false,
      message: '获取决策历史失败',
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/sync/consistency/:roomId
 * 验证房间的状态一致性
 */
router.get('/consistency/:roomId', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const result = GameSyncManager.validateStateConsistency(roomId);

    res.json({
      success: result.valid,
      consistent: result.valid,
      errors: result.errors,
    });
  } catch (error) {
    console.error('验证状态一致性错误:', error);
    res.status(500).json({
      success: false,
      message: '验证状态一致性失败',
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/sync/events/:roomId
 * 获取房间的游戏事件日志
 */
router.get('/events/:roomId', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const events = MultiplayerGameFlow.getGameEvents(roomId, limit);

    res.json({
      success: true,
      total: events.length,
      events,
    });
  } catch (error) {
    console.error('获取事件日志错误:', error);
    res.status(500).json({
      success: false,
      message: '获取事件日志失败',
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/sync/check-end
 * 检查游戏是否结束
 */
router.post('/check-end', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'roomId 是必需的',
      });
    }

    const endCheck = MultiplayerGameFlow.checkGameEnd(roomId);

    res.json({
      success: true,
      ...endCheck,
    });
  } catch (error) {
    console.error('检查游戏结束错误:', error);
    res.status(500).json({
      success: false,
      message: '检查游戏结束失败',
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/sync/end-game
 * 结束游戏
 */
router.post('/end-game', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'roomId 是必需的',
      });
    }

    const result = await MultiplayerGameFlow.endGame(roomId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: '结束游戏失败',
      });
    }

    res.json({
      success: true,
      message: '游戏已结束',
      gameStats: result.gameStats,
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
