# Core 模块 - 快速参考卡

## 📦 核心 API

### 响应式系统
```typescript
import { ref, reactive, computed, watchEffect } from './core'

const count = ref(0)
const state = reactive({ name: 'test' })
const doubled = computed(() => count.value * 2)
watchEffect(() => console.log(count.value))
```

### 虚拟 DOM
```typescript
import { h, Fragment } from './core'

h('div', { class: 'container' }, [
  h('h1', {}, 'Hello'),
  h('span', {}, 'World')
])
```

### 编译器
```typescript
import { compile, createRuntimeCompiler } from './core'

// 编译模板
const render = compile('<div>{{ message }}</div>')
const vnode = render(h, { message: 'Hello' })

// 运行时编译
const compiler = createRuntimeCompiler('<div>{{ text }}</div>')
```

### 路由
```typescript
import { createRouter } from './core'

const router = createRouter([
  { path: '/', component: HomePage },
  { path: '/about', component: AboutPage }
], 'hash')

router.push('/about')
```

## 🏗️ 架构层次

```
┌─────────────────────────────────────┐
│         Application Layer           │  Pages & Components
├─────────────────────────────────────┤
│         Compiler Layer              │  Template → VNode
│  (compileComponent, interpolate)    │
├─────────────────────────────────────┤
│        Renderer Layer               │  VNode → DOM
│    (h, mount, patch, render)        │
├─────────────────────────────────────┤
│       Reactivity Layer              │  Data Tracking
│   (ref, reactive, computed)         │
└─────────────────────────────────────┘
```

## 📁 文件结构

```
src/core/
├── reactivity/
│   └── reactive.ts          # 响应式系统
├── renderer/
│   ├── h.ts                 # 创建 VNode
│   ├── types.ts             # 类型定义
│   ├── mount.ts             # 挂载元素
│   ├── patch.ts             # 更新 DOM
│   ├── render.ts            # 渲染入口
│   └── index.ts             # 导出
├── compiler/
│   ├── compileComponent.ts  # 模板编译
│   ├── interpolate.ts       # 插值处理
│   ├── router.ts            # 路由系统
│   └── index.ts             # 导出
└── index.ts                 # 总出口
```

## 🎯 关键特性

### ✅ 支持的指令
- `v-if` / `v-else` - 条件渲染
- `v-model` - 双向绑定
- `:prop` - 属性绑定
- `@event` - 事件绑定

### ✅ 支持的功能
- SVG 元素渲染
- 组件化开发
- 响应式数据
- 路由管理
- 插件系统

### ✅ 性能优化
- Set 去重的依赖追踪
- 简化的 Diff 算法
- 统一的 SVG/HTML 处理
- 高效的 DOM 更新

## 🔧 常用模式

### 组件定义
```typescript
import { h, ref } from './core'

const MyComponent = {
  setup() {
    const count = ref(0)
    const increment = () => count.value++
    
    return { count, increment }
  },
  render(ctx) {
    return h('div', {}, [
      h('p', {}, `Count: ${ctx.count}`),
      h('button', { onClick: ctx.increment }, 'Increment')
    ])
  }
}
```

### 模板组件
```typescript
const MyComponent = {
  template: `
    <div>
      <p>Count: {{ count }}</p>
      <button @click="increment">Increment</button>
    </div>
  `,
  setup() {
    const count = ref(0)
    const increment = () => count.value++
    return { count, increment }
  }
}
```

### 条件渲染
```html
<div v-if="isLoading">Loading...</div>
<div v-else>Data loaded</div>
```

### 双向绑定
```html
<input v-model="username" />
<p>Hello, {{ username }}</p>
```

## ⚡ 快速开始

### 1. 创建应用
```typescript
import { h, ref, render } from './core'

const App = {
  setup() {
    const message = ref('Hello World')
    return { message }
  },
  render(ctx) {
    return h('div', {}, ctx.message)
  }
}

const app = document.getElementById('app')
render(h(App), app)
```

### 2. 使用路由
```typescript
import { createRouter, h } from './core'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'

const routes = [
  { path: '/', component: HomePage },
  { path: '/about', component: AboutPage }
]

const router = createRouter(routes, 'hash')
```

### 3. 响应式状态
```typescript
import { reactive, computed } from './core'

const state = reactive({
  items: [],
  filter: ''
})

const filteredItems = computed(() => 
  state.items.filter(item => 
    item.name.includes(state.filter)
  )
)
```

## 🐛 调试技巧

### 启用日志
```typescript
// 在关键位置添加
console.log('🔍 VNode:', vnode)
console.log('🔄 State:', state)
console.log('⚡ Effect triggered')
```

### 检查响应式
```typescript
import { ref } from './core'

const data = ref(0)
console.log('Is reactive?', typeof data === 'object')
console.log('Value:', data.value)
```

### 查看 VNode
```typescript
const vnode = h('div', { class: 'test' }, 'Hello')
console.dir(vnode)
// { type: 'div', props: { class: 'test' }, children: 'Hello', tag: 'div' }
```

## 📚 相关文档

- 📖 **详细重构总结**: `CORE_REFACTORING_SUMMARY.md`
- 🧪 **测试指南**: `CORE_REFACTORING_TEST.md`
- 🔄 **Router 迁移**: `ROUTER_MIGRATION_GUIDE.md`
- 🗑️ **清理指南**: `CLEANUP_GUIDE.md`
- 📊 **完整报告**: `REFACTORING_COMPLETE_REPORT.md`
- ✨ **最终总结**: `FINAL_SUMMARY.md`

## 🔗 有用链接

- 开发服务器: http://localhost:3001/
- 参考实现: `src/core/mVue.ts`
- 项目主页: `index.html`
- 入口文件: `src/main.ts`

## 💡 提示

1. **优先使用新 API**: `watchEffect` 而非 `effect`
2. **SVG 自动处理**: 无需手动判断，系统会自动识别
3. **模板编译**: 支持完整的 Vue 风格模板语法
4. **路由模式**: Hash 模式更适合静态部署
5. **类型安全**: 充分利用 TypeScript 的类型检查

---

**版本**: v2.0 (Refactored)  
**最后更新**: 2026-04-17  
**维护者**: Development Team
