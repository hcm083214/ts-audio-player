# Vue 3 风格响应式系统和渲染器使用指南

## 快速开始

项目已经按照《Vue.js 设计与实现》和 Vue 3 的设计思路完成了核心模块的重构。

### 启动开发服务器

```bash
npm run dev
```

访问：
- 首页：http://localhost:3001/#/
- 测试页：http://localhost:3001/#/test

## 核心 API

### 1. 响应式系统

#### ref - 创建响应式引用

```typescript
import { ref } from './core'

const count = ref(0)
console.log(count.value) // 0
count.value++
console.log(count.value) // 1
```

#### reactive - 创建响应式对象

```typescript
import { reactive } from './core'

const state = reactive({
  name: '张三',
  age: 25,
  address: {
    city: '北京'
  }
})

console.log(state.name) // '张三'
state.age = 26 // 触发更新
```

#### computed - 计算属性

```typescript
import { ref, computed } from './core'

const count = ref(0)
const doubleCount = computed(() => count.value * 2)

console.log(doubleCount.value) // 0
count.value = 5
console.log(doubleCount.value) // 10（自动更新）
```

#### effect - 副作用函数

```typescript
import { ref, effect } from './core'

const count = ref(0)

effect(() => {
  console.log('count changed:', count.value)
})

count.value++ // 输出: count changed: 1
```

#### watch - 监听变化

```typescript
import { ref, watch } from './core'

const count = ref(0)

watch(count, (newVal, oldVal, onCleanup) => {
  console.log(`count: ${oldVal} -> ${newVal}`)
  
  // 清理函数
  onCleanup(() => {
    console.log('cleanup')
  })
}, { immediate: true })

count.value++ // 输出: count: 0 -> 1
```

### 2. 渲染器

#### h - 创建虚拟节点

```typescript
import { h } from './core'

// 基本用法
const vnode = h('div', { className: 'container' }, [
  h('h1', {}, 'Hello World'),
  h('p', {}, 'This is a paragraph')
])

// 文本子节点
const textVnode = h('span', {}, 'Some text')

// 嵌套结构
const nested = h('div', {}, [
  h('ul', {}, [
    h('li', {}, 'Item 1'),
    h('li', {}, 'Item 2')
  ])
])
```

#### 组件开发

```typescript
import { h, ref, computed, onMounted } from './core'

const Counter = {
  props: ['initialValue'],
  
  setup(props, { emit }) {
    const count = ref(props.initialValue || 0)
    
    const doubleCount = computed(() => count.value * 2)
    
    const increment = () => {
      count.value++
      emit('update', count.value)
    }
    
    onMounted(() => {
      console.log('Counter mounted!')
    })
    
    return {
      count,
      doubleCount,
      increment
    }
  },
  
  render(props, state) {
    return h('div', { className: 'counter' }, [
      h('p', {}, `Count: ${state.count}`),
      h('p', {}, `Double: ${state.doubleCount}`),
      h('button', { 
        onClick: state.increment 
      }, 'Increment')
    ])
  }
}
```

### 3. 生命周期钩子

```typescript
import { onMounted, onUnmounted } from './core'

const MyComponent = {
  setup() {
    onMounted(() => {
      console.log('Component mounted')
    })
    
    onUnmounted(() => {
      console.log('Component unmounted')
    })
    
    return {}
  },
  
  render(props, state) {
    return h('div', {}, 'Hello')
  }
}
```

### 4. 事件处理

```typescript
const Button = {
  emits: ['click'],
  
  setup(props, { emit }) {
    const handleClick = () => {
      emit('click', 'clicked!')
    }
    
    return { handleClick }
  },
  
  render(props, state) {
    return h('button', {
      onClick: state.handleClick
    }, 'Click me')
  }
}

// 父组件中使用
h(Button, {
  onClick: (msg) => console.log(msg)
})
```

## 完整示例

查看 `src/pages/TestPage.ts` 获取完整的测试示例：

