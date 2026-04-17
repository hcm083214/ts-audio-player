// 响应式系统 (Reactivity) - 基于 mVue.ts 实现
const isObject = (val: any) => val !== null && typeof val === 'object';
const targetMap = new WeakMap<any, Map<any, Set<ReactiveEffect>>>();
let activeEffect: ReactiveEffect | undefined;
let shouldTrack = false;

class ReactiveEffect {
  fn: () => void;
  deps: Set<ReactiveEffect>[] = [];

  constructor(fn: () => void) {
    this.fn = fn;
  }

  run() {
    // 清理旧的依赖关系
    this.deps.forEach(dep => dep.delete(this));
    this.deps.length = 0;
    
    try {
      activeEffect = this;
      shouldTrack = true;
      return this.fn();
    } finally {
      shouldTrack = false;
      activeEffect = undefined;
    }
  }

  effect() {
    this.run();
  }
}

function track(target: any, key: any) {
  if (!shouldTrack || !activeEffect) return;
  
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  
  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, (deps = new Set()));
  }
  
  if (!deps.has(activeEffect)) {
    deps.add(activeEffect);
    activeEffect.deps.push(deps);
  }
}

function trigger(target: any, key: any) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  
  const deps = depsMap.get(key);
  if (deps) {
    // 创建副本以防止无限循环或在迭代期间修改集合
    const effectsToRun = new Set(deps);
    effectsToRun.forEach(effectFn => effectFn.effect());
  }
}

// 响应式对象
function reactive<T extends object>(obj: T): T {
  return new Proxy(obj, {
    get(target, key, receiver) {
      track(target, key);
      const res = Reflect.get(target, key, receiver);
      return isObject(res) ? reactive(res as any) : res;
    },
    set(target, key, value, receiver) {
      const res = Reflect.set(target, key, value, receiver);
      trigger(target, key);
      return res;
    }
  });
}

// 创建 Ref
function ref<T>(val: T) {
  return reactive({ value: val });
}

// 创建 Computed
function computed<T>(getter: () => T) {
  const res = ref<T>(undefined as any);
  const effect = new ReactiveEffect(() => {
    res.value = getter();
  });
  effect.effect();
  return res;
}

// 执行副作用函数 (Watch Effect)
function watchEffect(fn: () => void) {
  const effect = new ReactiveEffect(fn);
  effect.effect();
  return effect;
}

// 生命周期钩子（保持兼容）
const onMountedCallbacks: (() => void)[] = []
const onUnmountedCallbacks: (() => void)[] = []

function onMounted(fn: () => void) {
  onMountedCallbacks.push(fn)
  setTimeout(fn, 0)
}

function onUnmounted(fn: () => void) {
  onUnmountedCallbacks.push(fn)
}

function triggerMounted() {
  onMountedCallbacks.forEach(cb => cb())
  onMountedCallbacks.length = 0
}

function triggerUnmounted() {
  onUnmountedCallbacks.forEach(cb => cb())
  onUnmountedCallbacks.length = 0
}

export { 
  reactive, 
  ref, 
  computed, 
  watchEffect, 
  onMounted, 
  onUnmounted, 
  triggerMounted, 
  triggerUnmounted,
  ReactiveEffect
}