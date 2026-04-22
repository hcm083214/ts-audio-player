// ==================== 依赖收集相关 ====================

// 全局活动的 effect
let activeEffect: ReactiveEffect | null = null

// Effect 栈，支持嵌套
const effectStack: ReactiveEffect[] = []

// 标记是否正在清理依赖
let shouldTrack = true

// 副作用函数类型
export type EffectScheduler = () => void

export interface ReactiveEffect {
  (): void
  deps: Dep[]
  scheduler?: EffectScheduler
  allowRecurse?: boolean
}

// 依赖集合类
export class Dep {
  private subscribers: Set<ReactiveEffect> = new Set()

  track() {
    if (!activeEffect || !shouldTrack) return
    
    this.subscribers.add(activeEffect)
    
    // 将当前 dep 添加到 effect 的 deps 中，方便清理
    if (!activeEffect.deps.includes(this)) {
      activeEffect.deps.push(this)
    }
  }

  trigger() {
    // 创建副本，防止遍历时修改集合
    const effectsToRun = new Set(this.subscribers)
    effectsToRun.forEach(effect => {
      if (effect !== activeEffect || effect.allowRecurse) {
        if (effect.scheduler) {
          effect.scheduler()
        } else {
          effect()
        }
      }
    })
  }
}

// WeakMap 用于存储对象的依赖映射
const targetMap = new WeakMap<object, Map<string | symbol, Dep>>()

// 追踪依赖
export function track(target: object, key: string | symbol) {
  if (!activeEffect || !shouldTrack) return

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Dep()
    depsMap.set(key, dep)
  }

  dep.track()
}

// 触发更新
export function trigger(target: object, key: string | symbol) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  const dep = depsMap.get(key)
  if (dep) {
    dep.trigger()
  }
}

// ==================== reactive 实现 ====================

// 响应式对象
export function reactive<T extends object>(target: T): T {
  // 如果已经是响应式对象，直接返回
  if (isReactive(target)) {
    return target
  }

  return new Proxy(target, {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver)
      
      // 如果是内部属性，不追踪
      if (String(key).startsWith('__')) {
        return result
      }
      
      track(target, key)
      
      // 如果结果是对象，递归转换为响应式
      if (isObject(result)) {
        return reactive(result)
      }
      
      return result
    },
    set(target, key, value, receiver) {
      const oldValue = Reflect.get(target, key, receiver)
      const result = Reflect.set(target, key, value, receiver)
      
      // 只有值真正改变时才触发更新
      if (oldValue !== value) {
        trigger(target, key)
      }
      
      return result
    },
    deleteProperty(target, key) {
      const hadKey = Object.prototype.hasOwnProperty.call(target, key)
      const result = Reflect.deleteProperty(target, key)
      
      if (hadKey) {
        trigger(target, key)
      }
      
      return result
    },
    has(target, key) {
      track(target, key)
      return Reflect.has(target, key)
    }
  })
}

// 判断是否为对象
function isObject(val: unknown): val is object {
  return val !== null && typeof val === 'object'
}

// 判断是否为响应式对象
export function isReactive(value: unknown): boolean {
  return !!(value && (value as any).__v_isReactive)
}

// 标记响应式对象
const reactiveMap = new WeakMap<object, object>()

// ==================== ref 实现 ====================

// RefImpl 实现
class RefImpl<T> {
  public __v_isRef = true
  private _value: T
  private dep: Dep

  constructor(value: T) {
    this._value = value
    this.dep = new Dep()
  }

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

// 创建 Ref
export function ref<T>(value: T): RefImpl<T> {
  return new RefImpl(value)
}

// 判断是否为 ref
export function isRef(r: any): r is RefImpl<any> {
  return !!(r && r.__v_isRef)
}

// 解包 ref
export function unref<T>(ref: T | RefImpl<T>): T {
  return isRef(ref) ? (ref as RefImpl<T>).value : (ref as T)
}

// ==================== effect 实现 ====================

// 执行副作用函数
export function effect(fn: () => void, options?: { scheduler?: EffectScheduler }): ReactiveEffect {
  const effectFn = function() {
    // 清理旧的依赖
    cleanup(effectFn)
    
    try {
      // 压入 effect 栈
      effectStack.push(effectFn)
      activeEffect = effectFn
      shouldTrack = true
      
      return fn()
    } finally {
      // 弹出 effect 栈
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1] || null
      shouldTrack = true
    }
  } as ReactiveEffect
  
