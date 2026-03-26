import { h, render, VNode } from '../core/renderer'

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

// 路由类
class Router {
  private state: RouterState
  private container: Element

  constructor(routes: RouteConfig[], container: Element) {
    this.state = {
      currentRoute: window.location.pathname,
      routes
    }
    this.container = container
    this.init()
  }

  private init() {
    // 监听路由变化
    window.addEventListener('popstate', () => {
      this.state.currentRoute = window.location.pathname
      this.render()
    })

    // 初始渲染
    this.render()
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
  navigate(path: string) {
    window.history.pushState(null, '', path)
    this.state.currentRoute = path
    this.render()
  }

  // 替换当前路径
  replace(path: string) {
    window.history.replaceState(null, '', path)
    this.state.currentRoute = path
    this.render()
  }
}

// 创建路由实例
function createRouter(routes: RouteConfig[], container: Element) {
  return new Router(routes, container)
}

export { createRouter }
export type { RouteConfig }