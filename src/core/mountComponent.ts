import { effect, reactive } from './reactive'
import { VNode, Component, ComponentInstance } from './types'
import { mount } from './mount'
import { patch } from './patch'

/**
 * 挂载组件
 * @param vnode 组件虚拟 DOM 节点
 * @param container 容器元素
 */
export function mountComponent(vnode: VNode, container: Element): void {
  const component = vnode.type as Component
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
    if (!instance.isMounted) {
      const subTree = instance.render(instance.props, instance.setupState)
      instance.subTree = subTree
      mount(subTree, container)
      vnode.el = subTree.el
      instance.isMounted = true
    } else {
      const subTree = instance.render(instance.props, instance.setupState)
      patch(instance.subTree!, subTree)
      instance.subTree = subTree
      vnode.el = subTree.el
    }
  })
}
