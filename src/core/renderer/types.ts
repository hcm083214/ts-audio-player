// 组件上下文类型
export interface ComponentContext {
  emit: (event: string, ...args: any[]) => void
}

// 组件类型
export interface Component {
  setup?: (props: any, context: ComponentContext) => any
  render?: (...args: any[]) => VNode
  template?: string  // 支持模板字符串
  props?: string[]
  emits?: string[]
}

// 虚拟 DOM 节点 - 基于 mVue.ts 实现
export interface VNode {
  type: string | Function  // 支持字符串标签或组件函数
  props?: any
  children?: VNode[] | string
  el?: HTMLElement | SVGElement  // 支持 SVG 元素
  key?: any
  tag?: string  // 原始标签名，用于 SVG 判断
  component?: ComponentInstance
}

// 组件实例
export interface ComponentInstance {
  vnode: VNode
  props: Record<string, any>
  setupState: any
  render: (...args: any[]) => VNode
  isMounted: boolean
  subTree: VNode | null
}

// 片段类型符号
export const Fragment = Symbol('Fragment')

// 虚拟 DOM 节点类型
export type VNodeType = string | typeof Fragment | Component
