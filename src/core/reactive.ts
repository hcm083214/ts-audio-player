// 依赖收集器
class Dep {
  private subscribers: Set<Effect> = new Set()

  depend() {
    if (activeEffect) {
      this.subscribers.add(activeEffect)
    }
  }

  notify() {
    this.subscribers.forEach(effect => {
      effect()
    })
  }
}

// 全局活动的 effect
let activeEffect: Effect | null = null

// Effect 类型
type Effect = () => void

//  WeakMap 用于存储对象的依赖映射
const targetMap = new WeakMap<object, Map<string | symbol, Dep>>()

// 追踪依赖
function track(target: object, key: string | symbol) {
  if (!activeEffect) return

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Dep()))
  }

  dep.depend()
}

// 触发更新
function trigger(target: object, key: string | symbol) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  const dep = depsMap.get(key)
  if (dep) {
    dep.notify()
  }
}

// 响应式对象
function reactive<T extends object>(target: T): T {
  return new Proxy(target, {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver)
      track(target, key)
      if (typeof result === 'object' && result !== null) {
        return reactive(result)
      }
      return result
    },
    set(target, key, value, receiver) {
      const oldValue = Reflect.get(target, key, receiver)
      const result = Reflect.set(target, key, value, receiver)
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
    }
  })
}

// Ref 类型
class RefImpl<T> {
  private _value: T
  private dep: Dep = new Dep()

  constructor(value: T) {
    this._value = value
  }

  get value() {
    track(this, 'value')
    return this._value
  }

  set value(newValue: T) {
    if (this._value !== newValue) {
      this._value = newValue
      trigger(this, 'value')
    }
  }
}

// 创建 Ref
function ref<T>(value: T): RefImpl<T> {
  return new RefImpl(value)
}

// 执行副作用函数
function effect(fn: Effect) {
  const effectFn = () => {
    activeEffect = effectFn
    try {
      fn()
    } finally {
      activeEffect = null
    }
  }
  effectFn()
  return effectFn
}

// Computed 类型
class ComputedImpl<T> {
  private _value: T | null = null
  private _dirty = true
  private dep: Dep = new Dep()
  private effect: Effect

  constructor(getter: () => T) {
    this.effect = effect(() => {
      if (!this._dirty) {
        this._dirty = true
        this.dep.notify()
      }
    })
    ;(this.effect as any).computed = this
  }

  get value() {
    track(this, 'value')
    if (this._dirty) {
      this._value = (this.effect as any)()
      this._dirty = false
    }
    return this._value as T
  }
}

// 创建 Computed
function computed<T>(getter: () => T): ComputedImpl<T> {
  return new ComputedImpl(getter)
}

// 生命周期钩子
const onMountedCallbacks: (() => void)[] = []

function onMounted(fn: () => void) {
  onMountedCallbacks.push(fn)
  // 立即执行，简化实现
  setTimeout(fn, 0)
}

export { reactive, ref, effect, computed, onMounted }
