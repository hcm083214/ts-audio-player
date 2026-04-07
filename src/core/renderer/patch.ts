import { VNode, ComponentInstance, Fragment, Component } from './types'
import { reactive, triggerUnmounted } from '../reactivity/reactive'
import { mount } from './mount'
import { patchProp } from './patchProp'

/**
 * 更新虚拟 DOM
 * @param oldVnode 旧的虚拟 DOM 节点
 * @param newVnode 新的虚拟 DOM 节点
 */
export function patch(oldVnode: VNode, newVnode: VNode): void {
  // 🔥 关键修复：添加空值检查，防止 v-if 返回 null 时导致错误
  if (!oldVnode || !newVnode) {
    return
  }
  
  if (oldVnode.type !== newVnode.type) {
    const parent = oldVnode.el?.parentNode
    
    // 🔥 如果是组件，触发 onUnmounted 回调
    if (typeof oldVnode.type === 'object' && 'setup' in oldVnode.type) {
      triggerUnmounted()
    }
    
    if (parent) {
      parent.removeChild(oldVnode.el!)
      mount(newVnode, parent as Element)
    }
    return
  }

// 🔥 修复组件更新逻辑：当检测到是组件时，需要同步 props 并交由 effect 重新渲染
  if (typeof oldVnode.type === 'object' && 'setup' in oldVnode.type) {
    const instance = oldVnode.component

    if (!instance) {
      console.error('Component instance not found in vnode.component')
      return
    }

    const newProps = newVnode.props || {}
    const oldProps = oldVnode.props || {}

    // 同步 props 到响应式实例 props
    Object.keys({ ...oldProps, ...newProps }).forEach(key => {
      if (newProps[key] === undefined) {
        delete instance.props[key]
      } else {
        instance.props[key] = newProps[key]
      }
    })

    newVnode.component = instance

    // 组件更新由 effect 函数处理，不需要手动调用 render 函数
    return
  }

  // 🔥 关键修复：处理 Fragment 节点
  if (oldVnode.type === Fragment) {
    // Fragment 没有实际的 DOM 元素，直接更新子节点
    const oldChildren = Array.isArray(oldVnode.children) ? oldVnode.children : []
    const newChildren = Array.isArray(newVnode.children) ? newVnode.children : []
    
    // 🔥 关键修复：Fragment 使用父容器的引用
    // 如果 oldVnode.el 不存在，说明是首次挂载，应该走 mount 流程
    const container = oldVnode.el || newVnode.el
    
    if (!container) {
      console.warn('⚠️ Fragment has no container reference, skipping patch')
      return
    }
    
    // 🔥 确保新 vnode 也有 el 引用
    newVnode.el = container
    
    const minLength = Math.min(oldChildren.length, newChildren.length)

    for (let i = 0; i < minLength; i++) {
      const oldChild = oldChildren[i]
      const newChild = newChildren[i]
      
      // 处理字符串类型的子节点
      if (typeof oldChild === 'string' && typeof newChild === 'string') {
        if (oldChild !== newChild) {
          const textNode = document.createTextNode(newChild)
          const oldTextNode = container.childNodes[i]
          if (oldTextNode.nodeType === Node.TEXT_NODE) {
            container.replaceChild(textNode, oldTextNode)
          }
        }
      } else if (typeof oldChild === 'string' && typeof newChild !== 'string') {
        const oldTextNode = container.childNodes[i]
        if (oldTextNode.nodeType === Node.TEXT_NODE) {
          container.removeChild(oldTextNode)
        }
        mount(newChild, container)
      } else if (typeof oldChild !== 'string' && typeof newChild === 'string') {
        const textNode = document.createTextNode(newChild)
        const oldEl = (oldChild as VNode).el
        if (oldEl) {
          container.replaceChild(textNode, oldEl)
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
          container.appendChild(document.createTextNode(newChild))
        } else {
          mount(newChild, container)
        }
      }
    }

    // 移除旧子节点
    if (newChildren.length < oldChildren.length) {
      for (let i = minLength; i < oldChildren.length; i++) {
        const oldChild = oldChildren[i]
        if (typeof oldChild === 'string') {
          const textNode = container.childNodes[i]
          if (textNode.nodeType === Node.TEXT_NODE) {
            container.removeChild(textNode)
          }
        } else if ((oldChild as VNode).el) {
          container.removeChild((oldChild as VNode).el!)
        }
      }
    }
    
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
