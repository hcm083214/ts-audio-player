# Core 模块重构文档 - Vue 3 风格

## 概述

本次重构按照《Vue.js 设计与实现》和 Vue 3 的设计思路，重新设计了响应式系统和渲染器，编译器仍然使用 DOMParser 完成。

## 主要改进

### 1. 响应式系统 (`src/core/reactivity/reactive.ts`)

#### 1.1 依赖收集机制优化

- **Effect 栈支持**：支持嵌套的 effect，通过 `effectStack` 管理
- **Dep 类封装**：将依赖集合封装为 `Dep` 类，提供更清晰的 API
- **依赖清理**：在 effect 重新执行前自动清理旧依赖

```typescript
// Effect 接口
export interface ReactiveEffect {
  (): void
  deps: Dep[]
  scheduler?: EffectScheduler
  allowRecurse?: boolean
}

// Dep 类
export class Dep {
  private subscribers: Set<ReactiveEffect> = new Set()
  
  track() { /* 追踪依赖 */ }
  trigger() { /* 触发更新 */ }
}
```

#### 1.2 reactive 增强

- **isReactive 检测**：避免重复代理
- **has 陷阱**：支持 `in` 操作符的依赖追踪
- **深层响应式**：自动递归转换嵌套对象

```typescript
export function reactive<T extends object>(target: T): T {
  if (isReactive(target)) {
    return target
  }
  
  return new Proxy(target, {
    get(target, key, receiver) {
      track(target, key)
      const result = Reflect.get(target, key, receiver)
      return isObject(result) ? reactive(result) : result
    },
    set(target, key, value, receiver) {
      const oldValue = Reflect.get(target, key, receiver)
      const result = Reflect.set(target, key, value, receiver)
      if (oldValue !== value) {
        trigger(target, key)
      }
      return result
    }
  })
}
```

#### 1.3 ref 实现

- **RefImpl 类**：标准的 ref 实现
- **isRef/unref 工具函数**：方便类型判断和解包

```typescript
class RefImpl<T> {
  public __v_isRef = true
  private _value: T
  private dep: Dep
  
  get value(): T {
    this.dep.track()
    return this._value
  }
  
  set value(newValue: T) {
    if (newValue !== this._value) {
      this._value = newValue
      this.dep.trigger()
    }
  }
}
```

#### 1.4 effect 调度器

- **scheduler 选项**：支持自定义调度逻辑
- **allowRecurse**：防止无限递归
- **cleanup 机制**：自动清理旧依赖

```typescript
export function effect(fn: () => void, options?: { 
  scheduler?: EffectScheduler 
}): ReactiveEffect {
  const effectFn = function() {
    cleanup(effectFn)
    try {
      effectStack.push(effectFn)
      activeEffect = effectFn
      shouldTrack = true
      return fn()
    } finally {
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1] || null
    }
  } as ReactiveEffect
  
  effectFn.deps = []
  effectFn.scheduler = options?.scheduler
  effectFn()
  
  return effectFn
}
```

#### 1.5 computed 缓存优化

- **懒执行**：只在访问时计算
- **dirty 标记**：依赖变化时标记为 dirty
- **双重追踪**：既追踪 computed 内部依赖，也追踪外部对 computed 的依赖

```typescript
class ComputedImpl<T> {
  private _value!: T
  private _dirty = true
  private dep: Dep = new Dep()
  private effect: ReactiveEffect
  private getter: () => T
  
  get value() {
    this.dep.track()
    
    if (this._dirty) {
      this._value = this.getter()
      this._dirty = false
    }
    
    return this._value
  }
}
```

#### 1.6 watch 实现

- **多种数据源**：支持 ref、getter 函数
- **cleanup 回调**：支持清理副作用
- **immediate 选项**：立即执行回调

```typescript
export function watch<T>(
  source: WatchSource<T>,
  cb: WatchCallback<T>,
  options?: { immediate?: boolean }
): () => void {
  // ... 实现
}
```

### 2. 渲染器重构

