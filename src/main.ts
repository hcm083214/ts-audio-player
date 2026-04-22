import { createRouter } from './core/compiler/router'
import TestPage from './pages/TestPage'
import HomePage from './pages/HomePage'

console.log('[Main] 开始执行 main.ts')

// 获取 app 容器
const app = document.getElementById('app')
if (!app) {
  throw new Error('App container not found')
}
console.log('[Main] app 容器:', app)

// 导入模块完成
console.log('[Main] 模块导入完成')

// 配置路由
const routes = [
  {
    path: '/',
    component: HomePage
  },
  {
    path: '/test',
    component: TestPage
  }
]

console.log('[Main] 路由配置完成，routes:', routes)

// 创建路由实例（使用 hash 模式，更稳定且无需服务器配置）
console.log('[Main] 开始创建路由实例...')
const router = createRouter(routes, 'hash')
console.log('[Main] 路由实例创建完成')

// 安装路由（会自动创建 RouterView 并挂载）
console.log('[Main] 开始安装路由...')
router.install({ _container: app as HTMLElement })
console.log('[Main] 路由安装完成')

// 导出路由实例
export default router