  effectFn.deps = []
  effectFn.scheduler = options?.scheduler
  effectFn.allowRecurse = !!options?.scheduler
  
  // 立即执行一次
  effectFn()
  
  return effectFn
}

// 清理 effect 的依赖
function cleanup(effect: ReactiveEffect) {
  effect.deps.forEach(dep => {
    dep['subscribers'].delete(effect)
  })
  effect.deps.length = 0
}

// ==================== computed 实现 ====================

// Computed 类型
class ComputedImpl<T> {
  private _value!: T
  private _dirty = true
  private dep: Dep = new Dep()
  private effect: ReactiveEffect
  private getter: () => T

  constructor(getter: () => T) {
    this.getter = getter
    
    // 创建一个 effect 来追踪 computed 的依赖
    this.effect = effect(() => {
      // 当依赖变化时，标记为 dirty
      this._dirty = true
      // 通知订阅者
      this.dep.trigger()
    }, { scheduler: () => {} }) // 使用空的 scheduler 防止立即执行
  }

  get value() {
    // 追踪 computed 自身的依赖
    this.dep.track()
    
    // 如果是 dirty，重新计算
    if (this._dirty) {
      this._value = this.getter()
      this._dirty = false
    }
    
    return this._value
  }
}

// 创建 Computed
export function computed<T>(getter: () => T): ComputedImpl<T> {
  return new ComputedImpl(getter)
}

// ==================== watch 实现 ====================

export type WatchSource<T = any> = RefImpl<T> | (() => T)
export type WatchCallback<V = any, OV = any> = (value: V, oldValue: OV, onCleanup: (cleanupFn: () => void) => void) => void

export function watch<T>(
  source: WatchSource<T>,
  cb: WatchCallback<T>,
  options?: { immediate?: boolean }
): () => void {
  let getter: () => T
  
  if (isRef(source)) {
    getter = () => source.value
  } else if (typeof source === 'function') {
    getter = source as () => T
  } else {
    throw new Error('Invalid watch source')
  }
  
  let oldValue: T
  let cleanup: (() => void) | undefined
  
  const job = () => {
    const newValue = getter()
    
    // 如果有清理函数，先执行
    if (cleanup) {
      cleanup()
    }
    
    // 调用回调
    cb(newValue, oldValue, (cleanupFn: () => void) => {
      cleanup = cleanupFn
    })
    
    oldValue = newValue
  }
  
  // 创建 effect
  const runner = effect(() => {
    getter()
    job()
  }, { scheduler: job })
  
  // 立即执行
  if (options?.immediate) {
    job()
  } else {
    oldValue = getter()
  }
  
  // 返回停止函数
  return () => {
    // 清理 effect 的依赖
    runner.deps.forEach(dep => {
      ;(dep as any).subscribers.delete(runner)
    })
    runner.deps.length = 0
  }
}

// ==================== 生命周期钩子 ====================

const onMountedCallbacks: (() => void)[] = []
const onUnmountedCallbacks: (() => void)[] = []

export function onMounted(fn: () => void) {
  onMountedCallbacks.push(fn)
}

export function onUnmounted(fn: () => void) {
  onUnmountedCallbacks.push(fn)
}

// 触发挂载回调
export function triggerMounted() {
  onMountedCallbacks.forEach(cb => cb())
  onMountedCallbacks.length = 0
}

// 触发卸载回调
export function triggerUnmounted() {
  onUnmountedCallbacks.forEach(cb => cb())
  onUnmountedCallbacks.length = 0
}
