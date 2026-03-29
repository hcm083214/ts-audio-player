import { VNode, ComponentInstance } from './types'
import { reactive } from './reactive'
import { mount } from './mount'
import { patchProp } from './patchProp'

/**
 * 更新虚拟 DOM
 * @param oldVnode 旧的虚拟 DOM 节点
 * @param newVnode 新的虚拟 DOM 节点
 */
export function patch(oldVnode: VNode, newVnode: VNode): void {
  if (oldVnode.type !== newVnode.type) {
    const parent = oldVnode.el?.parentNode
    if (parent) {
      parent.removeChild(oldVnode.el!)
      mount(newVnode, parent as Element)
    }
    return
  }

  if (typeof oldVnode.type === 'object' && 'setup' in oldVnode.type) {
    newVnode.component = oldVnode.component
    newVnode.component!.props = reactive(newVnode.props || {})
    return
  }

  const el = oldVnode.el as Element
  newVnode.el = el

  if (typeof newVnode.children === 'string') {
    if (oldVnode.children !== newVnode.children) {
      el.textContent = newVnode.children
    }
  } else {
    // 更新属性
    for (const [key, value] of Object.entries(newVnode.props || {})) {
      if (oldVnode.props?.[key] !== value) {
        patchProp(el, key, oldVnode.props?.[key], value)
      }
    }

    // 移除旧属性
    for (const key of Object.keys(oldVnode.props || {})) {
      if (!(key in (newVnode.props || {}))) {
        patchProp(el, key, oldVnode.props?.[key], null)
      }
    }

    // 更新子节点
    const oldChildren = Array.isArray(oldVnode.children) ? oldVnode.children : []
    const newChildren = Array.isArray(newVnode.children) ? newVnode.children : []
    const minLength = Math.min(oldChildren.length, newChildren.length)

    for (let i = 0; i < minLength; i++) {
      const oldChild = oldChildren[i]
      const newChild = newChildren[i]
      
      // 处理字符串类型的子节点
      if (typeof oldChild === 'string' && typeof newChild === 'string') {
        if (oldChild !== newChild) {
          const textNode = document.createTextNode(newChild)
          const oldTextNode = el.childNodes[i]
          if (oldTextNode.nodeType === Node.TEXT_NODE) {
            el.replaceChild(textNode, oldTextNode)
          }
        }
      } else if (typeof oldChild === 'string' && typeof newChild !== 'string') {
        const oldTextNode = el.childNodes[i]
        if (oldTextNode.nodeType === Node.TEXT_NODE) {
          el.removeChild(oldTextNode)
        }
        mount(newChild, el)
      } else if (typeof oldChild !== 'string' && typeof newChild === 'string') {
        const textNode = document.createTextNode(newChild)
        const oldEl = (oldChild as VNode).el
        if (oldEl) {
          el.replaceChild(textNode, oldEl)
        }
      } else {
        patch(oldChild as VNode, newChild as VNode)
      }
    }

    // 添加新子节点
    if (newChildren.length > oldChildren.length) {
      for (let i = minLength; i < newChildren.length; i++) {
        const newChild = newChildren[i]
        if (typeof newChild === 'string') {
          el.appendChild(document.createTextNode(newChild))
        } else {
          mount(newChild, el)
        }
      }
    }

    // 移除旧子节点
    if (newChildren.length < oldChildren.length) {
      for (let i = minLength; i < oldChildren.length; i++) {
        const oldChild = oldChildren[i]
        if (typeof oldChild === 'string') {
          const textNode = el.childNodes[i]
          if (textNode.nodeType === Node.TEXT_NODE) {
            el.removeChild(textNode)
          }
        } else if ((oldChild as VNode).el) {
          el.removeChild((oldChild as VNode).el!)
        }
      }
    }
  }
}
