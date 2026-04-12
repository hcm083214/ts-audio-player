import { effect, reactive, triggerUnmounted, triggerMounted } from '../reactivity/reactive'
import { VNode, Component, ComponentInstance, Fragment } from './types'
import { mount } from './mount'
import { patch } from './patch'

/**
 * 创建 emit 函数
 * @param vnode 当前组件的 vnode
 * @param emits 声明的事件列表
 */
function createEmit(vnode: VNode, emits?: string[]) {
  return function(event: string, ...args: any[]) {
    
    // 将事件名转换为 props 中的回调函数名（Vue 风格：update:name -> onUpdate:name）
    // 🔥 支持 kebab-case 转换为 camelCase
    const camelEventName = event.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
    const handlerName = `on${camelEventName.charAt(0).toUpperCase()}${camelEventName.slice(1)}`
    
    console.log('🔍 createEmit 转换后:', {
      '转换后的事件名': camelEventName,
      'handlerName': handlerName,
      '找到的回调': vnode.props ? vnode.props[handlerName] : null
    })
    
    // 从父组件传递的 props 中查找对应的回调函数
    if (vnode.props && typeof vnode.props[handlerName] === 'function') {
      vnode.props[handlerName](...args)
    } else {
      console.warn('❌ createEmit 未找到回调:', handlerName)
    }
  }
}

/**
 * 挂载组件
 * @param vnode 虚拟 DOM 节点
 * @param container 容器元素
 */
export function mountComponent(vnode: VNode, container: Element): void {
  const component = vnode.type as Component
  
  // 🔥 关键修复：不再检查 componentInstanceMap，允许同一个组件定义被多次挂载
  // 每个 v-for 生成的 vnode 都应该独立挂载
  
  const props = vnode.props || {}
  
  const instance: ComponentInstance = {
    vnode,
    props: reactive(props),
    setupState: null,
    render: () => null as any,
    isMounted: false,
    subTree: null
  }

  vnode.component = instance
  
  // 🔥 创建 context 对象，包含 emit 等方法
  const context = {
    emit: createEmit(vnode, component.emits)
  }
  
  if (component.setup) {
    // 🔥 将 context 作为第二个参数传递给 setup
    instance.setupState = component.setup(instance.props, context)
  }

  // 优先使用 render 函数，如果没有则尝试从 template 编译
  if (component.render) {
    instance.render = component.render
  } else if ((component as any).template) {
    // 如果有 template 但没有 render，说明需要编译
    // 这里需要在构建时通过插件处理，运行时无法动态编译
  }

  effect(() => {
    const subTree = instance.render(instance.props, instance.setupState)
    
    if (!instance.isMounted) {
      instance.subTree = subTree
      mount(subTree, container)
      vnode.el = subTree.el
      instance.isMounted = true
      
      // 🔥 触发 onMounted 回调
      triggerMounted()
    } else {
      // 🔥 关键修复：在 patch 之前保存旧 subTree 的 el 引用
      // 防止新 subTree（尤其是 Fragment）的 el 为 undefined 导致后续更新失效
      const oldEl = instance.subTree?.el
      
      patch(instance.subTree!, subTree)
      
      // 🔥 关键修复：将旧 el 引用赋给新 subTree，确保后续 patch 能找到容器
      if (oldEl && !subTree.el) {
        subTree.el = oldEl
      }
      
      instance.subTree = subTree
      vnode.el = subTree.el
    }
  })
}