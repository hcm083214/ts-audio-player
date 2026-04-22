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
    console.log('[Router] handleUrlChange 被调用');
    console.log('[Router] window.location.hash:', window.location.hash);
    console.log('[Router] window.location.pathname:', window.location.pathname);
    
    if (mode === 'hash') {
      const hash = window.location.hash.slice(1) || '/';
      console.log('[Router] 解析后的路径:', hash);
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
    console.log('[Router] renderRouterView 被调用');
    console.log('[Router] currentPath.value:', currentPath.value);
    console.log('[Router] routerViewContainer:', routerViewContainer);
    
    if (!routerViewContainer) {
      console.error('[Router] routerViewContainer 为空!');
      return;
    }
    
    const currentPathValue = currentPath.value;
    const component = getMatchedComponent(currentPathValue);
    
    console.log('[Router] 匹配到的组件:', component);
    
    if (!component) {
      console.warn('[Router] 未找到匹配的组件,路径:', currentPathValue);
      routerViewContainer.innerHTML = '<div>404 Not Found</div>';
      return;
    }
    
    // 创建 VNode 并挂载
    const vnode = hFn(component, {}, []);
    console.log('[Router] 创建的 VNode:', vnode);
    
    if (vnode) {
      routerViewContainer.innerHTML = '';
      console.log('[Router] 开始 mount...');
      mount(vnode, routerViewContainer);
      console.log('[Router] mount 完成, container.innerHTML:', routerViewContainer.innerHTML.substring(0, 100));
    } else {
      console.error('[Router] VNode 为空!');
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
        console.log('[Router] install: app._container 存在', app._container);
        routerViewContainer = document.createElement('div');
        routerViewContainer.id = 'router-view';
        console.log('[Router] 创建 routerViewContainer:', routerViewContainer);
        
        app._container.appendChild(routerViewContainer);
        console.log('[Router] routerViewContainer 已添加到 DOM');
        console.log('[Router] app._container 当前内容:', app._container.innerHTML.substring(0, 100));
        
        // 首次渲染
        console.log('[Router] 开始首次渲染...');
        renderRouterView();
      } else {
        console.error('[Router] install: app._container 不存在!');
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