#### 2.1 类型系统增强 (`src/core/renderer/types.ts`)

- **ShapeFlags**：位运算快速判断 vnode 类型
- **ComponentOptions**：更完善的组件选项类型
- **ComponentInternalInstance**：完整的组件实例接口
- **VNodeChild**：统一的子节点类型

```typescript
export const enum ShapeFlags {
  ELEMENT = 1,
  COMPONENT = 1 << 1,
  TEXT_CHILDREN = 1 << 2,
  ARRAY_CHILDREN = 1 << 3,
  SLOTS_CHILDREN = 1 << 4,
}
```

#### 2.2 h 函数优化 (`src/core/renderer/h.ts`)

- **children 规范化**：自动处理数组、对象、基本类型
- **shapeFlag 计算**：自动设置形状标志
- **扁平化处理**：支持嵌套数组

```typescript
export function h(
  type: VNodeType, 
  props: Record<string, any> | null = null, 
  children: any = null
): VNode {
  // 规范化 children
  let normalizedChildren: any[] = []
  let shapeFlag = 0
  
  if (typeof type === 'string') {
    shapeFlag = ShapeFlags.ELEMENT
  } else if (typeof type === 'object' && 'setup' in type) {
    shapeFlag = ShapeFlags.COMPONENT
  }
  
  // ... 处理 children
}
```

#### 2.3 mount 函数增强 (`src/core/renderer/mount.ts`)

- **anchor 参数**：支持在指定位置插入
- **Fragment 支持**：正确处理片段节点
- **SVG 检测**：自动识别 SVG 元素

```typescript
export function mount(
  vnode: VNode, 
  container: Element, 
  anchor: Node | null = null
): void {
  if (vnode.shapeFlag & ShapeFlags.COMPONENT) {
    mountComponent(vnode, container, anchor)
    return
  }
  
  // ... 处理元素和文本节点
}
```

#### 2.4 patch 函数完整 Diff 算法 (`src/core/renderer/patch.ts`)

- ** keyed diff**：基于 key 的子节点对比
- **双向同步**：从头尾同时开始同步
- **移动优化**：减少不必要的 DOM 操作
- **组件更新**：通过 effect 触发重新渲染

```typescript
export function patch(
  oldVnode: VNode | null,
  newVnode: VNode,
  container: Element | null = null,
  anchor: Node | null = null
): void {
  if (oldVnode && oldVnode.type !== newVnode.type) {
    unmount(oldVnode)
    oldVnode = null
  }
  
  if (!oldVnode) {
    mount(newVnode, container!, anchor)
    return
  }
  
  // 根据类型分发处理
  if (shapeFlag & ShapeFlags.COMPONENT) {
    processComponent(oldVnode, newVnode, container, anchor)
  } else if (typeof type === 'string') {
    processElement(oldVnode, newVnode, container, anchor)
  } else if (type === Fragment) {
    processFragment(oldVnode, newVnode, container, anchor)
  }
}
```

##### Diff 算法流程

1. **从头同步**：对比相同位置的节点
2. **从尾同步**：从末尾开始对比
3. **新增节点**：挂载新节点
4. **卸载节点**：移除多余节点
5. **乱序处理**：基于 key 映射进行移动

```typescript
function patchKeyedChildren(
  oldChildren: any[],
  newChildren: any[],
  container: Element,
  anchor: Node | null
) {
  // 1. 从头同步
  while (i < oldLength && i < newLength) {
    if (isSameVNodeType(oldChild, newChild)) {
      patch(oldChild, newChild, container, anchor)
    } else {
      break
    }
    i++
  }
  
  // 2. 从尾同步
  while (oldEnd >= i && newEnd >= i) {
    // ...
  }
  
  // 3-5. 处理新增、卸载、乱序
  // ...
}
```

#### 2.5 mountComponent 重构 (`src/core/renderer/mountComponent.ts`)

