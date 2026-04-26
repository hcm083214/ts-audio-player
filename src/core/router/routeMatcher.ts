/**
 * 路由匹配器 - 根据路径匹配对应的组件
 * 
 * 参照 Vue Router 4 设计
 */

import { RouteConfig } from './types'
import { Component } from '../renderer/types'

/**
 * 匹配路由并返回组件和参数
 * @param path 当前路径
 * @param routes 路由配置数组
 * @returns 匹配的组件和参数
 */
export function matchRoute(path: string, routes: RouteConfig[]): { component: Component | null; params: Record<string, string>; matchedRoute?: RouteConfig } {
  // 简单匹配：先尝试精确匹配
  let route = routes.find(r => r.path === path);
  
  if (route) {
    return { component: route.component, params: {}, matchedRoute: route };
  }
  
  // TODO: 支持动态路由参数（如 /user/:id）
  // 这里简化处理，仅支持精确匹配
  
  return { component: null, params: {} };
}
