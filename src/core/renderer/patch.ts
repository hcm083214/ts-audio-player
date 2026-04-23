import { VNode, ComponentInstance, Component, VNodeProps } from './types'
import { mount } from './mount'
import { h } from './h'
import { ReactiveEffect } from '../reactivity/reactive'

/**
 * normalizeClass 辅助函数 - 参考《Vue.js 设计与实现》第 7.7 节
 * 用于规范化 class 值，支持字符串、对象、数组等多种格式
 */
function normalizeClass(value: any): string {
  if (!value) return '';
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (Array.isArray(value)) {
    // 数组：递归处理每个元素，然后合并
    return value.map(item => normalizeClass(item)).filter(Boolean).join(' ');
  }
  
  if (typeof value === 'object') {
    // 对象：{ className: boolean }
    const obj = value as Record<string, any>;
    let result = '';
    for (const key in obj) {
      if (obj[key]) {
        result += (result ? ' ' : '') + key;
      }
    }
    return result;
  }
  
  return String(value);
}

/**
 * 渲染组件 - 使用 effect 包裹 render 函数实现响应式更新
 */
function renderComponent(component: Component, props: VNodeProps, container: HTMLElement, effectInstance?: ReactiveEffect): void {
  let renderFn: Function
  let setupResult: any
  
  if (component.setup) {
    const setupFn = component.setup
    setupResult = setupFn(props, { emit: (event: string, ...args: any[]) => {} })
    
    if (typeof setupResult === 'function') {
      renderFn = setupResult as Function
    } else if (setupResult && typeof setupResult === 'object' && 'render' in setupResult) {
      renderFn = (setupResult as Record<string, any>).render as Function
    } else {
      renderFn = component.render as Function
    }
  } else if (component.render) {
    renderFn = component.render as Function
  } else {
    console.warn('[renderComponent] 组件没有 render 方法')
    return
  }
  
  // 使用 effect 包裹 render 函数
  const effectFn = new ReactiveEffect(() => {
    console.log('🔄 [renderComponent] Effect 执行，准备渲染组件')
    
    // 判断 renderFn 的签名类型
    // 如果是编译后的函数：(h, ctx) => VNode
    // 如果是旧版函数：(props, setupState) => VNode
    
    let subTree: VNode | VNode[] | null;
    
    // 检查 renderFn 是否是编译后的函数（通过 Function 构造函数创建的）
    if (renderFn.length === 3) {
      // 编译后的函数签名：(h, ctx, normalizeClass)
      const ctx = { ...props, ...(setupResult as object || {}) };
      console.log('🔍 [renderComponent] ctx 对象:', ctx);
      console.log('🔍 [renderComponent] ctx.count:', ctx.count);
      console.log('🔍 [renderComponent] ctx.count.value:', ctx.count?.value);
      console.log('🔍 [renderComponent] setupResult.count:', (setupResult as any)?.count);
      console.log('🔍 [renderComponent] 两者是否相同?', ctx.count === (setupResult as any)?.count);
      subTree = renderFn(h, ctx, normalizeClass) as VNode | VNode[];
    } else if (renderFn.length === 2) {
      // 旧版编译函数签名：(h, ctx)
      const ctx = { ...props, ...(setupResult as object || {}) };
      subTree = renderFn(h, ctx) as VNode | VNode[];
    } else {
      // 旧版函数签名：(props, setupState)
      subTree = renderFn(props, setupResult) as VNode | VNode[];
    }
    
    if (subTree) {
      // 清空容器并重新挂载
      container.innerHTML = ''
      
      // 如果 subTree 是数组，遍历挂载每个元素
      if (Array.isArray(subTree)) {
        subTree.forEach(child => {
          if (child) {
            mount(child, container)
          }
        })
      } else {
        // 单个 VNode，直接挂载
        mount(subTree, container)
      }
    }
  })
  
  console.log('✅ [renderComponent] Effect 创建完成')
  // 执行 effect，触发首次渲染
  effectFn.effect()
}

/**
 * 更新虚拟 DOM - 基于 mVue.ts 简化实现
 * @param n1 旧的虚拟 DOM 节点
 * @param n2 新的虚拟 DOM 节点
 * @param container 容器元素
 */
