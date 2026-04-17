console.log('[Main] 开始执行 main.ts')

import { createRouter } from './router'
import TestPage from './pages/TestPage'
import { h } from './core/renderer/h'

console.log('[Main] 模块导入完成')

// 获取应用容器
const app = document.getElementById('app')
console.log('[Main] app 容器:', app)

if (!app) {
  throw new Error('App container not found')
}

// 路由配置
const routes = [
  {
    path: '/',
    component: () => h(TestPage, {})
  },
  {
    path: '/test',
    component: () => h(TestPage, {})
  }
]

console.log('[Main] 路由配置完成，routes:', routes)

// 创建路由实例（使用 hash 模式，更稳定且无需服务器配置）
console.log('[Main] 开始创建路由实例...')
const router = createRouter(routes, app, 'hash')
console.log('[Main] 路由实例创建完成')

// 导出路由实例
export default router
