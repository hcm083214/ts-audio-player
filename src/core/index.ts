// Core 模块统一导出 - 基于 mVue.ts 架构

// 响应式系统
export { 
  reactive, 
  ref, 
  computed, 
  watchEffect, 
  onMounted, 
  onUnmounted, 
  triggerMounted, 
  triggerUnmounted,
  ReactiveEffect
} from './reactivity/reactive'

// 渲染器核心
export { h } from './renderer/h'
export { mount } from './renderer/mount'
export { patch } from './renderer/patch'
export { render } from './renderer/render'

// 类型定义
export type { VNode, Component, ComponentInstance, VNodeType } from './renderer/types'
export { Fragment } from './renderer/types'

// 编译器
export { compile, createRuntimeCompiler, compileComponent, normalizeClass } from './compiler/index'
export { interpolate, evaluateExpression } from './compiler/interpolate'

// 路由系统
export { createRouter } from './compiler/router'

// 向后兼容：导出 buildVNode（如果存在）
// export { buildVNode } from './renderer/buildVNode'
