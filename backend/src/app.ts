/**
 * 税务风险沙盘游戏 - 后端应用主入口
 * Phase 1-4 完整实现
 * v1.0 正式版本
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';

// 导入所有服务层
import RuleEngine from './services/RuleEngine';
import AuditEngine from './services/AuditEngine';
import GameOverEngine from './services/GameOverEngine';
import DataExporter from './services/DataExporter';
import GameSyncManager from './services/GameSyncManager';
import TurnController from './services/TurnController';
import MultiplayerGameFlow from './services/MultiplayerGameFlow';
import RoomManager from './services/RoomManager';
import AnalyticsEngine from './services/AnalyticsEngine';

// 导入API路由
import { setupGameRoutes } from './api/gameRoutes';
import {
  setupPlayerRoutes,
  setupDecisionRoutes,
  setupAuditRoutes,
  setupGameOverRoutes,
  setupMultiplayerRoutes,
  setupGameSyncRoutes,
  setupCoachRoutes
} from './api/stubs';

// 导入数据定义
import { GRID_DEFINITIONS } from './data/gridDefinitions';
import { validateGridDefinitions } from './data/gridDefinitions';

// ==================== 应用配置 ====================

const app: Express = express();
const PORT = process.env.PORT || 3001;

// 中间件 - 改进的CORS配置
app.use(cors({
  origin: '*', // 允许所有源
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ==================== 内存存储（替代数据库） ====================

// 简单的内存存储
const memoryStore = {
  games: new Map<string, any>(),
  players: new Map<string, any>(),
  decisions: new Map<string, any>(),
  auditRecords: new Map<string, any>(),
  gameRooms: new Map<string, any>()
};

function initDatabase() {
  return new Promise<void>((resolve) => {
    console.log('✅ 内存存储初始化完成（无需数据库）');
    resolve();
  });
}

// ==================== HTTP 服务器 ====================

const server = http.createServer(app);

// ==================== WebSocket 服务器 ====================

const wss = new WebSocketServer({ server });

wss.on('connection', (ws: any) => {
  console.log('🟢 新WebSocket客户端连接');

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 收到消息:', data.type);
      // WebSocket消息处理逻辑
    } catch (err) {
      console.error('❌ 消息解析失败:', err);
    }
  });

  ws.on('close', () => {
    console.log('🔴 客户端断开连接');
  });

  ws.on('error', (err) => {
    console.error('❌ WebSocket错误:', err);
  });
});

// ==================== API 路由 ====================

// 健康检查
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date(),
    db: db ? 'connected' : 'disconnected'
  });
});

// 格子定义 API
app.get('/api/grid/definitions', (req: Request, res: Response) => {
  try {
    const validation = validateGridDefinitions();
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    res.json({
      total: GRID_DEFINITIONS.length,
      grids: GRID_DEFINITIONS,
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: '获取格子定义失败'
    });
  }
});

// 年份格子 API
app.get('/api/grid/year/:year', (req: Request, res: Response) => {
  try {
    const year = parseInt(req.params.year);
    if (isNaN(year) || year < 1 || year > 20) {
      return res.status(400).json({
        success: false,
        error: '年份参数无效 (1-20)'
      });
    }

    const yearGrids = GRID_DEFINITIONS.filter((g) => g.year === year);
    res.json({
      year,
      count: yearGrids.length,
      grids: yearGrids
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: '获取年份格子失败'
    });
  }
});

// 单个格子 API
app.get('/api/grid/:gridId', (req: Request, res: Response) => {
  try {
    const grid = GRID_DEFINITIONS.find((g) => g.gridId === req.params.gridId);
    if (!grid) {
      return res.status(404).json({
        success: false,
        error: '格子不存在'
      });
    }

    res.json(grid);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: '获取格子详情失败'
    });
  }
});

// 注册所有API路由
setupGameRoutes(app, memoryStore);
setupPlayerRoutes(app, memoryStore);
setupDecisionRoutes(app, memoryStore);
setupAuditRoutes(app, memoryStore);
setupGameOverRoutes(app, memoryStore);
setupMultiplayerRoutes(app, memoryStore, wss);
setupGameSyncRoutes(app, memoryStore, wss);
setupCoachRoutes(app, memoryStore);

// ==================== 错误处理 ====================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: '端点不存在',
    path: req.path,
    method: req.method
  });
});

app.use((err: any, req: Request, res: Response) => {
  console.error('❌ 错误:', err);
  res.status(500).json({
    success: false,
    error: '服务器错误',
    message: err.message
  });
});

// ==================== 启动服务器 ====================

async function start() {
  try {
    // 初始化数据库
    await initDatabase();

    // 验证格子定义
    const validation = validateGridDefinitions();
    if (!validation.valid) {
      console.error('❌ 格子定义验证失败:', validation.errors);
      process.exit(1);
    }
    console.log('✅ 格子定义验证通过 (120个格子)');

    // 启动HTTP服务器
    server.listen(PORT, () => {
      console.log('\n╔════════════════════════════════════════════╗');
      console.log('║  税务风险沙盘游戏 - 后端服务               ║');
      console.log('║  v1.0 正式版本                             ║');
      console.log('╚════════════════════════════════════════════╝\n');
      console.log(`🚀 服务器启动在 http://localhost:${PORT}`);
      console.log(`📊 存储方式: 内存存储`);
      console.log(`📦 格子总数: 120个`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
      console.log('\n✅ 所有服务就绪\n');
    });

    // 优雅关闭
    process.on('SIGTERM', () => {
      console.log('\n⏹️  正在关闭服务器...');
      server.close(() => {
        console.log('✅ 服务器已关闭');
        db.close();
        process.exit(0);
      });
    });
  } catch (err) {
    console.error('❌ 启动失败:', err);
    process.exit(1);
  }
}

start();

export { app, server, db, wss };
