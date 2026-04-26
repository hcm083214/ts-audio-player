# 编译器代码生成模块架构

## 概述

本目录包含模板编译器的代码生成（Code Generation）模块，负责将 AST（抽象语法树）转换为可执行的 JavaScript 渲染函数。

参照 **Vue 3 源码**及**霍春阳《Vue.js 设计与实现》**的设计理念，采用模块化架构，按职责拆分为四个核心模块。

## 模块结构

```
compiler/
├── generator.ts          # 主生成器入口（协调各模块）
├── variableResolver.ts   # 变量解析器（处理表达式中的变量替换）
├── propsGenerator.ts     # 属性生成器（生成 h() 函数的 props）
├── directiveHandler.ts   # 指令处理器（v-for, v-if/v-else）
├── index.ts              # 统一导出
└── README.md             # 本文档
```

## 模块职责

### 1. variableResolver.ts - 变量解析器

**职责**：处理表达式中的变量替换和作用域管理

**核心函数**：
- `processInterpolationExpr(expr)`: 插值表达式变量替换
  - 示例：`{{ playlist.name }}` → `ctx.playlist.name`
  - 示例：`{{ formatPlayCount(count) }}` → `ctx.formatPlayCount(ctx.count)`

- `replaceVarsInForScope(expr, itemVar, indexVar)`: v-for 作用域内变量替换
  - 示例：`banner.id`（作用域变量）→ `banner.id`（不添加 ctx）
  - 示例：`playlist.name`（外部变量）→ `ctx.playlist.value.name`

- `smartReplaceVariables(expr)`: 智能变量替换（非 v-for 作用域）
  - 跳过字符串字面量、对象键名
  - 正确处理属性访问链和函数调用

**设计原则**：
- 独立变量：添加 `ctx.` 前缀和 `.value` 解包 Ref
- 属性访问链：只给根变量添加 `ctx.` 前缀
- 函数调用：只给函数名添加 `ctx.` 前缀，递归处理参数
- 字符串字面量：保持原样
- 对象键名：保持原样（后面跟着冒号）

### 2. propsGenerator.ts - 属性生成器

**职责**：生成 h() 函数的 props 对象

**核心函数**：
- `generatePropsEntries(props, itemVar?, indexVar?, isCustomComponent?)`: 生成属性绑定代码数组
  - 支持静态属性、动态绑定 (`:prop`)、事件绑定 (`@event`)
  - 事件绑定转换为 `onEvent` 格式（大驼峰）

- `generateClassEntry(staticClass, dynamicClassExpr, itemVar?, indexVar?)`: 处理 class 合并
  - 静态 class + 动态 :class → `normalizeClass([static, dynamic])`

- `generateBaseHCall(node, props, staticClass, dynamicClassExpr, isCustomComponent, ...)`: 生成基础 h() 调用
  - 自定义组件：`h(ctx.ComponentName, props, children)`
  - HTML 元素：`h('div', props, children)`

**支持的属性类型**：
- 静态属性：`class="container"` → `"class": "container"`
- 动态绑定：`:src="imgUrl"` → `"src": ctx.imgUrl?.value ?? ctx.imgUrl`
- 事件绑定：`@click="handleClick"` → `"onClick": () => { ctx.handleClick.value() }`
- v-model：`v-model="text"` → `:value="ctx.text" @input="$event => (ctx.text = $event.target.value)"`

### 3. directiveHandler.ts - 指令处理器

**职责**：处理 Vue 指令的编译逻辑

**核心函数**：
- `processIfElse(children)`: 预处理 v-if/v-else，建立节点关联
  - 遍历 AST，将 v-else 节点挂载到前一个 v-if 节点的 `elseNode` 属性
  - 标记并移除独立的 v-else 节点

- `generateVForCode(node, props, ..., genNode, generateScopedChildren)`: 生成 v-for 代码
  - 解析 `item in list` 或 `(item, index) in list` 语法
  - 生成 `.map()` 调用：`list.map((item, index) => h(...))`
  - 传递作用域变量给子节点生成

- `generateVIfCode(baseCode, node, genNode)`: 生成 v-if 代码
  - 条件表达式：`v-if="show"` → `ctx.show.value ? ... : null`
  - v-if/v-else：`condition ? ifCode : elseCode`

**关键特性**：
- v-for 支持索引变量：`(item, index) in items`
- v-if/v-else 通过 AST 预处理建立关联
- 作用域传递：v-for 内部嵌套元素继承作用域变量

### 4. generator.ts - 主生成器入口

**职责**：协调各模块，完成 AST 到代码的转换

**核心函数**：
- `generate(ast)`: 主入口函数
  - 预处理 AST（processIfElse）
  - 递归遍历节点（genNode）

- `genNode(node)`: 节点分发
  - Root → 递归处理子节点
  - Element → genElementContent
  - Interpolation → processInterpolationExpr
  - Text → 转义并返回字符串
  - Comment → 返回 `null`

- `genElementContent(node)`: 元素节点生成
  - 处理 v-model
  - 分离静态/动态 class
  - 判断是否为自定义组件
  - 调用 generateVForCode 或 generateBaseHCall
  - 调用 generateVIfCode 处理条件渲染

**设计原则**：
- 单一职责：只负责协调，具体逻辑委托给子模块
- 依赖注入：向子模块传递必要的上下文（genNode、generateScopedChildren）
- 避免循环依赖：单向依赖关系（generator → 其他模块）

## 数据流

```
template string
    ↓
tokenize() → tokens
    ↓
parse() → AST
    ↓
generate(ast) [generator.ts]
    ├─ processIfElse() [directiveHandler.ts]
    ├─ genNode()
    │   ├─ processInterpolationExpr() [variableResolver.ts]
    │   └─ genElementContent()
    │       ├─ generateVForCode() [directiveHandler.ts]
    │       │   ├─ generatePropsEntries() [propsGenerator.ts]
    │       │   └─ generateScopedChildren()
    │       │       └─ replaceVarsInForScope() [variableResolver.ts]
    │       ├─ generateBaseHCall() [propsGenerator.ts]
    │       │   ├─ generatePropsEntries()
    │       │   └─ generateClassEntry()
    │       └─ generateVIfCode() [directiveHandler.ts]
    ↓
render function code string
    ↓
new Function() → CompiledRenderFn
```

## 使用示例

```typescript
import { compile } from './compiler'

// 编译模板
const template = `
  <div v-for="item in items" :key="item.id">
    {{ item.name }}
  </div>
`

const renderFn = compile(template)

// 执行渲染函数
const vnode = renderFn(h, ctx, normalizeClass)
```

## 调试技巧

1. **查看 AST 结构**：在 `compile()` 中已添加针对 BannerComponent 的 AST 打印
2. **查看生成的代码**：所有组件的生成代码都会通过 `console.log('[Compile] 生成的代码:', code)` 输出
3. **查看 v-for 编译结果**：`directiveHandler.ts` 中有专门的日志输出

## 参考资源

- [Vue 3 源码 - packages/compiler-core/src/codegen.ts](https://github.com/vuejs/core/blob/main/packages/compiler-core/src/codegen.ts)
- 《Vue.js 设计与实现》第 10 章：渲染器的实现
- 《Vue.js 设计与实现》第 11 章：编译器的实现
