/**
 * Mini-Router 实现 - 基于 mVue.ts
 * 支持 Hash 和 History 模式
 */

import { h as hFn } from '../renderer/h'
import { ref, computed } from '../reactivity/reactive'
import { Component, VNode } from '../renderer/types'

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
  [key: string]: any;
}

interface RouterInstance {
  install: (app: AppInstance) => void;
  view: Component;
  push: (path: string) => void;
}

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
  };

  window.addEventListener('hashchange', handleUrlChange);
  handleUrlChange(); // 初始化

  return {
    install(app: AppInstance) {
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
          }
        }
      };
      
      globalProps.$route = computed(() => ({ path: currentPath.value }));
    },
    view: {
      setup() {
        return { currentPath };
      },
      render(h: typeof hFn, ctx: Record<string, any>, normalizeClass: Function) {
        const currentPathValue = (ctx.currentPath as { value: string })?.value;
        const component = getMatchedComponent(currentPathValue);
        if (!component) return hFn('div', {}, '404 Not Found') as VNode;
        // 动态渲染组件 - Component 本身可以作为 type 传递给 h
        return hFn(component, {}, []) as VNode;
      }
    },
    push(path: string) {
      if (mode === 'hash') {
        window.location.hash = path;
      } else {
        window.history.pushState(null, '', path);
        currentPath.value = path;
      }
    }
  };
}