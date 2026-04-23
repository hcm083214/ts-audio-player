# 编译器注释支持实现文档

## 概述

参照 Vue 3 源码和《Vue.js 设计与实现》，为自定义编译器添加了对 HTML 注释的支持。

## 实现细节

### 1. Tokenizer 层（词法分析）

**文件**: `src/core/compiler/tokenizer.ts`

在 `Token` 接口中添加了 `COMMENT` 类型：

```typescript
export interface Token {
  type: 'TAG_START' | 'TAG_END' | 'TEXT' | 'INTERPOLATION' | 'COMMENT';
  value: string;
  props?: Record<string, ASTPropValue>;
  directives?: Record<string, string>;
}
```

在 `tokenize` 函数中添加注释识别逻辑：

```typescript
// 检测注释 <!-- -->
if (template.slice(i, i + 4) === '<!--') {
  const endCommentIndex = template.indexOf('-->', i + 4);
  if (endCommentIndex !== -1) {
    // 提取注释内容（不包括 <!-- 和 -->）
    const commentContent = template.slice(i + 4, endCommentIndex);
    tokens.push({ type: 'COMMENT', value: commentContent });
    i = endCommentIndex + 3; // 跳过 '-->'
    continue;
  }
}
```

**特点**：
- 正确识别 `<!-- 注释内容 -->` 格式
- 提取注释内容时不包含标记符号
- 支持多行注释
- 处理嵌套标签中的注释

### 2. Parser 层（语法分析）

**文件**: `src/core/compiler/parser.ts`

添加 `ASTComment` 节点类型定义：

```typescript
export interface ASTComment {
  type: 'Comment';
  content: string;
}

export type ASTNode = ASTElement | ASTInterpolation | ASTText | ASTComment | ASTRoot;
```

在 `parse` 函数中处理注释 token：

```typescript
else if (token.type === 'COMMENT') {
  parent.children.push({ type: 'Comment', content: token.value });
}
```

**特点**：
- 将 COMMENT token 转换为 ASTComment 节点
- 注释节点可以出现在任何允许子节点的位置
- 保持与 Vue 3 AST 结构的一致性

### 3. Generator 层（代码生成）

**文件**: `src/core/compiler/generator.ts`

在 `genNode` 函数中添加注释节点处理：

```typescript
else if (node.type === 'Comment') {
  // 注释节点：在开发环境中保留注释，生产环境中可以移除
  // 这里选择生成一个返回 null 的表达式，表示不渲染任何内容
  // 如果需要保留注释用于调试，可以改为返回注释节点
  return 'null';
}
```

**设计决策**：
- **默认行为**：注释被编译为 `null`，不会在 DOM 中渲染
- **符合 Vue 3 优化策略**：生产环境中注释通常被移除以提升性能
- **可扩展性**：如需保留注释，可修改此逻辑返回实际的注释节点创建代码

## 测试示例

### 基本注释

```html
<div>
  <!-- 这是一个测试注释 -->
  <h1>{{ message }}</h1>
</div>
```

### 多行注释

```html
<div>
  <!-- 
    多行注释
    第二行内容
  -->
  <p>内容</p>
</div>
```

### 条件分支中的注释

```html
<div>
  <!-- 加载状态 -->
  <div v-if="loading">加载中...</div>
  <!-- 数据展示区域 -->
  <div v-else>数据内容</div>
</div>
```

## 与 Vue 3 的对比

| 特性 | Vue 3 | 本项目实现 |
|------|-------|-----------|
| AST 节点类型 | `NodeTypes.COMMENT` (值为 3) | `{ type: 'Comment' }` |
| 节点结构 | `{ type, content, loc }` | `{ type: 'Comment', content }` |
| 默认行为 | 生产环境移除注释 | 编译为 `null` |
| 位置信息 | 包含 `loc` 字段 | 暂未实现 |

## 参考资源

1. **Vue 3 源码**：
   - `@vue/compiler-core/src/parse.ts` - `parseComment` 函数
   - `@vue/compiler-core/src/ast.ts` - `NodeTypes.COMMENT` 枚举

2. **《Vue.js 设计与实现》**：
   - 第 7 章：模板编译原理
   - 注释节点在 AST 中的处理方式
   - 生产环境优化策略

## 未来扩展

如需增强注释功能，可以考虑：

1. **保留位置信息**：添加 `loc` 字段记录注释在模板中的位置
2. **开发模式支持**：在开发环境中生成真实的 DOM 注释节点
3. **条件编译**：通过编译选项控制是否保留注释
4. **特殊注释指令**：支持类似 `<!-- @skip -->` 的编译指令

## 验证方法

1. 访问 `http://localhost:3001/test` 查看测试页面
2. 检查浏览器开发者工具中的 Elements 面板
3. 确认注释不会出现在最终的 DOM 树中
4. 检查控制台是否有编译错误

## 注意事项

- 注释不会被渲染到 DOM 中，仅作为模板的一部分存在
- 注释内容不会影响组件的响应式系统
- 大量注释可能略微增加编译时间，但不影响运行时性能