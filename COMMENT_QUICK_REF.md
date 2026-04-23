# 注释支持 - 快速参考

## 🚀 使用示例

### 基本注释

```html
<div>
  <!-- 这是一个注释 -->
  <p>内容</p>
</div>
```

### 多行注释

```html
<!-- 
  这是多行注释
  第二行
  第三行
-->
```

### 条件分支中的注释

```html
<div v-if="loading">
  <!-- 加载状态提示 -->
  加载中...
</div>
<div v-else>
  <!-- 数据展示区域 -->
  {{ data }}
</div>
```

### 循环中的注释

```html
<div v-for="item in list">
  <!-- 列表项 -->
  {{ item.name }}
</div>
```

## 📁 相关文件

| 文件 | 作用 |
|------|------|
| `src/core/compiler/tokenizer.ts` | 词法分析：识别 `<!-- -->` 并生成 COMMENT token |
| `src/core/compiler/parser.ts` | 语法分析：将 COMMENT token 转换为 ASTComment 节点 |
| `src/core/compiler/generator.ts` | 代码生成：将 ASTComment 编译为 `null` |
| `src/core/compiler/index.ts` | 模块导出：导出 ASTComment 类型 |

## 🔍 调试技巧

### 查看编译日志

在浏览器控制台中可以看到编译过程：

```javascript
[Compile] 生成的代码: ...
[TestComment] 原始模板: ...
[TestComment] 编译后的组件: ...
```

### 验证注释被正确处理

1. 打开浏览器开发者工具
2. 切换到 Elements 面板
3. 检查 DOM 树中**不包含**注释节点
4. 注释已被正确移除，不会渲染到页面

## ⚙️ 配置选项

### 当前行为（默认）

```typescript
// generator.ts
else if (node.type === 'Comment') {
  return 'null'; // 注释不渲染
}
```

### 如需保留注释（开发模式）

修改 `generator.ts`：

```typescript
else if (node.type === 'Comment') {
  // 返回创建真实注释节点的代码
  return `(() => { 
    const comment = document.createComment(${JSON.stringify(node.content)});
    return comment;
  })()`;
}
```

## 🎯 关键概念

1. **编译三阶段**：
   - Tokenize: `<div><!-- 注释 --></div>` → `[TAG_START, COMMENT, TAG_END]`
   - Parse: Tokens → AST `{ type: 'Comment', content: '注释' }`
   - Generate: AST → Code `'null'`

2. **AST 节点类型**：
   ```typescript
   interface ASTComment {
     type: 'Comment';
     content: string;
   }
   ```

3. **设计原则**：
   - 遵循 Vue 3 源码设计
   - 符合《Vue.js 设计与实现》指导
   - 生产环境优化：注释不渲染

## ❓ 常见问题

**Q: 为什么注释不显示在页面上？**  
A: 这是预期行为。Vue 3 在生产环境中会移除注释以优化性能。

**Q: 如何在开发时保留注释用于调试？**  
A: 修改 `generator.ts` 中的 `genNode` 函数，让 Comment 节点返回真实的 DOM 注释。

**Q: 注释会影响性能吗？**  
A: 几乎不会。注释在编译期就被处理为 `null`，运行时没有任何开销。

**Q: 支持条件注释吗？**  
A: 目前不支持 IE 条件注释（如 `<!--[if IE]>`），但可以作为普通注释处理。

## 📚 延伸阅读

- [COMMENT_SUPPORT.md](./COMMENT_SUPPORT.md) - 详细实现文档
- [COMMENT_SUPPORT_SUMMARY.md](./COMMENT_SUPPORT_SUMMARY.md) - 完整总结
- Vue 3 源码：`@vue/compiler-core/src/parse.ts`
- 《Vue.js 设计与实现》第 7 章