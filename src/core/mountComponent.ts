import { effect, reactive, triggerUnmounted, triggerMounted } from './reactive'
import { VNode, Component, ComponentInstance, Fragment } from './types'
import { mount } from './mount'
import { patch } from './patch'

// 🔥 关键修复：使用 WeakMap 存储 component 到 instance 的映射
export const componentInstanceMap = new WeakMap<Component, ComponentInstance>()

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
  componentInstanceMap.set(component, instance)
  
  if (component.setup) {
    instance.setupState = component.setup(instance.props)
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
      patch(instance.subTree!, subTree)
      instance.subTree = subTree
      vnode.el = subTree.el
    }
  })
}