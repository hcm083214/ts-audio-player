/**
 * buildVNode 模块 - 从 DOM 构建虚拟节点
 * 
 * 该模块已拆分为以下子模块：
 * - svgHelpers.ts: SVG 相关的辅助函数
 * - attributeParser.ts: 属性解析和事件处理逻辑
 * - vnodeBuilder.ts: VNode 构建的核心逻辑
 */

// 导出核心函数
export { buildVNode } from './vnodeBuilder'

// 导出辅助函数（如果需要）
export { isSvgChild } from './svgHelpers'
export { parseAttributes, parseEventHandler } from './attributeParser'
