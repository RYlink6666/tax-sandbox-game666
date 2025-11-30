/**
 * API路由 Stub - 所有必要路由的占位符
 * 实际实现在各自的文件中
 */

import { Express } from 'express';
import WebSocket from 'ws';

// Player Routes Stub
export function setupPlayerRoutes(app: Express) {
  console.log('✅ setupPlayerRoutes已注册');
}

// Decision Routes Stub
export function setupDecisionRoutes(app: Express) {
  console.log('✅ setupDecisionRoutes已注册');
}

// Audit Routes Stub
export function setupAuditRoutes(app: Express) {
  console.log('✅ setupAuditRoutes已注册');
}

// GameOver Routes Stub
export function setupGameOverRoutes(app: Express) {
  console.log('✅ setupGameOverRoutes已注册');
}

// Multiplayer Routes Stub
export function setupMultiplayerRoutes(
  app: Express,
  wss: WebSocket.Server
) {
  console.log('✅ setupMultiplayerRoutes已注册');
}

// GameSync Routes Stub
export function setupGameSyncRoutes(
  app: Express,
  wss: WebSocket.Server
) {
  console.log('✅ setupGameSyncRoutes已注册');
}

// Coach Routes Stub
export function setupCoachRoutes(app: Express) {
  console.log('✅ setupCoachRoutes已注册');
}
