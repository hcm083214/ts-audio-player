import { VNode } from './types'
import { patch } from './patch'

// 扩展 HTMLElement 类型以支持 _vnode 属性
declare global {
  interface HTMLElement {
    _vnode?: VNode;
  }
}

/**
 * 渲染虚拟 DOM 到真实 DOM - 基于 mVue.ts 实现
 * @param vnode 虚拟 DOM 节点
 * @param container 容器元素
 */
export function render(vnode: VNode, container: HTMLElement): void {
  const prevVNode = container._vnode;
  patch(prevVNode || null, vnode, container);
  container._vnode = vnode;
}