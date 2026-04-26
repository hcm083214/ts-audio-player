/**
 * 路由系统统一出口
 * 
 * 参照 Vue Router 4 设计
 * 模块化架构：types + urlParser + routeMatcher + routerView + router
 */

// 类型定义
export type { 
  AppInstance,
  RouteConfig,
  RouteLocationNormalizedLoaded,
  Router
} from './types'

// URL 解析工具
export { parseURL, normalizeTo } from './urlParser'

// 路由匹配器
export { matchRoute } from './routeMatcher'

// RouterView 渲染器
export { 
  renderRouterView,
  getRouterViewContainer,
  setRouterViewContainer
} from './routerView'

// 主路由器
export { createRouter, useRouter, useRoute } from './router'
