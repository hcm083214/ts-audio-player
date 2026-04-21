import { VNode, Component, VNodeProps } from './types'

/**
 * 合并静态 class 和动态 class
 * @param staticClass 静态 class 字符串
 * @param dynamicClass 动态 class（可以是字符串、对象或数组）
 */
function mergeClasses(staticClass: string, dynamicClass: any): string {
  if (!dynamicClass) return staticClass || '';
  
  let dynamicClasses = '';
  
  if (typeof dynamicClass === 'string') {
    dynamicClasses = dynamicClass;
  } else if (Array.isArray(dynamicClass)) {
    // 数组语法：['active', 'text-danger']
    dynamicClasses = dynamicClass.filter(Boolean).join(' ');
  } else if (typeof dynamicClass === 'object') {
    // 对象语法：{ active: true, 'text-danger': false }
    const obj = dynamicClass as Record<string, any>;
    dynamicClasses = Object.entries(obj)
      .filter(([_, value]) => value)
      .map(([key]) => key)
      .join(' ');
  }
  
  // 合并静态和动态 class，去重
  const allClasses = [...(staticClass ? staticClass.split(/\s+/) : []), ...(dynamicClasses ? dynamicClasses.split(/\s+/) : [])];
  return [...new Set(allClasses)].filter(Boolean).join(' ');
}

/**
 * 创建虚拟 DOM 节点 - 基于 mVue.ts 实现
 * @param type 节点类型（字符串标签名、组件函数或组件对象）
 * @param props 节点属性
 * @param children 子节点
 */
export function h(type: string | Function | Component, props: VNodeProps = {}, children: VNode[] | string | VNode = []): VNode | null {
  if (type === null) return null;
  
  // 处理 class 合并（如果 props 中有特殊的 __staticClass 标记）
  if (props && props.__staticClass) {
    const staticClass = props.__staticClass as string;
    const dynamicClass = props.class;
    props.class = mergeClasses(staticClass, dynamicClass);
    delete props.__staticClass;
  }
  
  let normalizedChildren: VNode[] | string;
  if (Array.isArray(children)) {
    normalizedChildren = children.flat();
  } else if (typeof children === 'string') {
    return { type, props, children, tag: typeof type === 'string' ? type : undefined };
  } else {
    normalizedChildren = [children];
  }
  
  return { type, props, children: normalizedChildren, tag: typeof type === 'string' ? type : undefined };
}