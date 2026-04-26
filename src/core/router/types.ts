/**
 * 路由系统类型定义
 * 
 * 参照 Vue Router 4 设计
 */

import { Component } from '../renderer/types'

/**
 * 应用实例类型
 */
export interface AppInstance {
  config?: {
    globalProperties?: Record<string, any>;
    [key: string]: any;
  };
  _container?: HTMLElement;
  [key: string]: any;
}

/**
 * 路由配置接口
 */
export interface RouteConfig {
  path: string;
  component: Component;
  name?: string;
}

/**
 * 路由信息接口（参照 Vue Router 4）
 */
export interface RouteLocationNormalizedLoaded {
  path: string;
  fullPath: string;
  params: Record<string, string | string[]>;
  query: Record<string, string | string[]>;
  hash: string;
  name?: string;
  matched: RouteConfig[];
}

/**
 * 路由器实例接口（参照 Vue Router 4）
 */
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
