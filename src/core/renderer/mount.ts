import { VNode, Fragment, Text, ShapeFlags } from './types'
import { patchProp } from './patchProp'
import { mountComponent } from './mountComponent'
import { ReactiveEffect } from '../reactivity/reactive'

/**
 * 规范化 class 值（支持字符串、对象、数组）
 */
function normalizeClass(value: any): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeClass).filter(Boolean).join(' ');
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([_, v]) => v)
      .map(([k]) => k)
      .join(' ');
  }
  return String(value || '');
}

/**
 * 挂载虚拟 DOM 到真实 DOM
 * @param vnode 虚拟 DOM 节点
 * @param container 容器元素
 * @param anchor 锚点（用于定位插入位置）
 */
export function mount(vnode: VNode, container: Element, anchor: Node | null = null): void {
  if (!vnode) {
    return
  }
  
  // 根据 shapeFlag 判断类型
  if (vnode.shapeFlag && vnode.shapeFlag & ShapeFlags.COMPONENT) {
    mountComponent(vnode, container, anchor)
    return
  }
  
  // 处理文本节点
  if (typeof vnode.children === 'string' || typeof vnode.children === 'number') {
    const textNode = document.createTextNode(String(vnode.children))
    vnode.el = textNode
    container.insertBefore(textNode, anchor)
    return
  }
  
  // 处理 Fragment
  if (vnode.type === Fragment) {
    mountChildren(vnode.children as any[], container, anchor)
    // Fragment 本身没有 DOM 元素，使用第一个子节点的 el
    vnode.el = (vnode.children[0] as VNode)?.el || null
    return
  }
  
  // 处理元素节点
  let element: Element
  
  if (typeof vnode.type === 'string') {
    if (vnode.type === 'svg' || isSvgElement(vnode)) {
      element = document.createElementNS('http://www.w3.org/2000/svg', vnode.type)
    } else {
      element = document.createElement(vnode.type)
    }
  } else {
    // 未知类型，创建普通 div
    element = document.createElement('div')
  }
  
  vnode.el = element
  
  // 设置属性
  if (vnode.props) {
    for (const key in vnode.props) {
      patchProp(element, key, null, vnode.props[key])
    }
  }
  
  // 挂载子节点
  if (Array.isArray(vnode.children)) {
    mountChildren(vnode.children, element, null)
  }
  
  // 插入到容器
  container.insertBefore(element, anchor)
}

/**
 * 挂载子节点数组
 */
function mountChildren(children: any[], container: Element, anchor: Node | null) {
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    
    if (child == null || typeof child === 'boolean') {
      continue
    }
    
    if (typeof child === 'string' || typeof child === 'number') {
      const textNode = document.createTextNode(String(child))
      container.insertBefore(textNode, anchor)
    } else {
      mount(child as VNode, container, anchor)
    }
  }
}

/**
 * 判断是否为 SVG 元素
 */
function isSvgElement(vnode: VNode): boolean {
  if (typeof vnode.type !== 'string') return false
  
  const svgElements = ['svg', 'circle', 'rect', 'path', 'g', 'use', 'defs', 'line', 'polyline', 'polygon']
  return svgElements.includes(vnode.type)
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
    if (el instanceof SVGElement) {
      el.setAttribute('class', normalizedClass);
    } else {
      (el as HTMLElement).className = normalizedClass;
    }
  } else if (key === 'style') {
    // style 可能是字符串或对象
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
    el.setAttribute(key, String(cleanValue ?? ''));
  }
}