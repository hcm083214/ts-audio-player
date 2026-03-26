# Vue 组件迁移文档

## 概述
本文档说明如何将 Vue3 单文件组件 (.vue) 迁移为纯 JavaScript 对象字面量定义方式的组件。

---

## 迁移内容

### 1. 组件文件列表

| 原文件 | 新文件 | 状态 |
|--------|--------|------|
| src/pages/HomePage.vue | src/pages/HomePage.js | ✅ 已迁移 |
| src/pages/PlayerPage.vue | src/pages/PlayerPage.js | ✅ 已迁移 |
| - | src/pages/CounterExample.js | ✅ 新增示例 |

---

## 组件定义规范

### 基本结构
```javascript
export default {
  setup() {
    const state = ref(initialValue)
    return { state }
  },
  
  render(props, setupState) {
    return h('div', {}, [/* 内容 */])
  }
}
```

### 主要特性

1. **setup 函数**：组件的入口点，用于定义响应式状态和计算逻辑
2. **render 函数**：组件的渲染函数，返回虚拟 DOM
3. **h 函数**：用于创建虚拟 DOM 节点

---

## 迁移示例

### HomePage 组件迁移

#### 主要改动：
1. 移除了 &lt;template&gt; 和 &lt;script setup&gt; 标签
2. 改为使用 setup 函数
3. 使用 h 函数手动构建虚拟 DOM 树
4. 保留了所有原有功能和样式

关键代码片段：

```javascript
import { ref, onMounted } from '../core/reactive'
import { h } from '../core/renderer'
import * as api from '../api'

export default {
  setup() {
    const playlists = ref([])
    // ... 其他状态
    
    onMounted(() => {
      loadData()
    })
    
    return { playlists, /* ... */ }
  },
  
  render(props, { playlists, topSongs, topArtists, loading }) {
    if (loading) {
      return h('div', { className: '...' }, ['加载中...'])
    }
    
    return h('div', {}, [
      // 构建完整的 DOM 树
    ])
  }
}
```

---

## 两种组件实现方式

### 方式一：使用 h 函数（推荐）
直接使用 h 函数创建虚拟 DOM，性能最优且与现有系统兼容性最好。

```javascript
export default {
  setup() {
    const count = ref(0)
    return { count }
  },
  
  render(props, { count }) {
    return h('div', {}, [
      h('p', {}, `计数: ${count.value}`),
      h('button', { onClick: () => count.value++ }, '点击')
    ])
  }
}
```

### 方式二：字符串模板（演示）
使用 template 属性定义字符串模板，更接近于 Vue 的写法。

```javascript
import { ref } from '../core/reactive'
import { createRenderFunction } from '../core/template-compiler'

export default {
  setup() {
    const count = ref(0)
    return { count }
  },
  
  template: `
    <div>
      <p>计数: {{ count }}</p>
      <button @click="count++">点击</button>
    </div>
  `
}
```

---

## 项目结构更新

```
ts-music-player/
├── src/
│   ├── core/
│   │   ├── reactive.ts
│   │   ├── renderer.ts
│   │   ├── template-compiler.ts      # 新增：模板编译器
│   │   └── vite-plugin-sfc.ts
│   ├── pages/
│   │   ├── HomePage.js               # 迁移后的首页组件
│   │   ├── PlayerPage.js             # 迁移后的播放页组件
│   │   ├── CounterExample.js         # 新增：示例组件
│   │   ├── HomePage.vue              # 保留（可选）
│   │   └── PlayerPage.vue            # 保留（可选）
│   ├── router/
│   ├── api/
│   ├── styles/
│   └── main.ts
├── package.json
├── vite.config.ts
├── EXECUTION_DOCUMENT.md
└── COMPONENT_MIGRATION.md              # 新增：迁移文档
```

---

## 使用指南

### 在路由中使用组件

```javascript
// 在 router/index.ts 中
import HomePage from '../pages/HomePage.js'
import PlayerPage from '../pages/PlayerPage.js'

const routes = [
  { path: '/', component: HomePage },
  { path: '/player', component: PlayerPage }
]
```

### 创建新组件

1. 在 `src/pages/` 目录下创建新的 .js 文件
2. 定义 setup 函数和 render 函数
3. 导出组件对象

---

## 注意事项

1. **响应式数据访问**：在 render 函数中访问 ref 数据时需要使用 `.value`
2. **事件绑定**：使用 onClick 而不是 @click（与 React 类似）
3. **类名设置**：使用 className 而不是 class
4. **嵌套元素**：通过 children 数组传递子元素
5. **条件渲染**：使用 JavaScript 的 if/else 或三元运算符
6. **列表渲染**：使用 Array.map() 生成子元素数组

---

## 总结

本次迁移成功实现了以下目标：

✅ 将 .vue 单文件组件迁移为纯 JavaScript 对象字面量形式  
✅ 保持原有功能和样式不变  
✅ 提供了两种实现方式的示例  
✅ 创建了完整的迁移文档和说明  
✅ 组件可以正常注册和使用

虽然完整的 Vue3 模板编译器功能很复杂，但我们已经提供了基础框架和示例，让开发者可以选择最适合的方式来定义组件。
