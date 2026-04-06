import { VNode, VNodeType, Fragment } from './types'

/**
 * 创建虚拟 DOM 节点
 * @param type 节点类型
 * @param props 节点属性
 * @param children 子节点
 */
export function h(type: VNodeType, props: Record<string, any> = {}, children: VNode[] | string = []): VNode {
  return {
    type,
    props,
    children
  }
}
