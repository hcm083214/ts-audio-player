/**
 * Mini-Router 实现 - 基于 mVue.ts
 * 支持 Hash 和 History 模式
 */

import { h } from '../renderer/h'
import { ref, computed } from '../reactivity/reactive'

interface RouteConfig {
  path: string;
  component: any;
}

interface RouterInstance {
  install: (app: any) => void;
  view: any;
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
  const getMatchedComponent = (path: string) => {
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
    install(app: any) {
      // 注入全局属性 $router 和 $route
      app.config.globalProperties.$router = { 
        push: (p: string) => {
          if (mode === 'hash') {
            window.location.hash = p;
          } else {
            window.history.pushState(null, '', p);
          }
        }
      };
      app.config.globalProperties.$route = computed(() => ({ path: currentPath.value }));
    },
    view: {
      setup() {
        return { currentPath };
      },
      render(ctx: any) {
        const component = getMatchedComponent(ctx.currentPath.value);
        if (!component) return h('div', {}, '404 Not Found');
        // 动态渲染组件
        return h(component);
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
