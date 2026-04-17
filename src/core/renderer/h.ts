import { VNode } from './types'

/**
 * 创建虚拟 DOM 节点 - 基于 mVue.ts 实现
 * @param type 节点类型（字符串标签名或组件函数）
 * @param props 节点属性
 * @param children 子节点
 */
export function h(type: any, props: any = {}, children: any = []): VNode | null {
  if (type === null) return null;
  if (Array.isArray(children)) children = children.flat();
  if (typeof children === 'string') return { type, props, children, tag: type };
  return { type, props, children: Array.isArray(children) ? children : [children], tag: type };
}
