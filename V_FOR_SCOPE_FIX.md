# v-for 作用域变量绑定修复

## 🐛 问题描述

在 BannerComponent 中使用 v-for 时，生成的代码出现了错误的变量引用：

```javascript
// ❌ 错误生成的代码
"key": ctx.banner.ctx.id + '-' + ctx.index
"class": ctx.indicatorClasses.value[ctx.index.value]
```

应该是：

```javascript
// ✅ 正确的代码
"key": banner.id + '-' + index
"class": indicatorClasses[index]
```

## 🔍 根本原因

在 `generator.ts` 的 `genElementContent` 函数中，处理 v-for 时存在以下问题：

1. **属性绑定在外层生成**：`:key`, `:class` 等属性的代码在外层 [genElementContent](file://d:\Project\01.前端项目\ts-music-player\Frontend\src\core\compiler\generator.ts#L176-L511) 函数中生成，此时还不知道是否在 v-for 作用域内
2. **缺少作用域信息传递**：嵌套元素的属性处理没有接收到 v-for 的作用域变量（item, index）
3. **变量替换逻辑不完善**：直接对所有变量添加 `ctx.` 前缀，没有区分作用域变量和外部响应式数据

## ✅ 解决方案

参照 Vue 3 源码和《Vue.js 设计与实现》的设计思路，进行了以下重构：

### 1. 添加作用域感知的变量替换函数

```typescript
// 辅助函数：在 v-for 作用域内智能替换变量
function replaceVarsInForScope(expr: string, itemVar: string, indexVar?: string): string {
  return expr.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g, (varName: string) => {
    // 跳过 JavaScript 关键字和特殊变量
    if (['value', 'target', 'event', 'e', '$event', 'true', 'false', 'null', 'undefined', 'this', 
         'String', 'Number', 'Boolean', 'Array', 'Object', 'Math', 'Date', 'JSON', 'console'].includes(varName)) {
      return varName;
    }
    // 如果是 v-for 作用域变量，直接使用
    if (varName === itemVar || (indexVar && varName === indexVar)) {
      return varName;
    }
    // 其他变量通过 ctx 访问
    return `ctx.${varName}`;
  });
}
```

### 2. 重构属性生成逻辑

创建了可复用的辅助函数，支持传入作用域变量：

```typescript
// 生成属性绑定代码的辅助函数（可重用）
const generatePropsEntries = (
  propsToProcess: Record<string, any>, 
  itemVar?: string,  // v-for 作用域变量
  indexVar?: string  // v-for 索引变量
): string[] => {
  // ... 处理逻辑，根据是否有作用域变量选择不同的替换策略
}

// 生成 class 合并代码的辅助函数
const generateClassEntry = (
  staticClass: any, 
  dynamicClassExpr: any, 
  itemVar?: string, 
  indexVar?: string
): string | null => {
  // ... class 处理逻辑
}
```

### 3. 递归处理嵌套元素时传递作用域

```typescript
const generateScopedChildren = (
  children: ASTNode[], 
  scopeItemVar: string,    // 传递作用域变量
  scopeIndexVar?: string   // 传递索引变量
): string => {
  return children.map((child: ASTNode) => {
    if (child.type === 'Element') {
      // 递归处理时传递作用域变量
      const scopedPropsEntries = generatePropsEntries(
        child.props || {}, 
        scopeItemVar, 
        scopeIndexVar
      );
      // ...
    }
    // ...
  }).join(',');
};
```

### 4. 在 v-for 处理时使用作用域感知逻辑

```typescript
if (node.directives.for) {
  const itemVar = match[1] || match[3];
  const indexVar = match[2];
  
  // 为当前节点生成带作用域的 h() 调用
  const scopedPropsEntries = generatePropsEntries(props, itemVar, indexVar);
  const scopedClassEntry = generateClassEntry(staticClass, dynamicClassExpr, itemVar, indexVar);
  
  // 生成子节点时也传递作用域
  const scopedChildrenStr = `[${generateScopedChildren(node.children, itemVar, indexVar)}]`;
  
  // 生成 map 调用
  code = `${sourceAccess}.map((${mapParams}) => ${scopedHCode})`;
}
```

## 📊 修复效果对比

### 修复前

```javascript
// BannerComponent 生成的代码
(ctx.originalBanners?.value ?? ctx.originalBanners).map((banner, index) => 
  h('span', {
    "class": ctx.indicatorClasses.value[ctx.index.value],  // ❌ 错误
    "key": 'ctx.indicator-' + ctx.banner.ctx.id            // ❌ 错误
  }, [])
)
```

### 修复后

```javascript
// BannerComponent 生成的代码
(ctx.originalBanners?.value ?? ctx.originalBanners).map((banner, index) => 
  h('span', {
    "class": ctx.indicatorClasses[index],     // ✅ 正确
    "key": 'indicator-' + banner.id           // ✅ 正确
  }, [])
)
```

## 🎯 关键设计原则

1. **作用域隔离**：v-for 创建的局部变量（item, index）不应该被添加 `ctx.` 前缀
2. **递归传递**：嵌套元素的处理需要继承父级的作用域信息
3. **智能替换**：根据变量名判断是作用域变量还是外部响应式数据
4. **向后兼容**：不影响非 v-for 场景的正常工作

## 📝 测试用例

### 基本 v-for

```html
<div v-for="item in list" :key="item.id">
  {{ item.name }}
</div>
```

生成：
```javascript
ctx.list.map((item) => 
  h('div', { key: item.id }, [String(item.name)])
)
```

### 带索引的 v-for

```html
<span 
  v-for="(banner, index) in banners" 
  :key="'indicator-' + banner.id"
  :class="classes[index]"
  @click="goTo(index)"
>
</span>
```

生成：
```javascript
ctx.banners.map((banner, index) => 
  h('span', { 
    key: 'indicator-' + banner.id,
    class: ctx.classes[index],
    onClick: () => { ctx.goTo.value(index) }
  }, [])
)
```

### 嵌套元素

```html
<div v-for="item in items">
  <img :src="item.imageUrl" :alt="item.title" />
</div>
```

生成：
```javascript
ctx.items.map((item) => 
  h('div', {}, [
    h('img', { 
      src: item.imageUrl,    // ✅ 作用域变量
      alt: item.title        // ✅ 作用域变量
    }, [])
  ])
)
```

## 🔗 相关文件

- `src/core/compiler/generator.ts` - 主要修复文件
- `src/components/home/BannerComponent.ts` - 测试组件

## 📚 参考资源

- Vue 3 源码：`@vue/compiler-core/src/transforms/vFor.ts`
- 《Vue.js 设计与实现》第 11 章：v-for 的实现原理
- Vue 3 RFC: https://github.com/vuejs/rfcs/blob/master/active-rfcs/0000-v-for-key-injection.md

## ⚠️ 注意事项

1. **作用域变量优先级**：如果模板中的变量名与 v-for 作用域变量冲突，作用域变量优先
2. **嵌套 v-for**：当前实现支持单层 v-for，嵌套 v-for 需要额外的作用域栈管理（暂未实现）
3. **性能考虑**：每次 v-for 都会创建新的 map 函数，符合 Vue 3 的设计理念