import { VNode, Component, VNodeProps } from './types'

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
 * 挂载虚拟 DOM 到真实 DOM - 基于 mVue.ts 实现，支持 SVG
 * @param vnode 虚拟 DOM 节点
 * @param container 容器元素
 * @param anchor 锚点节点（用于插入位置控制）
 */
export function mount(vnode: VNode, container: HTMLElement | SVGElement, anchor: Node | null = null): void {
  // 先检查 vnode 是否为空
  if (!vnode) {
    console.log('[Mount] vnode 为空，返回')
    return;
  }
  
  console.log('[Mount] 开始挂载 vnode:', vnode)
  console.log('[Mount] vnode.type:', vnode.type)
  console.log('[Mount] vnode.type 类型:', typeof vnode.type)
  
  // 处理对象式组件（Options API）
  if (typeof vnode.type === 'object' && vnode.type !== null) {
    console.log('[Mount] 检测到对象式组件')
    
    const component = vnode.type as Component
    let renderFn: Function
    
    // 如果有 setup 方法，先执行 setup
    if (component.setup) {
      console.log('[Mount] 执行 setup 方法')
      const setupFn = component.setup
      const setupResult = setupFn(vnode.props || {}, { emit: (event: string, ...args: any[]) => {} })
      console.log('[Mount] setup 返回:', setupResult)
      
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
      console.log('[Mount] 使用组件的 render 方法')
      renderFn = component.render as Function
    } else {
      console.warn('[Mount] 组件没有 render 方法')
      return
    }
    
    // 调用 render 函数获取子 VNode
    console.log('[Mount] 调用 render 函数...')
    const subTree = renderFn(vnode.props || {}) as VNode
    console.log('[Mount] render 返回的 subTree:', subTree)
    
    if (subTree) {
      console.log('[Mount] 递归挂载 subTree...')
      mount(subTree, container, anchor)
    } else {
      console.warn('[Mount] render 返回了 null subTree')
    }
    return
  }

  // 处理函数式组件
  if (typeof vnode.type === 'function') {
    console.log('[Mount] 检测到函数式组件，调用组件函数...')
    // 调用组件函数获取子 VNode
    const componentFn = vnode.type as (props?: VNodeProps) => VNode
    const subTree = componentFn(vnode.props || {})
    console.log('[Mount] 组件返回的 subTree:', subTree)
    
    if (subTree) {
      console.log('[Mount] 递归挂载 subTree...')
      mount(subTree, container, anchor)
    } else {
      console.warn('[Mount] 组件返回了 null subTree')
    }
    return
  }

  // 判断是否为 SVG 容器或自身就是 svg 标签
  const isSvg = vnode.type === 'svg' || container.tagName.toLowerCase() === 'svg';
  console.log('[Mount] 创建元素:', vnode.type, 'isSvg:', isSvg)
  
  if (typeof vnode.type === 'string') {
    // 创建元素时判断是否为 SVG
    const el = isSvg 
      ? document.createElementNS('http://www.w3.org/2000/svg', vnode.type)
      : document.createElement(vnode.type);
    
    vnode.el = el as HTMLElement | SVGElement;
    
    // 设置属性
    if (vnode.props) {
      for (const key in vnode.props) {
        setElementProps(el, key, vnode.props[key]);
      }
    }
    
    // 处理子节点
    if (vnode.children) {
      if (typeof vnode.children === 'string') {
        el.textContent = vnode.children;
      } else if (Array.isArray(vnode.children)) {
        vnode.children.forEach((child: VNode | string) => {
          // 过滤掉 null 和 undefined（来自 v-if 返回的 null）
          if (child === null || child === undefined) {
            return;
          }
          
          // 如果子节点是字符串，直接创建文本节点
          if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child));
          } else {
            // 否则递归挂载 VNode
            mount(child, el);
          }
        });
      }
    }
    
    // 插入到容器中
    if (anchor) {
      container.insertBefore(el as Node, anchor);
    } else {
      container.appendChild(el as Node);
    }
  }
}

/**
 * 设置元素属性 - 基于 mVue.ts 实现
 */
function setElementProps(el: HTMLElement | SVGElement, key: string, value: any, prevValue?: any) {
  if (key.startsWith('on')) {
    // 事件绑定
    const event = key.slice(2).toLowerCase();
    if (prevValue) el.removeEventListener(event, prevValue as EventListener);
    if (value) el.addEventListener(event, value as EventListener);
  } else if (key === 'class') {
    // SVG 元素的 className 是只读的，必须使用 setAttribute
    // 先规范化 class 值（支持字符串、对象、数组）
    const normalizedClass = normalizeClass(value);
    console.log('[setElementProps] 设置 class:', value, '->', normalizedClass, '元素类型:', el.tagName);
    if (el instanceof SVGElement) {
      el.setAttribute('class', normalizedClass);
    } else {
      (el as HTMLElement).className = normalizedClass;
    }
  } else if (key === 'style') {
    // style 可能是字符串或对象
    console.log('[setElementProps] 设置 style:', value, '元素类型:', el.tagName);
    if (typeof value === 'string') {
      (el as HTMLElement).style.cssText = value;
    } else if (typeof value === 'object') {
      Object.assign((el as HTMLElement).style, value);
    }
  } else {
    // 清理属性值中可能的多余引号
    let cleanValue = value;
    if (typeof value === 'string' && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
      cleanValue = value.slice(1, -1);
    }
    // SVG 属性通常区分大小写，但 setAttribute 大部分情况兼容
    console.log('[setElementProps] 设置属性:', key, '=', cleanValue, '元素类型:', el.tagName);
    el.setAttribute(key, String(cleanValue ?? ''));
  }
}