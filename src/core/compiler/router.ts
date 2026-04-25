/**
 * Mini-Router 实现 - 基于 Vue Router 4 设计
 * 支持 Hash 和 History 模式
 */

import { h as hFn } from '../renderer/h'
import { ref, computed, reactive } from '../reactivity/reactive'
import { Component, VNode } from '../renderer/types'
import { mount } from '../renderer/mount'

interface RouteConfig {
  path: string;
  component: Component;
}

// 应用实例类型
export interface AppInstance {
  config?: {
    globalProperties?: Record<string, any>;
    [key: string]: any;
  };
  _container?: HTMLElement;
  [key: string]: any;
}

// 路由信息接口（参照 Vue Router 4）
export interface RouteLocationNormalizedLoaded {
  path: string;
  fullPath: string;
  params: Record<string, string | string[]>;
  query: Record<string, string | string[]>;
  hash: string;
  name?: string;
  matched: RouteConfig[];
}

// 路由器实例接口（参照 Vue Router 4）
export interface Router {
  install: (app: AppInstance) => void;
  push: (to: string | { path: string; query?: Record<string, any>; params?: Record<string, any> }) => Promise<void>;
  replace: (to: string | { path: string; query?: Record<string, any>; params?: Record<string, any> }) => Promise<void>;
  go: (delta: number) => void;
  back: () => void;
  forward: () => void;
  currentRoute: { value: RouteLocationNormalizedLoaded };
  mode: 'hash' | 'history';
}

// 全局路由实例（单例模式）
let currentRouterInstance: Router | null = null;
let installed = false;
let routerViewContainer: HTMLElement | null = null;

/**
 * 解析 URL，提取 path、query、hash、params
 */
function parseURL(url: string): { path: string; query: Record<string, string>; hash: string } {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  
  let path = url;
  let queryStr = '';
  let hash = '';
  
  if (hashIndex !== -1) {
    path = url.substring(0, hashIndex);
    hash = url.substring(hashIndex);
  }
  
  if (queryIndex !== -1 && (hashIndex === -1 || queryIndex < hashIndex)) {
    const queryEnd = hashIndex !== -1 ? hashIndex : url.length;
    path = url.substring(0, queryIndex);
    queryStr = url.substring(queryIndex + 1, queryEnd);
  }
  
  // 解析 query 参数
  const query: Record<string, string> = {};
  if (queryStr) {
    queryStr.split('&').forEach(param => {
      const [key, value] = param.split('=');
      if (key) {
        query[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
      }
    });
  }
  
  return { path, query, hash };
}

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
  
  // 路由匹配
  const getMatchedComponent = (path: string): { component: Component | null; params: Record<string, string> } => {
    // 简单匹配：先尝试精确匹配
    let route = routes.find(r => r.path === path);
    
    if (route) {
      return { component: route.component, params: {} };
    }
    
    // TODO: 支持动态路由参数（如 /user/:id）
    // 这里简化处理，仅支持精确匹配
    
    return { component: null, params: {} };
  };

  // 更新当前路由信息
  const updateCurrentRoute = (path: string) => {
    const parsed = parseURL(path);
    const matched = getMatchedComponent(parsed.path);
    
    currentRoute.path = parsed.path;
    currentRoute.fullPath = path;
    currentRoute.query = parsed.query;
    currentRoute.hash = parsed.hash;
    currentRoute.params = matched.params;
    currentRoute.matched = matched.component ? [routes.find(r => r.path === parsed.path)!] : [];
    
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
    if (installed && routerViewContainer) {
      renderRouterView();
    }
  };

  // 渲染 RouterView 组件
  const renderRouterView = () => {
    if (!routerViewContainer) {
      console.error('[Router] routerViewContainer 为空!');
      return;
    }
    
    const currentPathValue = currentPath.value;
    const { component } = getMatchedComponent(currentPathValue);
    
    if (!component) {
      console.warn('[Router] 未找到匹配的组件,路径:', currentPathValue);
      routerViewContainer.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">404 Not Found</div>';
      return;
    }
    
    // 创建 VNode 并挂载
    const vnode = hFn(component, {}, []);
    
    if (vnode) {
      routerViewContainer.innerHTML = '';
      mount(vnode, routerViewContainer);
    } else {
      console.error('[Router] VNode 为空!');
    }
  };

  // 标准化导航目标
  const normalizeTo = (to: string | { path: string; query?: Record<string, any>; params?: Record<string, any> }): string => {
    if (typeof to === 'string') {
      return to;
    }
    
    let path = to.path;
    
    // 添加 query 参数
    if (to.query && Object.keys(to.query).length > 0) {
      const queryString = Object.entries(to.query)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');
      path += `?${queryString}`;
    }
    
    // TODO: 处理 params（需要动态路由支持）
    
    return path;
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
        routerViewContainer = document.createElement('div');
        routerViewContainer.id = 'router-view';
        
        app._container.appendChild(routerViewContainer);
        
        // 首次渲染
        renderRouterView();
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
        if (installed && routerViewContainer) {
          renderRouterView();
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
        if (installed && routerViewContainer) {
          renderRouterView();
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