import { createRouter } from './router'
import HomePage from './pages/HomePage'
import PlayerPage from './pages/PlayerPage'
import { h } from './core/renderer'

// 获取应用容器
const app = document.getElementById('app')
if (!app) {
  throw new Error('App container not found')
}

// 路由配置
const routes = [
  {
    path: '/',
    component: () => h(HomePage, {})
  },
  {
    path: '/player',
    component: () => h(PlayerPage, {})
  }
]

// 创建路由实例
const router = createRouter(routes, app)

// 导出路由实例
export default router