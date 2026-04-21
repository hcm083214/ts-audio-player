// 组件上下文类型
export interface ComponentContext {
  emit: (event: string, ...args: unknown[]) => void
}

// Setup 函数返回类型
export type SetupResult = Record<string, unknown> | ((...args: unknown[]) => unknown)

// 组件类型
export interface Component {
  setup?: (props: Record<string, unknown>, context: ComponentContext) => SetupResult
  render?: (...args: unknown[]) => VNode
  template?: string  // 支持模板字符串
  props?: string[]
  emits?: string[]
}

// 虚拟 DOM 节点 - 基于 mVue.ts 实现
export interface VNode {
  type: string | Function  // 支持字符串标签或组件函数
  props?: Record<string, unknown>
  children?: VNode[] | string
  el?: HTMLElement | SVGElement  // 支持 SVG 元素
  key?: string | number
  tag?: string  // 原始标签名，用于 SVG 判断
  component?: ComponentInstance
}

// 组件实例
export interface ComponentInstance {
  vnode: VNode
  props: Record<string, unknown>
  setupState: SetupResult
  render: (...args: unknown[]) => VNode
  isMounted: boolean
  subTree: VNode | null
}

// 片段类型符号
export const Fragment = Symbol('Fragment')

// 虚拟 DOM 节点类型
export type VNodeType = string | typeof Fragment | Component