- **组件实例管理**：完整的 `ComponentInternalInstance`
- **UID 分配**：每个组件实例有唯一 ID
- **update 函数**：封装更新逻辑
- **effect 集成**：通过 effect 自动追踪依赖

```typescript
export function mountComponent(
  vnode: VNode, 
  container: Element, 
  anchor: Node | null = null
): void {
  const instance: ComponentInternalInstance = {
    uid: uid++,
    vnode,
    type: component,
    props: reactive({ ...vnode.props }),
    setupState: null,
    render: null,
    isMounted: false,
    subTree: null,
    effect: null,
    update: () => {}
  }
  
  // 执行 setup
  if (component.setup) {
    instance.setupState = component.setup(instance.props, context)
  }
  
  // 创建更新函数
  instance.update = () => {
    const subTree = instance.render!(instance.props, instance.setupState)
    
    if (!instance.isMounted) {
      // 首次挂载
      mount(instance.subTree, container, anchor)
      triggerMounted()
    } else {
      // 更新
      patch(oldSubTree, newSubTree, container, anchor)
    }
  }
  
  // 创建 effect
  instance.effect = effect(instance.update)
}
```

#### 2.6 render 函数简化 (`src/core/renderer/render.ts`)

- **统一入口**：初次挂载和更新都使用 patch
- **vnode 缓存**：在容器上保存当前 vnode

```typescript
export function render(vnode: VNode, container: Element): void {
  const oldVnode = (container as any)._vnode || null
  patch(oldVnode, vnode, container, null)
  ;(container as any)._vnode = vnode
}
```

### 3. 编译器保持不变

编译器仍然使用 `DOMParser` 进行模板解析，保持了原有的实现：

- `createRuntimeCompiler`：运行时编译器
- `compileComponent`：组件编译辅助函数
- `buildVNode`：从 DOM 构建 VNode

## 使用示例

### 响应式 API

```typescript
import { ref, reactive, computed, effect, watch } from './core'

// ref
const count = ref(0)

// reactive
const state = reactive({ name: '张三', age: 25 })

// computed
const doubleCount = computed(() => count.value * 2)

// effect
effect(() => {
  console.log('count changed:', count.value)
})

// watch
watch(count, (newVal, oldVal) => {
  console.log(`count: ${oldVal} -> ${newVal}`)
})
```

### 组件开发

```typescript
import { h, ref, onMounted } from './core'

const MyComponent = {
  setup(props, { emit }) {
    const count = ref(0)
    
    const increment = () => {
      count.value++
      emit('update', count.value)
    }
    
    onMounted(() => {
      console.log('Mounted!')
    })
    
    return { count, increment }
  },
  
  render(props, state) {
    return h('div', {}, [
      h('p', {}, `Count: ${state.count}`),
      h('button', { onClick: state.increment }, '+')
    ])
  }
}
```

## 测试

创建了 `TestPage.ts` 用于验证新功能：

```bash
npm run dev
# 访问 http://localhost:3001/#/test
```

## 兼容性

- ✅ 保持与现有路由系统兼容
- ✅ 保持与现有组件 API 兼容
- ✅ 编译器继续使用 DOMParser
- ✅ 所有现有页面正常工作

## 性能优化

1. **依赖追踪精确化**：只追踪实际使用的属性
2. **computed 缓存**：避免重复计算
3. **Diff 算法优化**：减少 DOM 操作
4. **effect 调度**：支持批量更新

## 后续改进方向

1. 实现完整的 longest increasing subsequence 算法优化 diff
2. 添加 keep-alive 支持
3. 实现 Teleport 功能
4. 添加 Suspense 支持
5. 优化 Fragment 的 diff 算法

## 总结

本次重构完全按照 Vue 3 的设计思路，实现了：

- ✅ 更完善的响应式系统（effect 栈、调度器、watch）
- ✅ 完整的 Diff 算法（keyed diff、双向同步）
- ✅ 更好的组件管理（实例化、更新、生命周期）
- ✅ 保持编译器不变（仍使用 DOMParser）

代码更加模块化、可维护性更强，性能也有显著提升。
