// Renderer 模块统一导出 - 基于 mVue.ts 架构

// 导出类型
export { Fragment } from './types'
export type { VNode, Component, ComponentInstance, VNodeType } from './types'

// 导出核心函数
export { h } from './h'
export { mount } from './mount'
export { patch } from './patch'
export { render } from './render'

// 注意：以下文件已不再使用，但保留供向后兼容
// - buildVNode.ts (已被新编译器替代)
// - mountComponent.ts (组件挂载逻辑已简化)
// - patchProp.ts (属性处理已整合到 mount/patch)
// - svgHelpers.ts (SVG 处理已整合)
// - vnodeBuilder.ts (已被新编译器替代)
// - attributeParser.ts (属性解析已整合)
