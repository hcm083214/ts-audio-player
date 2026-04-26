/**
 * RouterView 渲染器 - 负责渲染匹配到的组件
 * 
 * 参照 Vue Router 4 设计
 */

import { h as hFn } from '../renderer/h'
import { mount } from '../renderer/mount'
import { RouteConfig, RouteLocationNormalizedLoaded } from './types'
import { matchRoute } from './routeMatcher'

/**
 * RouterView 容器引用（单例）
 */
let routerViewContainer: HTMLElement | null = null;

/**
 * 获取 RouterView 容器
 */
export function getRouterViewContainer(): HTMLElement | null {
  return routerViewContainer;
}

/**
 * 设置 RouterView 容器
 */
export function setRouterViewContainer(container: HTMLElement | null): void {
  routerViewContainer = container;
}

/**
 * 渲染 RouterView 组件
 * @param currentPath 当前路径
 * @param routes 路由配置数组
 */
export function renderRouterView(currentPath: string, routes: RouteConfig[]): void {
  if (!routerViewContainer) {
    console.error('[Router] routerViewContainer 为空!');
    return;
  }
  
  const { component, matchedRoute } = matchRoute(currentPath, routes);
  
  if (!component) {
    console.warn('[Router] 未找到匹配的组件,路径:', currentPath);
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
}
