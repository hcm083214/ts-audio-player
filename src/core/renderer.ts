// Core 模块统一导出
// 导出类型
export { Fragment } from './types'
export type { VNode, Component, ComponentInstance, VNodeType } from './types'

// 导出核心函数
export { h } from './h'
export { mount } from './mount'
export { patch } from './patch'
export { render } from './render'

// 导出模板编译器
export { compileComponent, createRuntimeCompiler } from './compileComponent'
export { buildVNode } from './buildVNode'
export { interpolate, evaluateExpression } from './interpolate'

// 向后兼容导出将在 TypeScript 缓存刷新后启用
// export { compileComponent as compileComponentCompat } from './template-compiler'
