/**
 * 税务风险沙盘游戏 - 前端主入口
 * Vue 3 + TypeScript
 * v1.0 正式版本
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

// 全局样式
import './style.css';

// 创建Vue应用
const app = createApp(App);

// 使用插件
app.use(createPinia());
app.use(router);

// 全局配置
app.config.globalProperties.$apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
app.config.globalProperties.$wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

// 挂载应用
app.mount('#app');
