import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import GameView from '../views/GameView.vue';
import SetupView from '../views/SetupView.vue';
import ResultView from '../views/ResultView.vue';
import DiagnosticView from '../views/DiagnosticView.vue';

const routes: RouteRecordRaw[] = [
  // 首页
  {
    path: '/',
    name: 'Home',
    component: HomeView
  },
  
  // 游戏设置
  {
    path: '/setup',
    name: 'Setup',
    component: SetupView
  },
  
  // 游戏主界面
  {
    path: '/game',
    name: 'Game',
    component: GameView
  },
  {
    path: '/game/:gameId',
    name: 'GameWithId',
    component: GameView
  },
  
  // 游戏结果
  {
    path: '/result',
    name: 'Result',
    component: ResultView
  },
  {
    path: '/result/:gameId',
    name: 'ResultWithId',
    component: ResultView
  },
  
  // 诊断工具
  {
    path: '/diagnostic',
    name: 'Diagnostic',
    component: DiagnosticView
  },
  
  // 多人游戏
  {
    path: '/multiplayer',
    name: 'Multiplayer',
    component: () => import('../components/MultiplayerLobby.vue')
  },
  {
    path: '/multiplayer/room/:roomId',
    name: 'MultiplayerRoom',
    component: () => import('../components/MultiplayerGameRoom.vue')
  },
  {
    path: '/multiplayer/game/:gameId',
    name: 'MultiplayerGame',
    component: () => import('../components/MultiplayerGameFlow.vue')
  },
  
  // 404处理（必须放在最后）
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundView.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
