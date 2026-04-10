// 组件上下文类型
export interface ComponentContext {
  emit: (event: string, ...args: any[]) => void
}

// 组件类型
export interface Component {
  setup?: (props: any, context: ComponentContext) => any
  render?: (...args: any[]) => VNode
  props?: string[]
  emits?: string[]
}

// 虚拟 DOM 节点
export interface VNode {
  type: VNodeType
  props: Record<string, any>
  children: VNode[] | string
  el?: Element
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

// 片段类型符号 - 实际导出
export const Fragment = Symbol('Fragment')

// 虚拟 DOM 节点类型
export type VNodeType = string | typeof Fragment | Component
