/**
 * Mini-Router 实现 - 基于 Vue Router 4 设计
 * 支持 Hash 和 History 模式
 */

import { h as hFn } from '../renderer/h'
import { ref, computed } from '../reactivity/reactive'
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

interface RouterInstance {
  install: (app: AppInstance) => void;
  push: (path: string) => void;
  replace: (path: string) => void;
  back: () => void;
  currentRoute: { value: { path: string } };
}

let installed = false;
let routerViewContainer: HTMLElement | null = null;

/**
 * 创建路由实例
 * @param routes 路由配置数组
 * @param mode 路由模式（hash 或 history）
 */
export function createRouter(routes: RouteConfig[], mode: 'hash' | 'history' = 'hash'): RouterInstance {
  const currentPath = ref('/');
  
  // 路由匹配
  const getMatchedComponent = (path: string): Component | null => {
    const route = routes.find(r => r.path === path);
    return route ? route.component : null;
  };

  // 监听 URL 变化
  const handleUrlChange = () => {
    if (mode === 'hash') {
      const hash = window.location.hash.slice(1) || '/';
      currentPath.value = hash;
    } else {
      currentPath.value = window.location.pathname;
    }
    
    // 如果已经安装，重新渲染 RouterView
    if (installed && routerViewContainer) {
      renderRouterView();
    }
  };

  // 渲染 RouterView 组件
  const renderRouterView = () => {
    if (!routerViewContainer) return;
    
    const currentPathValue = currentPath.value;
    const component = getMatchedComponent(currentPathValue);
    
    if (!component) {
      routerViewContainer.innerHTML = '<div>404 Not Found</div>';
      return;
    }
    
    // 创建 VNode 并挂载
    const vnode = hFn(component, {}, []);
    
    if (vnode) {
      routerViewContainer.innerHTML = '';
      mount(vnode, routerViewContainer);
    }
  };

  window.addEventListener('hashchange', handleUrlChange);
  if (mode === 'history') {
    window.addEventListener('popstate', handleUrlChange);
  }
  handleUrlChange(); // 初始化

  return {
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
      
      globalProps.$router = { 
        push: (p: string) => {
          if (mode === 'hash') {
            window.location.hash = p;
          } else {
            window.history.pushState(null, '', p);
            currentPath.value = p;
            renderRouterView();
          }
        },
        replace: (p: string) => {
          if (mode === 'hash') {
            window.location.replace('#' + p);
          } else {
            window.history.replaceState(null, '', p);
            currentPath.value = p;
            renderRouterView();
          }
        },
        back: () => {
          window.history.back();
        }
      };
      
      globalProps.$route = computed(() => ({ path: currentPath.value }));
      
      // 创建 RouterView 容器
      if (app._container) {
        routerViewContainer = document.createElement('div');
        routerViewContainer.id = 'router-view';
        app._container.appendChild(routerViewContainer);
        
        // 首次渲染
        renderRouterView();
      }
    },
    push(path: string) {
      if (mode === 'hash') {
        window.location.hash = path;
      } else {
        window.history.pushState(null, '', path);
        currentPath.value = path;
        if (installed && routerViewContainer) {
          renderRouterView();
        }
      }
    },
    replace(path: string) {
      if (mode === 'hash') {
        window.location.replace('#' + path);
      } else {
        window.history.replaceState(null, '', path);
        currentPath.value = path;
        if (installed && routerViewContainer) {
          renderRouterView();
        }
      }
    },
    back() {
      window.history.back();
    },
    currentRoute: computed(() => ({ path: currentPath.value }))
  };
}

/**
 * 组合式 API：useRouter
 */
export function useRouter(): RouterInstance {
  // 这里简化处理，实际应该从全局状态获取
  throw new Error('useRouter not implemented yet');
}

/**
 * 组合式 API：useRoute
 */
export function useRoute(): { path: string } {
  // 这里简化处理，实际应该从全局状态获取
  throw new Error('useRoute not implemented yet');
}