export function patch(n1: VNode | null, n2: VNode | null, container: HTMLElement): void {
  // 处理对象式组件（Options API）
  if (n2 && typeof n2.type === 'object' && n2.type !== null) {
    // 使用 renderComponent 处理对象式组件
    renderComponent(n2.type as Component, n2.props || {}, container)
    return
  }
  
  // 处理函数式组件
  if (n2 && typeof n2.type === 'function') {
    const componentFn = n2.type as (props?: VNodeProps) => VNode
    const subTree = componentFn(n2.props || {})
    
    if (!n1) {
      // 首次挂载
      if (subTree) {
        mount(subTree, container)
      }
    } else {
      // 更新 - 需要递归 patch
      if (n1.component?.subTree && subTree) {
        patch(n1.component.subTree, subTree, container)
      }
    }
    return
  }
  
  // 类型不同，替换整个节点
  if (n1 && n2 && n1.type !== n2.type) { 
    n1.el?.remove(); 
    n1 = null; 
  }
  
  if (!n1 && !n2) {
    return;
  }
  
  // 挂载新节点
  if (!n1) {
    mount(n2!, container);
  }
  // 卸载旧节点
  else if (!n2) {
    n1.el?.remove();
  }
  // 更新节点
  else {
    // 更新属性
    if (n2.props) {
      for (const key in n2.props) {
        // 🔥 key 是内部属性，不更新到 DOM
        if (key === 'key') {
          n2.key = n2.props[key];
          continue;
        }
        
        setElementProps(n1.el!, key, n2.props[key], n1.props?.[key]);
      }
    }
    
    // 移除旧属性中不再存在的键
    if (n1.props) {
      for (const key in n1.props) {
        // 🔥 key 是内部属性，不需要移除
        if (key === 'key') continue;
        
        if (!(key in (n2.props || {}))) {
          setElementProps(n1.el!, key, null, n1.props[key]);
        }
      }
    }
    
    // 更新文本子节点
    if (typeof n2.children === 'string') {
      if (n1.children !== n2.children) {
        n1.el!.textContent = n2.children;
      }
    } 
    // 更新数组子节点
    else if (Array.isArray(n2.children)) {
      const c1 = (n1.children as VNode[]) || [];
      
      // 子节点数量不同，重新渲染
      if (c1.length !== n2.children.length) {
        n1.el!.innerHTML = '';
        n2.children.forEach((child: VNode) => {
          // 过滤掉 null 和 undefined（来自 v-if 返回的 null）
          if (child === null || child === undefined) {
            return;
          }
          mount(child, n1.el!);
        });
      } 
      // 子节点数量相同，逐个对比更新
      else {
        n2.children.forEach((child: VNode, i: number) => {
          // 过滤掉 null 和 undefined
          if (child === null || child === undefined) {
            return;
          }
          patch(c1[i], child, n1.el! as HTMLElement);
        });
      }
    }
    
    // 更新 el 引用
    n2.el = n1.el;
  }
}

/**
 * 设置元素属性 - 与 mount.ts 保持一致
 */
function setElementProps(el: HTMLElement | SVGElement, key: string, value: any, prevValue?: any) {
  if (key.startsWith('on')) {
    const event = key.slice(2).toLowerCase();
    if (prevValue) el.removeEventListener(event, prevValue as EventListener);
    if (value) el.addEventListener(event, value as EventListener);
  } else if (key === 'class') {
    // 先规范化 class 值（支持字符串、对象、数组）
    const normalizedClass = normalizeClass(value);
    if (el instanceof SVGElement) {
      el.setAttribute('class', normalizedClass);
    } else {
      (el as HTMLElement).className = normalizedClass;
    }
  } else if (key === 'style') {
    if (value && typeof value === 'object') {
      Object.assign((el as HTMLElement).style, value);
    } else {
      (el as HTMLElement).style.cssText = String(value ?? '');
    }
  } else if (key in el) {
    // 处理 DOM 属性 (如 value, checked 等)
    (el as any)[key] = value;
  } else {
    // 处理普通 HTML 属性
    if (value == null || value === false) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, String(value));
    }
  }
}