/**
 * 组件挂载器 - 处理对象式组件和函数式组件的挂载逻辑
 * 
 * 参照 Vue 3 源码及《Vue.js 设计与实现》设计
 */

import { VNode, Component, VNodeProps } from './types'
import { h } from './h'
import { normalizeClass } from '../compiler/normalizeClass'
import { ReactiveEffect } from '../reactivity/reactive'
import { mount } from './mount'

/**
 * 递归挂载子树（支持嵌套数组扁平化）
 * @param tree 子树（VNode、数组或字符串）
 * @param componentContainer 组件容器
 */
function mountSubTree(tree: VNode | VNode[] | string | null | undefined, componentContainer: HTMLElement): void {
  if (tree === null || tree === undefined) {
    return;
  }
  
  if (Array.isArray(tree)) {
    tree.forEach(child => {
      mountSubTree(child, componentContainer);
    });
  } else if (typeof tree === 'string') {
    componentContainer.appendChild(document.createTextNode(tree));
  } else {
    mount(tree, componentContainer, null);
  }
}

/**
 * 创建组件容器并挂载子树
 * @param vnode 组件 VNode
 * @param container 父容器
 * @param anchor 锚点节点
 * @param subTree 子树
 */
function createComponentContainerAndMount(
  vnode: VNode,
  container: HTMLElement | SVGElement,
  anchor: Node | null,
  subTree: VNode | VNode[] | null
): void {
  // 创建一个包装元素作为组件的根容器
  const wrapper = document.createElement('div');
  // 将包装元素添加到父容器中
  if (anchor) {
    container.insertBefore(wrapper, anchor);
  } else {
    container.appendChild(wrapper);
  }
  // 保存引用
  vnode.el = wrapper;
  
  // 使用包装元素作为组件内容的 container
  const componentContainer = wrapper;
  componentContainer.innerHTML = '';
  
  // 挂载 subTree 到组件自己的容器中
  mountSubTree(subTree, componentContainer);
}

/**
 * 更新组件容器并重新挂载子树
 * @param vnode 组件 VNode
 * @param subTree 子树
 */
function updateComponentContainerAndMount(vnode: VNode, subTree: VNode | VNode[] | null): void {
  const componentContainer = vnode.el as HTMLElement;
  componentContainer.innerHTML = '';
  
  mountSubTree(subTree, componentContainer);
}

/**
 * 挂载对象式组件（Options API）
 * @param vnode 组件 VNode
 * @param container 容器元素
 * @param anchor 锚点节点
 */
export function mountObjectComponent(vnode: VNode, container: HTMLElement | SVGElement, anchor: Node | null = null): void {
  const component = vnode.type as Component
  
  let renderFn: Function
  
  // 如果有 setup 方法，先执行 setup
  let setupResult: any
  if (component.setup) {
    const setupFn = component.setup
    setupResult = setupFn(vnode.props || {}, { emit: (event: string, ...args: any[]) => {} })
    
    // 如果 setup 返回了 render 函数
    if (typeof setupResult === 'function') {
      renderFn = setupResult as Function
    } else if (setupResult && typeof setupResult === 'object' && 'render' in setupResult) {
      renderFn = (setupResult as Record<string, any>).render as Function
    } else {
      // 使用组件的 render 方法
      renderFn = component.render as Function
    }
  } else if (component.render) {
    // 直接使用组件的 render 方法
    renderFn = component.render as Function
  } else {
    return
  }
  
  // 🔥 关键修复：使用 effect 包裹 render 函数，实现响应式更新
  const effectFn = new ReactiveEffect(() => {
    // 构建上下文：合并 props、components 和 setup 返回值
    // components 来自 vnode.type (组件定义对象)
    const componentDef = vnode.type as any;
    const ctx = { 
      ...vnode.props, 
      ...(componentDef.components || {}),  // 添加子组件到 ctx
      ...(setupResult || {}) 
    };
    
    
    // 调用 render 函数获取子 VNode
    let subTree: VNode | VNode[] | null
    try {
      // 编译后的 render 函数签名：(h, ctx, normalizeClass) => VNode
      if (renderFn.length === 3) {
        subTree = renderFn(h, ctx, normalizeClass) as VNode | VNode[]
      } else if (renderFn.length === 2) {
        // 运行时编译器返回的包装函数：(props, setupState) => VNode
        subTree = renderFn(vnode.props || {}, setupResult) as VNode | VNode[]
      } else {
        // 其他情况，尝试直接调用
        subTree = renderFn(vnode.props || {}, setupResult) as VNode | VNode[]
      }

    } catch (error) {
      console.error('[Mount] render 函数执行出错:', error);
      console.error('[Mount] 错误堆栈:', (error as Error).stack);
      return;
    }
    
    if (subTree) {
      // 🔥 关键修复：为组件创建独立的容器，避免多个组件实例共享同一个 container 导致互相覆盖
      // 如果 vnode.el 不存在，说明是首次挂载
      if (!vnode.el) {
        createComponentContainerAndMount(vnode, container, anchor, subTree);
      } else {
        // 更新阶段：清空并重新挂载（简化实现，应该使用 patch）
        updateComponentContainerAndMount(vnode, subTree);
      }
    } 
  })
  
  // 执行 effect，触发首次渲染
  effectFn.effect()
}

/**
 * 挂载函数式组件
 * @param vnode 组件 VNode
 * @param container 容器元素
 * @param anchor 锚点节点
 */
export function mountFunctionalComponent(vnode: VNode, container: HTMLElement | SVGElement, anchor: Node | null = null): void {
  // 调用组件函数获取子 VNode
  const componentFn = vnode.type as (props?: VNodeProps) => VNode | VNode[]
  const subTree = componentFn(vnode.props || {})
  
  if (subTree) {
    if (Array.isArray(subTree)) {
      subTree.forEach((child) => {
        if (child) {
          // 递归处理嵌套数组（例如 v-for 生成的数组）
          if (Array.isArray(child)) {
            child.forEach((nestedChild) => {
              if (nestedChild) {
                mount(nestedChild, container, anchor)
              }
            })
          } else {
            mount(child, container, anchor)
          }
        }
      })
    } else {
      mount(subTree, container, anchor)
    }
  }
}
