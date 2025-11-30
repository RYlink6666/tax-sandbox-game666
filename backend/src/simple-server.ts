import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// 数据存储
interface Player {
  id: string;
  name: string;
  playerType: string;
  difficulty: string;
  currentPosition: number;
  complianceAwareness: number;
  riskValue: number;
  transparency: number;
  riskTolerance: number;
  cash: number;
  taxReserve: number;
  year: number;
  decisions: any[];
  status: 'playing' | 'bankrupt' | 'criminal' | 'completed';
  createdAt: string;
}

interface Game {
  id: string;
  name: string;
  players: Player[];
  status: 'setup' | 'playing' | 'ended';
  currentYear: number;
  createdAt: string;
  updatedAt: string;
}

const games = new Map<string, Game>();
const players = new Map<string, Player>();

// ========== 中间件 ==========
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// ========== 健康检查 ==========
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.2.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ========== 游戏API ==========

// 创建游戏
app.post('/api/game/create', (req, res) => {
  try {
    const { playerName, playerType, difficulty } = req.body;
    
    if (!playerName || !playerType || !difficulty) {
      return res.status(400).json({ 
        success: false, 
        message: '缺少必要参数: playerName, playerType, difficulty' 
      });
    }

    const gameId = `game-${uuidv4().substring(0, 8)}`;
    const playerId = `player-${uuidv4().substring(0, 8)}`;

    const player: Player = {
      id: playerId,
      name: playerName,
      playerType,
      difficulty,
      currentPosition: 0,
      complianceAwareness: 50,
      riskValue: 0,
      transparency: 50,
      riskTolerance: 100,
      cash: 100,
      taxReserve: 10,
      year: 1,
      decisions: [],
      status: 'playing',
      createdAt: new Date().toISOString()
    };

    const game: Game = {
      id: gameId,
      name: `${playerName}的游戏`,
      players: [player],
      status: 'playing',
      currentYear: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    games.set(gameId, game);
    players.set(playerId, player);

    res.json({
      success: true,
      gameId,
      playerId,
      game,
      message: '游戏创建成功'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// 获取游戏状态
app.get('/api/game/:gameId', (req, res) => {
  try {
    const { gameId } = req.params;
    const game = games.get(gameId);

    if (!game) {
      return res.status(404).json({ 
        success: false, 
        message: '游戏不存在' 
      });
    }

    res.json({
      success: true,
      game
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// 更新玩家状态
app.post('/api/game/:gameId/update', (req, res) => {
  try {
    const { gameId } = req.params;
    const updates = req.body;

    const game = games.get(gameId);
    if (!game) {
      return res.status(404).json({ 
        success: false, 
        message: '游戏不存在' 
      });
    }

    // 更新第一个玩家的状态
    if (game.players.length > 0) {
      const player = game.players[0];
      
      // 更新玩家属性
      Object.assign(player, updates);

      // 检查破产条件
      if (player.riskTolerance <= 0 || player.cash <= 0) {
        player.status = 'bankrupt';
      }

      // 检查完成条件
      if (player.currentPosition >= 120) {
        player.status = 'completed';
        game.status = 'ended';
      }

      game.updatedAt = new Date().toISOString();
      games.set(gameId, game);
    }

    res.json({
      success: true,
      game
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// 玩家决策
app.post('/api/player/:playerId/decide', (req, res) => {
  try {
    const { playerId } = req.params;
    const { gridId, choiceIndex, effect } = req.body;

    const player = players.get(playerId);
    if (!player) {
      return res.status(404).json({ 
        success: false, 
        message: '玩家不存在' 
      });
    }

    // 记录决策
    player.decisions.push({
      gridId,
      choiceIndex,
      effect,
      timestamp: new Date().toISOString()
    });

    // 应用效果
    if (effect) {
      if (effect.cash) player.cash += effect.cash;
      if (effect.compliance) player.complianceAwareness += effect.compliance;
      if (effect.risk) player.riskValue += effect.risk;
      if (effect.transparency) player.transparency += effect.transparency;
      if (effect.riskTolerance) player.riskTolerance += effect.riskTolerance;
    }

    players.set(playerId, player);

    res.json({
      success: true,
      message: '决策已记录',
      player
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ========== 格子定义API ==========

// 简化的格子定义（生产环境可从数据库读取）
const gridDefinitions = Array.from({ length: 120 }, (_, i) => ({
  gridId: i + 1,
  year: Math.floor(i / 6) + 1,
  type: ['采购', '销售', '成本', '薪酬', '分配', '融资'][i % 6],
  flowType: i < 70 ? '灰色流' : i < 100 ? '合规流' : '违规流',
  description: `第${i + 1}格 - ${['采购', '销售', '成本', '薪酬', '分配', '融资'][i % 6]}决策`,
  choices: [
    { label: 'A. 安全选择', effect: { compliance: 5, cash: 0, risk: 0 } },
    { label: 'B. 平衡选择', effect: { compliance: 2, cash: 5, risk: 8 } },
    { label: 'C. 激进选择', effect: { compliance: -5, cash: 15, risk: 20 } },
    { label: 'D. 保守选择', effect: { compliance: 8, cash: -3, risk: 0 } },
    { label: 'E. 学习选择', effect: { compliance: 0, cash: 0, risk: -5 } }
  ]
}));

app.get('/api/grid/definitions', (req, res) => {
  res.json({
    success: true,
    total: gridDefinitions.length,
    grids: gridDefinitions
  });
});

app.get('/api/grid/:gridId', (req, res) => {
  const gridId = parseInt(req.params.gridId, 10);
  const grid = gridDefinitions.find(g => g.gridId === gridId);

  if (!grid) {
    return res.status(404).json({ 
      success: false, 
      message: '格子不存在' 
    });
  }

  res.json({
    success: true,
    grid
  });
});

// ========== 启动服务器 ==========
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   税务风险沙盘游戏后端服务              ║
╚════════════════════════════════════════╝

🚀 服务器启动成功！
📍 地址: http://localhost:${PORT}
🔗 健康检查: http://localhost:${PORT}/health
📡 API前缀: http://localhost:${PORT}/api

✅ 已启用CORS跨域支持
   - 前端地址: ${FRONTEND_URL}
   - 本地开发: http://localhost:5173

💾 存储方式: 内存存储（重启后数据丢失）
🔄 生产建议: 配置数据库持久化

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  按 Ctrl+C 停止服务器
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

export default app;
