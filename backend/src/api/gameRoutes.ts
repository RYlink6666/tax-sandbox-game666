/**
 * 游戏管理API路由
 */

import { Express, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// 内存存储
const games = new Map<string, any>();

export function setupGameRoutes(app: Express) {
  /**
   * 创建游戏
   * POST /api/game/create
   */
  app.post('/api/game/create', (req: Request, res: Response) => {
    try {
      const { name, mode = 'single' } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: '游戏名称不能为空'
        });
      }

      const gameId = uuidv4();
      const game = {
        id: gameId,
        name,
        mode,
        status: 'setup',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      games.set(gameId, game);

      res.json({
        success: true,
        gameId,
        message: '游戏创建成功',
        game
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: '服务器错误'
      });
    }
  });

  /**
   * 获取游戏详情
   * GET /api/game/:gameId
   */
  app.get('/api/game/:gameId', (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const game = games.get(gameId);

      if (!game) {
        return res.status(404).json({
          success: false,
          error: '游戏不存在'
        });
      }

      res.json({
        success: true,
        game
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: '服务器错误'
      });
    }
  });

  /**
   * 启动游戏
   * POST /api/game/:gameId/start
   */
  app.post('/api/game/:gameId/start', (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const game = games.get(gameId);

      if (!game) {
        return res.status(404).json({
          success: false,
          error: '游戏不存在'
        });
      }

      game.status = 'playing';
      game.updatedAt = new Date();

      res.json({
        success: true,
        message: '游戏已启动',
        gameId
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: '服务器错误'
      });
    }
  });

  /**
   * 结束游戏
   * POST /api/game/:gameId/end
   */
  app.post('/api/game/:gameId/end', (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const game = games.get(gameId);

      if (!game) {
        return res.status(404).json({
          success: false,
          error: '游戏不存在'
        });
      }

      game.status = 'ended';
      game.updatedAt = new Date();

      res.json({
        success: true,
        message: '游戏已结束',
        gameId
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: '服务器错误'
      });
    }
  });
}
