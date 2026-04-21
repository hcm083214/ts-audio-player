import { VNode } from './types'
import { patch } from './patch'

/**
 * 渲染虚拟 DOM 到真实 DOM - 基于 mVue.ts 实现
 * @param vnode 虚拟 DOM 节点
 * @param container 容器元素
 */
export function render(vnode: VNode, container: HTMLElement): void {
  const prevVNode = (container as Record<string, unknown>)._vnode as VNode | undefined;
  patch(prevVNode || null, vnode, container);
  (container as Record<string, unknown>)._vnode = vnode;
}