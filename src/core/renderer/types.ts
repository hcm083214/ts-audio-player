// 组件上下文类型
export interface ComponentContext {
  emit: (event: string, ...args: any[]) => void
}

// 组件选项类型
export interface ComponentOptions {
  setup?: (props: any, context: ComponentContext) => any
  render?: (...args: any[]) => VNode | VNode[]
  props?: string[]
  emits?: string[]
  components?: Record<string, ComponentOptions>
  template?: string
}

// 虚拟 DOM 节点类型
export type VNodeType = string | symbol | ComponentOptions

// 虚拟 DOM 节点
export interface VNode {
  type: VNodeType
  props: Record<string, any> | null
  children: VNodeChild[]
  key?: string | number
  el?: Node | null
  component?: ComponentInternalInstance
  shapeFlag?: number // 用于标识 vnode 类型
}

// VNode 子节点类型
export type VNodeChild = VNode | string | number | boolean | null | undefined

// 组件内部实例
export interface ComponentInternalInstance {
  uid: number
  vnode: VNode
  type: ComponentOptions
  parent: ComponentInternalInstance | null
  appContext: any
  props: Record<string, any>
  propsOptions: string[]
  setupState: any
  render: ((...args: any[]) => VNode | VNode[]) | null
  isMounted: boolean
  subTree: VNode | null
  effect: any // ReactiveEffect
  update: () => void
  emitted: Record<string, boolean>
}

// Fragment 符号
export const Fragment = Symbol('Fragment')

// Text 符号（文本节点）
export const Text = Symbol('Text')

// ShapeFlags - 用于快速判断 vnode 类型
export const enum ShapeFlags {
  ELEMENT = 1,
  COMPONENT = 1 << 1,
  TEXT_CHILDREN = 1 << 2,
  ARRAY_CHILDREN = 1 << 3,
  SLOTS_CHILDREN = 1 << 4,
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 5,
}