```typescript
import { h, ref, computed, reactive, onMounted } from '../core'

const TestComponent = {
  setup() {
    const count = ref(0)
    const message = ref('Hello Vue 3 Style!')
    
    const doubleCount = computed(() => count.value * 2)
    
    const user = reactive({
      name: '张三',
      age: 25
    })
    
    const increment = () => count.value++
    const decrement = () => count.value--
    
    onMounted(() => {
      console.log('✅ Component mounted!')
    })
    
    return {
      count,
      message,
      doubleCount,
      user,
      increment,
      decrement
    }
  },
  
  render(props, state) {
    return h('div', { className: 'p-4' }, [
      h('h1', { className: 'text-2xl font-bold mb-4' }, 'Vue 3 Style 测试'),
      
      h('div', { className: 'mb-4' }, [
        h('p', {}, `消息: ${state.message}`),
        h('p', {}, `计数: ${state.count}`),
        h('p', {}, `双倍: ${state.doubleCount}`),
        h('p', {}, `用户: ${state.user.name}, 年龄: ${state.user.age}`)
      ]),
      
      h('div', { className: 'flex gap-2' }, [
        h('button', { 
          className: 'px-4 py-2 bg-blue-500 text-white rounded',
          onClick: state.decrement
        }, '-'),
        
        h('button', { 
          className: 'px-4 py-2 bg-green-500 text-white rounded',
          onClick: state.increment
        }, '+')
      ])
    ])
  }
}

export default TestComponent
```

## 与现有代码的兼容性

### 保持不变的 API

- ✅ `compileComponent` - 组件编译
- ✅ `createRuntimeCompiler` - 运行时编译器
- ✅ `buildVNode` - 从 DOM 构建 VNode
- ✅ 路由系统 - 完全兼容

### 新增的 API

- ✨ `watch` - 监听响应式数据变化
- ✨ `isRef` / `unref` - Ref 工具函数
- ✨ `isReactive` - 判断是否为响应式对象
- ✨ ShapeFlags - vnode 类型标识

### 改进的功能

- 🚀 更精确的依赖追踪
- 🚀 computed 缓存优化
- 🚀 完整的 Diff 算法
- 🚀 更好的组件更新机制

## 最佳实践

### 1. 使用 ref 还是 reactive？

- **基本类型**：使用 `ref`
- **对象类型**：两者都可以，推荐 `reactive`
- **需要替换整个对象**：使用 `ref`

```typescript
// 基本类型
const count = ref(0)

// 对象
const state = reactive({ name: '张三' })

// 可能需要替换的对象
const config = ref({ theme: 'dark' })
config.value = { theme: 'light' } // 直接替换
```

### 2. Computed vs Effect

- **需要返回值**：使用 `computed`
- **只需要副作用**：使用 `effect`

```typescript
// Computed - 有返回值
const doubleCount = computed(() => count.value * 2)

// Effect - 副作用
effect(() => {
  console.log('count changed:', count.value)
})
```

### 3. 组件设计原则

- **单一职责**：每个组件只做一件事
- **Props 向下，Events 向上**：通过 props 接收数据，通过 emit 发送事件
- **组合优于继承**：使用小组件组合成大组件

## 调试技巧

### 1. 检查响应式状态

```typescript
import { isRef, isReactive } from './core'

console.log(isRef(count)) // true
console.log(isReactive(state)) // true
```

### 2. 追踪依赖

在 effect 中添加日志：

```typescript
effect(() => {
  console.log('Effect running, count:', count.value)
  // 这个函数会在 count 变化时重新执行
})
```

### 3. 检查 vnode 结构

```typescript
const vnode = h('div', {}, 'Hello')
console.log(vnode)
// {
//   type: 'div',
//   props: {},
//   children: ['Hello'],
//   shapeFlag: 5, // ELEMENT | TEXT_CHILDREN
//   ...
// }
```

## 性能优化建议

1. **避免在模板中创建对象**：会导致每次渲染都创建新对象
2. **使用 key 优化列表**：帮助 diff 算法更高效
3. **合理使用 computed**：避免重复计算
4. **拆分大组件**：提高更新效率

## 常见问题

### Q: 为什么我的视图没有更新？

A: 确保你使用了响应式 API：

```typescript
// ❌ 错误 - 普通变量不会触发更新
let count = 0

// ✅ 正确 - 使用 ref
const count = ref(0)
```

### Q: 如何在 setup 中访问 props？

A: setup 的第一个参数就是 props：

```typescript
setup(props, context) {
  console.log(props.title) // 访问 props
  return {}
}
```

### Q: effect 什么时候执行？

A: 
- 创建时立即执行一次
- 依赖的响应式数据变化时重新执行

## 参考资源

- 《Vue.js 设计与实现》- 霍春阳
- [Vue 3 官方文档](https://vuejs.org/)
- [Vue 3 源码](https://github.com/vuejs/core)

## 下一步

1. 阅读 `CORE_REFACTORING_VUE3.md` 了解详细的技术实现
2. 查看 `src/pages/TestPage.ts` 学习实际用法
3. 尝试修改现有页面，应用新的 API
4. 探索更多 Vue 3 的特性
