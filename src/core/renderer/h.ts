import { VNode, VNodeType, Fragment, Text, ShapeFlags } from './types'

/**
 * 创建虚拟 DOM 节点（Vue 3 风格的 h 函数）
 * @param type 节点类型
 * @param props 节点属性
 * @param children 子节点
 */
export function h(type: VNodeType, props: Record<string, any> | null = null, children: any = null): VNode {
  // 处理 children 的各种情况
  let shapeFlag = 0
  
  if (typeof type === 'string') {
    shapeFlag = ShapeFlags.ELEMENT
  } else if (typeof type === 'object' && 'setup' in type) {
    shapeFlag = ShapeFlags.COMPONENT
  }
  
  // 规范化 children
  let normalizedChildren: any[] = []
  
  if (children != null) {
    if (Array.isArray(children)) {
      // 数组类型的 children
      shapeFlag |= ShapeFlags.ARRAY_CHILDREN
      normalizedChildren = normalizeChildren(children)
    } else if (typeof children === 'object') {
      // 单个 vnode
      shapeFlag |= ShapeFlags.ARRAY_CHILDREN
      normalizedChildren = [children]
    } else {
      // 基本类型（字符串、数字等）
      shapeFlag |= ShapeFlags.TEXT_CHILDREN
      normalizedChildren = [String(children)]
    }
  }
  
  return {
    type,
    props: props || null,
    children: normalizedChildren,
    key: props?.key,
    shapeFlag
  }
}

/**
 * 规范化 children 数组
 */
function normalizeChildren(children: any[]): any[] {
  const result: any[] = []
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    
    if (child == null || typeof child === 'boolean') {
      // 跳过 null、undefined、boolean
      continue
    }
    
    if (Array.isArray(child)) {
      // 扁平化嵌套数组
      result.push(...normalizeChildren(child))
    } else if (typeof child === 'object') {
      // 已经是 vnode，直接使用
      result.push(child)
    } else {
      // 转换为文本节点
      result.push(String(child))
    }
  }
  
  return result
}
