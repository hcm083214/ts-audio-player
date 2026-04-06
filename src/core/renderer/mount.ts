import { VNode, Fragment } from './types'
import { patchProp } from './patchProp'
import { mountComponent } from './mountComponent'

/**
 * 挂载虚拟 DOM 到真实 DOM
 * @param vnode 虚拟 DOM 节点
 * @param container 容器元素
 */
export function mount(vnode: VNode, container: Element): void {
  if (!vnode) {
    return
  }
  
  if (typeof vnode.type === 'object' && 'setup' in vnode.type) {
    if (vnode.component) {
      return
    }
    
    mountComponent(vnode, container)
    return
  }

  if (typeof vnode.children === 'string') {
    // 文本节点
    const textNode = document.createTextNode(vnode.children)
    vnode.el = textNode as any
    container.appendChild(textNode)
    return
  }

  if (vnode.type === Fragment) {
    // 片段节点
    // console.log('🔍 Mount Fragment with', vnode.children.length, 'children to container:', container.tagName, container.className)
    vnode.el = container as any
    vnode.children.forEach((child, index) => {
      // 处理字符串类型的子节点（文本节点）
      if (typeof child === 'string') {
        const textNode = document.createTextNode(child)
        container.appendChild(textNode)
      } else if (child) {
        mount(child, container)
      }
    })
    return
  }

  // 元素节点
  let element: Element
  if (vnode.type === 'svg') {
    // 🔥 关键修复：SVG 元素必须使用 createElementNS 创建
    element = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  } else if (vnode.type === 'use') {
    element = document.createElementNS('http://www.w3.org/2000/svg', 'use')
  } else {
    element = document.createElement(vnode.type as string)
  }
  vnode.el = element

  // 设置属性
  for (const [key, value] of Object.entries(vnode.props || {})) {
    patchProp(element, key, null, value)
  }

  // 挂载子节点
  if (Array.isArray(vnode.children)) {
    vnode.children.forEach(child => {
      // 处理字符串类型的子节点（文本节点）
      if (typeof child === 'string') {
        const textNode = document.createTextNode(child)
        element.appendChild(textNode)
      } else if (child) {
        mount(child, element)
      }
    })
  }

  container.appendChild(element)
}
