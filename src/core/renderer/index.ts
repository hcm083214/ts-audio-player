// Core 模块统一导出
// 导出类型
export { Fragment } from './types'
export type { VNode, Component, ComponentInstance, VNodeType } from './types'

// 导出核心函数
export { h } from './h'
export { mount } from './mount'
export { patch } from './patch'
export { render } from './render'

// 导出响应式系统
export { ref, reactive, computed, effect, onMounted, onUnmounted } from '../reactivity/reactive'

// 向后兼容：导出编译器（从 compiler 文件夹）
export { compileComponent, createRuntimeCompiler } from '../compiler/compileComponent'
export { buildVNode } from './buildVNode'
export { interpolate, evaluateExpression } from '../compiler/interpolate'