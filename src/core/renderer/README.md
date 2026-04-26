# 渲染器挂载模块架构

## 概述

本目录包含虚拟 DOM 渲染器的挂载（Mount）模块，负责将 VNode（虚拟 DOM 节点）转换为真实 DOM 并插入到容器中。

参照 **Vue 3 源码**及**霍春阳《Vue.js 设计与实现》**的设计理念，采用模块化架构，按职责拆分为四个核心模块。

## 模块结构

```
renderer/
├── mount.ts              # 主挂载入口（协调各模块）
├── componentMounter.ts   # 组件挂载器（对象式/函数式组件）
├── elementMounter.ts     # 元素挂载器（HTML/SVG 元素）
├── propsSetter.ts        # 属性设置器（事件、class、style 等）
└── README.md             # 本文档
```

## 模块职责

### 1. propsSetter.ts - 属性设置器

**职责**：处理 DOM 元素的属性绑定和更新

**核心函数**：
- `setElementProps(el, key, value, prevValue)`: 设置单个属性
  - 事件绑定：`onClick` → `addEventListener`
  - class 绑定：支持字符串、对象、数组，自动规范化
  - style 绑定：支持字符串或对象
  - SVG 命名空间：`xlink:href` 等特殊属性处理

**关键特性**：
- **SVG 兼容性**：自动检测 SVG 元素，使用 `setAttributeNS` 处理命名空间属性
- **事件管理**：自动解绑旧事件监听器，避免内存泄漏
- **Class 规范化**：集成 [normalizeClass](file://d:\Project\01.前端项目\ts-music-player\Frontend\src\core\compiler\normalizeClass.ts) 工具函数

### 2. elementMounter.ts - 元素挂载器

**职责**：处理 HTML/SVG 元素的创建、属性设置和子节点挂载

**核心函数**：
- `mountChildren(children, parentEl)`: 递归扁平化并挂载子节点
  - 过滤 null/undefined（v-if 返回）
  - 处理嵌套数组（v-for 生成）
  - 字符串直接创建文本节点
  - VNode 递归调用 [mount()](file://d:\Project\01.前端项目\ts-music-player\Frontend\src\core\renderer\mount.ts#L18-L40)

- `mountElement(vnode, container, anchor)`: 挂载单个元素
  - 判断是否为 SVG（`isSvg`）
  - 创建元素（`createElement` / `createElementNS`）
  - 遍历设置所有属性（跳过 `key`）
  - 处理子节点（文本或数组）
  - 插入到容器（支持 anchor 定位）

**设计原则**：
- **单一职责**：只负责元素节点的挂载，不处理组件逻辑
- **递归扁平化**：通过 [mountChildren](file://d:\Project\01.前端项目\ts-music-player\Frontend\src\core\renderer\elementMounter.ts#L16-L37) 处理任意深度的嵌套数组
- **SVG 优先**：在创建元素时即判断命名空间，确保正确性

### 3. componentMounter.ts - 组件挂载器

**职责**：处理对象式组件和函数式组件的挂载逻辑

**核心函数**：
- `mountObjectComponent(vnode, container, anchor)`: 挂载对象式组件
  - 执行 [setup()](file://d:\Project\01.前端项目\ts-music-player\Frontend\src\core\types.ts#L19-L19) 方法获取状态和方法
  - 确定 render 函数来源（setup 返回值或组件定义）
  - 使用 `ReactiveEffect` 包裹渲染逻辑
  - 构建上下文（合并 props、components、setupResult）
  - 调用 render 函数生成 subTree
  - 为每个组件实例创建独立容器（避免共享导致覆盖）

- `mountFunctionalComponent(vnode, container, anchor)`: 挂载函数式组件
  - 直接调用组件函数获取 subTree
  - 递归处理嵌套数组
  - 逐个挂载子节点

**辅助函数**：
- `mountSubTree(tree, componentContainer)`: 递归挂载子树
- `createComponentContainerAndMount(...)`: 首次挂载时创建独立容器
- `updateComponentContainerAndMount(...)`: 更新阶段清空并重新挂载

**关键修复**：
- **容器隔离**：每个组件实例拥有独立的包装 div，防止 v-for 生成的多个实例互相覆盖
- **响应式追踪**：使用 `ReactiveEffect` 确保 render 执行时能收集依赖

### 4. mount.ts - 主挂载入口

**职责**：协调各模块，根据 VNode 类型分发到对应的处理器

**核心函数**：
- `mount(vnode, container, anchor)`: 主入口函数
  - 空值检查
  - 对象式组件 → [mountObjectComponent()](file://d:\Project\01.前端项目\ts-music-player\Frontend\src\core\renderer\componentMounter.ts#L81-L151)
  - 函数式组件 → [mountFunctionalComponent()](file://d:\Project\01.前端项目\ts-music-player\Frontend\src\core\renderer\componentMounter.ts#L159-L183)
  - HTML/SVG 元素 → [mountElement()](file://d:\Project\01.前端项目\ts-music-player\Frontend\src\core\renderer\elementMounter.ts#L44-L81)

**设计原则**：
- **单一职责**：只负责类型判断和分发，具体逻辑委托给子模块
- **依赖注入**：向子模块传递必要的上下文
- **避免循环依赖**：单向依赖关系（mount → 其他模块）

## 数据流

```
render() 调用
    ↓
mount(vnode, container) [mount.ts]
    ├─ vnode.type === 'object' → mountObjectComponent() [componentMounter.ts]
    │   ├─ 执行 setup()
    │   ├─ ReactiveEffect(() => {
    │   │   ├─ 调用 renderFn(h, ctx, normalizeClass)
    │   │   └─ createComponentContainerAndMount() / updateComponentContainerAndMount()
    │   │       └─ mountSubTree()
    │   │           └─ mount() ← 递归
    │   └─ })
    │
    ├─ vnode.type === 'function' → mountFunctionalComponent() [componentMounter.ts]
    │   └─ 调用组件函数 → mountSubTree() → mount() ← 递归
    │
    └─ vnode.type === 'string' → mountElement() [elementMounter.ts]
        ├─ 创建元素（createElement / createElementNS）
        ├─ setElementProps() [propsSetter.ts]
        │   ├─ 事件绑定
        │   ├─ class 规范化
        │   ├─ style 处理
        │   └─ SVG 命名空间
        └─ mountChildren()
            └─ mount() ← 递归
```

## 关键设计决策

### 1. 组件容器隔离

**问题**：v-for 生成的多个组件实例共享同一个父容器，每个组件 effect 执行 `container.innerHTML = ''` 会导致前一个组件被清除。

**解决方案**：
```typescript
// 为每个组件创建独立的包装 div
const wrapper = document.createElement('div');
container.appendChild(wrapper);
vnode.el = wrapper;

// 组件内容挂载到 wrapper，而不是直接操作 container
mountSubTree(subTree, wrapper);
```

### 2. 响应式依赖追踪

**问题**：如果直接在 mount 中调用 render 函数而不包裹 effect，不会触发依赖追踪。

**解决方案**：
```typescript
const effectFn = new ReactiveEffect(() => {
  const subTree = renderFn(h, ctx, normalizeClass);
  // ... 挂载逻辑
});
effectFn.effect(); // 立即执行，收集依赖
```

### 3. SVG 命名空间处理

**问题**：`xlink:href` 等属性必须使用 `setAttributeNS`，否则无法正确渲染。

**解决方案**：
```typescript
if (el instanceof SVGElement && key.includes(':')) {
  const [prefix, localName] = key.split(':');
  if (prefix === 'xlink') {
    el.setAttributeNS('http://www.w3.org/1999/xlink', localName, value);
  }
}
```

## 使用示例

```typescript
import { h, mount } from './core/renderer'

// 创建 VNode
const vnode = h('div', { class: 'container' }, [
  h('h1', {}, ['Hello World']),
  h(MyComponent, { name: 'Test' })
])

// 挂载到 DOM
const container = document.getElementById('app')
mount(vnode, container)
```

## 调试技巧

1. **查看组件挂载日志**：在 [mountObjectComponent](file://d:\Project\01.前端项目\ts-music-player\Frontend\src\core\renderer\componentMounter.ts#L81-L151) 中添加 console.log 输出 ctx 和 subTree
2. **检查容器结构**：浏览器 DevTools 查看 DOM 树，确认每个组件有独立的包装 div
3. **验证响应式更新**：修改响应式数据，观察视图是否自动更新

## 参考资源

- [Vue 3 源码 - packages/runtime-core/src/renderer.ts](https://github.com/vuejs/core/blob/main/packages/runtime-core/src/renderer.ts)
- 《Vue.js 设计与实现》第 10 章：渲染器的实现
- 项目记忆规范：[组件渲染容器隔离规范](memory://cd4334d9-1a43-455a-82ab-9f5a9cf939ab)
