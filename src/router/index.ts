import { h, render, VNode } from '../core'

// 路由模式
type RouterMode = 'hash' | 'history'

// 路由配置类型
interface RouteConfig {
  path: string
  component: () => VNode | null
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
  private mode: RouterMode
  public currentRoute: RouteLocation

  constructor(routes: RouteConfig[], container: Element, mode: RouterMode = 'hash') {
    this.mode = mode
    this.container = container
    
    // 根据模式获取初始路径
    const path = this.getCurrentPath()
    this.state = {
      currentRoute: path,
      routes
    }
    this.currentRoute = this.parseRoute(path)
    
    // 设置为当前全局路由实例
    currentRouter = this
    
    this.init()
  }

  // 获取当前路径（根据模式）
  private getCurrentPath(): string {
    if (this.mode === 'hash') {
      return window.location.hash.slice(1) || '/'
    } else {
      return window.location.pathname
    }
  }

  private init() {
    // 根据模式监听不同的事件
    if (this.mode === 'hash') {
      // hash 模式：监听 hashchange
      window.addEventListener('hashchange', () => {
        const path = this.getCurrentPath()
        this.state.currentRoute = path
        this.currentRoute = this.parseRoute(path)
        this.render()
      })
    } else {
      // history 模式：监听 popstate
      window.addEventListener('popstate', () => {
        const path = this.getCurrentPath()
        this.state.currentRoute = path
        this.currentRoute = this.parseRoute(path)
        this.render()
      })
    }

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
    console.log('[Router] ========== render 开始 ==========')
    const { currentRoute, routes } = this.state
    console.log('[Router] 当前路由:', currentRoute)
    console.log('[Router] 所有路由:', routes.map(r => r.path))
    
    const component = this.matchRoute(currentRoute, routes)
    console.log('[Router] 匹配到的组件:', component)
    
    if (component) {
      // 清空容器
      this.container.innerHTML = ''
      console.log('[Router] 容器已清空')
      
      // 渲染组件
      try {
        const vnode = component()
        console.log('[Router] 生成的 VNode:', vnode)
        
        if (vnode) {
          render(vnode, this.container as HTMLElement)
          console.log('[Router] 渲染完成')
          console.log('[Router] 容器内容:', this.container.innerHTML.substring(0, 200))
        } else {
          console.error('[Router] 组件返回了 null VNode')
          this.container.innerHTML = '<div style="color: red; padding: 20px;">错误：组件返回了 null</div>'
        }
      } catch (error) {
        console.error('[Router] 渲染时发生错误:', error)
        this.container.innerHTML = `<div style="color: red; padding: 20px;">渲染错误：${error}</div>`
      }
    } else {
      console.error('[Router] 未匹配到任何路由')
      this.container.innerHTML = '<div style="color: red; padding: 20px;">404 - 路由未找到</div>'
    }
    
    console.log('[Router] ========== render 结束 ==========')
  }

  private matchRoute(path: string, routes: RouteConfig[]): (() => VNode | null) | null {
    for (const route of routes) {
      // 检查是否完全匹配
      if (route.path === path) {
        return route.component
      }
      
      // 检查动态路由匹配（如 /playlist/:id）
      const routePattern = route.path
      const pathSegments = path.split('/').filter(Boolean)
      const patternSegments = routePattern.split('/').filter(Boolean)
      
      // 如果段数相同，可能是动态路由
      if (pathSegments.length === patternSegments.length) {
        let isMatch = true
        const params: Record<string, string> = {}
        
        for (let i = 0; i < patternSegments.length; i++) {
          const patternSegment = patternSegments[i]
          const pathSegment = pathSegments[i]
          
          // 如果模式段是动态参数（以:开头）
          if (patternSegment.startsWith(':')) {
            const paramName = patternSegment.substring(1)
            params[paramName] = pathSegment
          } 
          // 否则必须是完全匹配
          else if (patternSegment !== pathSegment) {
            isMatch = false
            break
          }
        }
        
        // 如果匹配成功，更新 currentRoute 的 params
        if (isMatch) {
          this.currentRoute.params = params
          return route.component
        }
      }
      
      // 递归检查子路由
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
    if (this.mode === 'hash') {
      window.location.hash = path
    } else {
      window.history.pushState(null, '', path)
      this.state.currentRoute = path
      this.currentRoute = {
        ...this.parseRoute(path),
        params: {}
      }
      this.render()
    }
  }

  // 替换当前路径
  replace(path: string) {
    if (this.mode === 'hash') {
      window.location.hash = path
    } else {
      window.history.replaceState(null, '', path)
      this.state.currentRoute = path
      this.currentRoute = {
        ...this.parseRoute(path),
        params: {}
      }
      this.render()
    }
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
function createRouter(routes: RouteConfig[], container: Element, mode: RouterMode = 'hash'): RouterInstance {
  return new Router(routes, container, mode) as unknown as RouterInstance
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
export type { RouteConfig, RouteLocation, RouterInstance, RouterMode }
