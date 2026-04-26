import { VNode, Component, VNodeProps } from './types'
import { h } from './h'
import { normalizeClass } from '../compiler/normalizeClass'
import { ReactiveEffect } from '../reactivity/reactive'

/**
 * 挂载虚拟 DOM 到真实 DOM - 基于 mVue.ts 实现，支持 SVG
 * @param vnode 虚拟 DOM 节点
 * @param container 容器元素
 * @param anchor 锚点节点（用于插入位置控制）
 */
export function mount(vnode: VNode, container: HTMLElement | SVGElement, anchor: Node | null = null): void {

  
  // 先检查 vnode 是否为空
  if (!vnode) {
    return;
  }
  
  // 处理对象式组件（Options API）
  if (typeof vnode.type === 'object' && vnode.type !== null) {
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
          const mountSubTree = (tree: VNode | VNode[] | string | null | undefined) => {
            if (tree === null || tree === undefined) {
              return;
            }
            
            if (Array.isArray(tree)) {
              tree.forEach(child => {
                mountSubTree(child);
              });
            } else if (typeof tree === 'string') {
              componentContainer.appendChild(document.createTextNode(tree));
            } else {
              mount(tree, componentContainer, null);
            }
          };
          
          mountSubTree(subTree);
        } else {
          // 更新阶段：清空并重新挂载（简化实现，应该使用 patch）
          const componentContainer = vnode.el as HTMLElement;
          componentContainer.innerHTML = '';
          
          const mountSubTree = (tree: VNode | VNode[] | string | null | undefined) => {
            if (tree === null || tree === undefined) {
              return;
            }
            
            if (Array.isArray(tree)) {
              tree.forEach(child => {
                mountSubTree(child);
              });
            } else if (typeof tree === 'string') {
              componentContainer.appendChild(document.createTextNode(tree));
            } else {
              mount(tree, componentContainer, null);
            }
          };
          
          mountSubTree(subTree);
        }
      } 
    })
    
    // 执行 effect，触发首次渲染
    effectFn.effect()
    return
  }

  // 处理函数式组件
  if (typeof vnode.type === 'function') {
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
    return
  }

  // 判断是否为 SVG 容器或自身就是 svg 标签
  const isSvg = vnode.type === 'svg' || container.tagName.toLowerCase() === 'svg';
  
  if (typeof vnode.type === 'string') {
    // 创建元素时判断是否为 SVG
    const el = isSvg 
      ? document.createElementNS('http://www.w3.org/2000/svg', vnode.type)
      : document.createElement(vnode.type);
    
    vnode.el = el as HTMLElement | SVGElement;
    
    // 设置属性
    if (vnode.props) {
      for (const key in vnode.props) {
        // 🔥 关键修复：key 是 Vue 内部使用的特殊属性，不应该渲染到 DOM
        if (key === 'key') {
          vnode.key = vnode.props[key];
          continue; // 跳过，不设置为 DOM 属性
        }
        
        setElementProps(el, key, vnode.props[key]);
      }
    }
    
    // 处理子节点
    if (vnode.children) {
      if (typeof vnode.children === 'string') {
        el.textContent = vnode.children;
      } else if (Array.isArray(vnode.children)) {
        // 🔥 关键修复：定义一个递归函数来扁平化并挂载 children
        const mountChildren = (children: Array<VNode | string | null | undefined>) => {
          children.forEach((child: VNode | string | null | undefined) => {
            // 过滤掉 null 和 undefined（来自 v-if 返回的 null）
            if (child === null || child === undefined) {
              return;
            }
            
            // 如果子节点是数组，递归扁平化（处理 v-for 生成的嵌套数组）
            if (Array.isArray(child)) {
              mountChildren(child);
            } 
            // 如果子节点是字符串，直接创建文本节点
            else if (typeof child === 'string') {
              el.appendChild(document.createTextNode(child));
            } 
            // 否则递归挂载 VNode
            else {
              mount(child as VNode, el);
            }
          });
        };
        
        mountChildren(vnode.children);
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
 * 设置元素属性 - 基于 mVue.ts 实现，参照 Vue 3 源码处理 SVG 命名空间
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
    // 🔥 关键修复：参照 Vue 3 源码，处理 SVG 命名空间属性
    // xlink:href 等属性必须使用 setAttributeNS
    if (el instanceof SVGElement && key.includes(':')) {
      const [prefix, localName] = key.split(':');
      
      if (prefix === 'xlink') {
        // xlink:href 需要使用 xlink 命名空间
        el.setAttributeNS('http://www.w3.org/1999/xlink', localName, String(value ?? ''));
      } else if (prefix === 'xml') {
        // xml 属性使用 xml 命名空间
        el.setAttributeNS('http://www.w3.org/XML/1998/namespace', localName, String(value ?? ''));
      } else if (prefix === 'xmlns') {
        // xmlns 属性使用 xmlns 命名空间
        el.setAttributeNS('http://www.w3.org/2000/xmlns/', localName, String(value ?? ''));
      } else {
        // 其他命名空间属性
        el.setAttribute(key, String(value ?? ''));
      }
    } else {
      // 清理属性值中可能的多余引号
      let cleanValue = value;
      if (typeof value === 'string' && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
        cleanValue = value.slice(1, -1);
      }
      // 普通 HTML 元素或非命名空间属性
      el.setAttribute(key, String(cleanValue ?? ''));
    }
  }
}