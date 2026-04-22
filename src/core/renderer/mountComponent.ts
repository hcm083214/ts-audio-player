import { effect, reactive, triggerUnmounted, triggerMounted } from '../reactivity/reactive'
import { VNode, ComponentOptions, ComponentInternalInstance, Fragment, ShapeFlags } from './types'
import { mount } from './mount'
import { patch } from './patch'

// 组件实例 UID 计数器
let uid = 0

/**
 * 创建 emit 函数
 * @param instance 组件实例
 * @param emits 声明的事件列表
 */
function createEmit(instance: ComponentInternalInstance, emits?: string[]) {
  return function(event: string, ...args: any[]) {
    // 将事件名转换为 props 中的回调函数名（Vue 风格）
    const camelEventName = event.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
    const handlerName = `on${camelEventName.charAt(0).toUpperCase()}${camelEventName.slice(1)}`
    
    // 从父组件传递的 props 中查找对应的回调函数
    if (instance.vnode.props && typeof instance.vnode.props[handlerName] === 'function') {
      instance.vnode.props[handlerName](...args)
    } else {
      console.warn(`Event handler "${handlerName}" not found`)
    }
  }
}

/**
 * 挂载组件
 * @param vnode 虚拟 DOM 节点
 * @param container 容器元素
 * @param anchor 锚点
 */
export function mountComponent(vnode: VNode, container: Element, anchor: Node | null = null): void {
  const component = vnode.type as ComponentOptions
  
  // 创建组件实例
  const instance: ComponentInternalInstance = {
    uid: uid++,
    vnode,
    type: component,
    parent: null,
    appContext: null,
    props: reactive({ ...vnode.props }),
    propsOptions: component.props || [],
    setupState: null,
    render: null,
    isMounted: false,
    subTree: null,
    effect: null,
    update: () => {},
    emitted: {}
  }
  
  vnode.component = instance
  
  // 创建 context 对象
  const context = {
    emit: createEmit(instance, component.emits)
  }
  
  // 执行 setup
  if (component.setup) {
    instance.setupState = component.setup(instance.props, context)
  }
  
  // 设置 render 函数
  if (component.render) {
    instance.render = component.render
  } else if (component.template) {
    // 如果有 template，需要在编译时生成 render 函数
    console.warn('Template compilation not supported at runtime')
  }
  
  // 创建更新函数
  let isFirstMount = true
  
  instance.update = () => {
    if (!instance.render) {
      console.warn('Component has no render function')
      return
    }
    
    // 执行 render 函数获取 subTree
    const subTree = instance.render!(instance.props, instance.setupState)
    
    if (!instance.isMounted) {
      // 首次挂载
      instance.subTree = Array.isArray(subTree) 
        ? { type: Fragment, props: null, children: subTree, shapeFlag: ShapeFlags.ARRAY_CHILDREN }
        : subTree
      
      mount(instance.subTree, container, anchor)
      vnode.el = instance.subTree.el
      instance.isMounted = true
      
      // 触发 onMounted
      triggerMounted()
    } else {
      // 更新
      const oldSubTree = instance.subTree!
      const newSubTree = Array.isArray(subTree)
        ? { type: Fragment, props: null, children: subTree, shapeFlag: ShapeFlags.ARRAY_CHILDREN }
        : subTree
      
      // 保存旧的 el 引用
      const oldEl = oldSubTree.el
      
      // patch 更新
      patch(oldSubTree, newSubTree, container, anchor)
      
      // 保持 el 引用
      if (oldEl && !newSubTree.el) {
        newSubTree.el = oldEl
      }
      
      instance.subTree = newSubTree
      vnode.el = newSubTree.el
    }
  }
  
  // 创建 effect
  instance.effect = effect(instance.update)
}