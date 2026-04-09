import { h, render, VNode } from '../core'

// 路由配置类型
interface RouteConfig {
  path: string
  component: () => VNode
  children?: RouteConfig[]
}

// 路由状态
interface RouterState {
  currentRoute: string
  routes: RouteConfig[]
}

// 当前路由信息接口
interface RouteLocation {
  path: string
  fullPath: string
  params: Record<string, string>
  query: Record<string, string>
  hash: string
}

// 路由导航方法
interface RouterNavigation {
  push: (path: string) => void
  replace: (path: string) => void
  go: (delta: number) => void
  back: () => void
  forward: () => void
}

// 完整路由实例接口
interface RouterInstance extends RouterNavigation {
  currentRoute: RouteLocation
  addRoute: (route: RouteConfig) => void
  removeRoute: (path: string) => void
  getRoutes: () => RouteConfig[]
}

// 全局路由实例存储
let currentRouter: Router | null = null

// 路由类
class Router {
  private state: RouterState
  private container: Element
  public currentRoute: RouteLocation

  constructor(routes: RouteConfig[], container: Element) {
    this.state = {
      currentRoute: window.location.pathname,
      routes
    }
    this.container = container
    this.currentRoute = this.parseRoute(window.location.pathname)
    
    // 设置为当前全局路由实例
    currentRouter = this
    
    this.init()
  }

  private init() {
    // 监听路由变化
    window.addEventListener('popstate', () => {
      this.state.currentRoute = window.location.pathname
      this.currentRoute = this.parseRoute(window.location.pathname)
      this.render()
    })

    // 初始渲染
    this.render()
  }

  private parseRoute(path: string): RouteLocation {
    const url = new URL(path, window.location.origin)
    return {
      path: url.pathname,
      fullPath: path,
      params: {},
      query: Object.fromEntries(url.searchParams.entries()),
      hash: url.hash
    }
  }

  private render() {
    const { currentRoute, routes } = this.state
    const component = this.matchRoute(currentRoute, routes)
    if (component) {
      // 清空容器
      this.container.innerHTML = ''
      // 渲染组件
      render(component(), this.container)
    }
  }

  private matchRoute(path: string, routes: RouteConfig[]): (() => VNode) | null {
    for (const route of routes) {
      if (route.path === path) {
        return route.component
      }
      if (route.children) {
        const matched = this.matchRoute(path, route.children)
        if (matched) {
          return matched
        }
      }
    }
    return null
  }

  // 导航到指定路径
  push(path: string) {
    window.history.pushState(null, '', path)
    this.state.currentRoute = path
    this.currentRoute = this.parseRoute(path)
    this.render()
  }

  // 替换当前路径
  replace(path: string) {
    window.history.replaceState(null, '', path)
    this.state.currentRoute = path
    this.currentRoute = this.parseRoute(path)
    this.render()
  }

  // 前进/后退
  go(delta: number) {
    window.history.go(delta)
  }

  // 后退
  back() {
    window.history.back()
  }

  // 前进
  forward() {
    window.history.forward()
  }

  // 动态添加路由
  addRoute(route: RouteConfig) {
    this.state.routes.push(route)
  }

  // 移除路由
  removeRoute(path: string) {
    this.state.routes = this.state.routes.filter(route => route.path !== path)
  }

  // 获取所有路由
  getRoutes(): RouteConfig[] {
    return [...this.state.routes]
  }
}

// 创建路由实例
function createRouter(routes: RouteConfig[], container: Element): RouterInstance {
  return new Router(routes, container) as unknown as RouterInstance
}

// 组合式 API：获取路由实例
function useRouter(): RouterInstance {
  if (!currentRouter) {
    throw new Error('useRouter() 必须在 createRouter() 之后调用')
  }
  return currentRouter as unknown as RouterInstance
}

// 组合式 API：获取当前路由信息
function useRoute(): RouteLocation {
  if (!currentRouter) {
    throw new Error('useRoute() 必须在 createRouter() 之后调用')
  }
  return currentRouter.currentRoute
}

export { createRouter, useRouter, useRoute }
export type { RouteConfig, RouteLocation, RouterInstance }
