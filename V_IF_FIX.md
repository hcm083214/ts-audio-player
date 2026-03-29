# v-if 指令修复文档

## 问题描述
在组件模板中使用 `v-if` 指令时，条件渲染不生效，元素始终显示。

## 根本原因
在 `src/core/template-compiler.ts` 中，`v-if` 指令只是被检测到但未被正确处理：
1. **template 标签上的 v-if**：代码检测到 `v-if` 属性后，只是"简化处理：直接渲染内容"，没有根据条件值决定是否渲染
2. **普通元素上的 v-if**：完全未处理，直接忽略

## 修复方案

### 1. 修复 `<template>` 标签上的 `v-if`
在 `buildVNode` 函数中，当遇到 `<template>` 标签时：

```typescript
if (hasVIf) {
  // 处理 v-if
  const conditionExpr = el.getAttribute('v-if')
  if (!conditionExpr) return null
  const conditionValue = evaluateExpression(conditionExpr, context)
  
  // 如果条件为假，不渲染任何内容
  if (!conditionValue) {
    return null
  }
  
  // 条件为真，渲染内容
  const children: any[] = []
  Array.from(el.childNodes).forEach(child => {
    const vnode = buildVNode(child)
    if (vnode) children.push(vnode)
  })
  return {
    type: Fragment,
    props: {},
    children
  }
}
```

**修复逻辑**：
- 提取 `v-if` 的表达式
- 使用 `evaluateExpression` 在上下文中求值
- 条件为 `false` 时返回 `null`（不渲染）
- 条件为 `true` 时正常渲染子节点

### 2. 修复普通元素上的 `v-if`
在收集元素属性之前，先检查并处理 `v-if`：

```typescript
// 检查是否有 v-if 指令
const vIfAttr = Array.from(el.attributes).find(attr => attr.name === 'v-if')
if (vIfAttr) {
  const conditionExpr = vIfAttr.value
  const conditionValue = evaluateExpression(conditionExpr, context)
  
  // 如果条件为假，不渲染此元素
  if (!conditionValue) {
    return null
  }
}
```

**修复逻辑**：
- 查找元素的 `v-if` 属性
- 求值条件表达式
- 条件为 `false` 时直接返回 `null`，阻止元素渲染

## 修复的文件

### src/core/template-compiler.ts
- **位置 1**: 第 191-208 行 - 修复 `<template>` 标签的 `v-if` 处理
- **位置 2**: 第 256-267 行 - 修复普通元素的 `v-if` 处理

## 使用示例

### 示例 1：在 div 上使用 v-if
```html
<div v-if="loading" class="loading">
  加载中...
</div>
```

当 `loading` 为 `true` 时显示，为 `false` 时不渲染该 `div`。

### 示例 2：在 template 上使用 v-if/v-else
```html
<template v-if="loading">
  <div>加载中...</div>
</template>
<template v-else>
  <div>内容已加载</div>
</template>
```

**注意**：当前实现中 `v-else` 和 `v-else-if` 仍然采用简化处理（总是渲染），后续需要进一步完善以支持完整的条件链。

### 示例 3：复杂的条件表达式
```html
<div v-if="user && user.isLoggedIn">
  欢迎，{{ user.name }}
</div>
```

支持访问上下文中的对象属性和逻辑运算。

## 技术细节

### 表达式求值
使用 `evaluateExpression` 函数在沙箱环境中求值：
```typescript
function evaluateExpression(expr: string, context: any): any {
  try {
    const keys = Object.keys(context)
    const values = Object.values(context)
    
    // 创建函数：return context[expr]
    const fn = new Function(...keys, `"use strict"; return (${expr})`)
    return fn(...values)
  } catch (e) {
    console.warn('Expression evaluation error:', expr, e)
    return undefined
  }
}
```

### 类型安全
添加了 TypeScript 类型检查：
- `getAttribute` 可能返回 `null`，需要显式检查
- 条件表达式不能为空，否则返回 `null`

## 测试场景

### HomePage.ts 中的应用
```typescript
<div v-if="loading" class="flex justify-center items-center h-screen">
  <div class="text-2xl font-bold text-primary">加载中...</div>
</div>

<template v-else>
  <!-- 主要内容 -->
</template>
```

当 `loading.value === true` 时显示加载提示，否则显示主要内容。

## 已知限制

1. **v-else 和 v-else-if 未完全实现**：当前版本对这些指令采用简化处理（总是渲染），后续需要跟踪前一个条件状态来实现完整的条件链。

2. **性能优化**：每次渲染都会重新求值条件表达式，可以考虑缓存机制。

3. **响应式更新**：当条件变化时，需要手动触发重新渲染（由响应式系统处理）。

## 后续改进建议

1. **实现 v-else 和 v-else-if**：
   - 需要跟踪前一个 `v-if`/`v-else-if` 的结果
   - 只有当前面的条件都为 `false` 时才渲染 `v-else`

2. **添加 v-show 支持**：
   - 与 `v-if` 不同，`v-show` 只是切换 CSS 的 `display` 属性
   - 适合频繁切换的场景

3. **条件缓存**：
   - 缓存条件表达式的求值结果
   - 只在依赖项变化时重新计算

4. **错误处理增强**：
   - 更友好的错误提示
   - 条件表达式语法错误的容错处理

## 验证方法

运行项目并访问 HomePage，应该能看到：
- 初始加载时显示"加载中..."提示
- 数据加载完成后显示主要内容
- "加载中..."提示完全消失（而不是始终存在）
