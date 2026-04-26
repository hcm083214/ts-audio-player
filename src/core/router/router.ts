/**
 * 路由器核心 - Mini-Router 实现
 * 
 * 参照 Vue Router 4 设计
 * 模块化架构：types + urlParser + routeMatcher + routerView
 */

import { ref, computed, reactive } from '../reactivity/reactive'
import { RouteConfig, Router, AppInstance, RouteLocationNormalizedLoaded } from './types'
import { parseURL, normalizeTo } from './urlParser'
import { matchRoute } from './routeMatcher'
import { renderRouterView, setRouterViewContainer, getRouterViewContainer } from './routerView'

// 全局路由实例（单例模式）
let currentRouterInstance: Router | null = null;
let installed = false;

/**
 * 创建路由实例
 * @param routes 路由配置数组
 * @param mode 路由模式（hash 或 history）
 */
export function createRouter(routes: RouteConfig[], mode: 'hash' | 'history' = 'hash'): Router {
  const currentPath = ref('/');
  const currentRoute = reactive<RouteLocationNormalizedLoaded>({
    path: '/',
    fullPath: '/',
    params: {},
    query: {},
    hash: '',
    matched: []
  });

  // 更新当前路由信息
  const updateCurrentRoute = (path: string) => {
    const parsed = parseURL(path);
    const { component, params, matchedRoute } = matchRoute(parsed.path, routes);
    
    currentRoute.path = parsed.path;
    currentRoute.fullPath = path;
    currentRoute.query = parsed.query;
    currentRoute.hash = parsed.hash;
    currentRoute.params = params;
    currentRoute.matched = matchedRoute ? [matchedRoute] : [];
    
    currentPath.value = parsed.path;
  };

  // 监听 URL 变化
  const handleUrlChange = () => {
    let newPath = '/';
    
    if (mode === 'hash') {
      newPath = window.location.hash.slice(1) || '/';
    } else {
      newPath = window.location.pathname;
    }
    
    updateCurrentRoute(newPath);
    
    // 如果已经安装，重新渲染 RouterView
    if (installed) {
      const container = getRouterViewContainer();
      if (container) {
        renderRouterView(currentPath.value, routes);
      }
    }
  };

  // 监听事件
  window.addEventListener('hashchange', handleUrlChange);
  if (mode === 'history') {
    window.addEventListener('popstate', handleUrlChange);
  }
  
  // 初始化
  handleUrlChange();

  // 创建路由器实例
  const router: Router = {
    install(app: AppInstance) {
      installed = true;
      
      // 注入全局属性 $router 和 $route
      if (!app.config) {
        app.config = {};
      }
      if (!app.config.globalProperties) {
        app.config.globalProperties = {};
      }
      
      const globalProps = app.config.globalProperties;
      
      globalProps.$router = router;
      globalProps.$route = currentRoute;
      
      // 创建 RouterView 容器
      if (app._container) {
        const routerViewContainer = document.createElement('div');
        routerViewContainer.id = 'router-view';
        
        app._container.appendChild(routerViewContainer);
        
        // 保存容器引用
        setRouterViewContainer(routerViewContainer);
        
        // 首次渲染
        renderRouterView(currentPath.value, routes);
      } else {
        console.error('[Router] install: app._container 不存在!');
      }
    },
    
    async push(to: string | { path: string; query?: Record<string, any>; params?: Record<string, any> }) {
      const path = normalizeTo(to);
      
      if (mode === 'hash') {
        window.location.hash = path;
      } else {
        window.history.pushState(null, '', path);
        updateCurrentRoute(path);
        if (installed) {
          renderRouterView(currentPath.value, routes);
        }
      }
    },
    
    async replace(to: string | { path: string; query?: Record<string, any>; params?: Record<string, any> }) {
      const path = normalizeTo(to);
      
      if (mode === 'hash') {
        window.location.replace('#' + path);
      } else {
        window.history.replaceState(null, '', path);
        updateCurrentRoute(path);
        if (installed) {
          renderRouterView(currentPath.value, routes);
        }
      }
    },
    
    go(delta: number) {
      window.history.go(delta);
    },
    
    back() {
      window.history.back();
    },
    
    forward() {
      window.history.forward();
    },
    
    currentRoute: computed(() => ({ ...currentRoute })),
    
    mode
  };
  
  // 保存全局实例
  currentRouterInstance = router;
  
  return router;
}

/**
 * 组合式 API：useRouter
 * 参照 Vue Router 4 实现，返回当前路由实例
 */
export function useRouter(): Router {
  if (!currentRouterInstance) {
    throw new Error('useRouter() called before router is installed. Call createRouter() and install() first.');
  }
  return currentRouterInstance;
}

/**
 * 组合式 API：useRoute
 * 参照 Vue Router 4 实现，返回当前路由信息的响应式对象
 */
export function useRoute(): RouteLocationNormalizedLoaded {
  if (!currentRouterInstance) {
    throw new Error('useRoute() called before router is installed. Call createRouter() and install() first.');
  }
  return currentRouterInstance.currentRoute.value;
}
