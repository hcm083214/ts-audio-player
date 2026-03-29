# IconComponent Props 传递问题 - 深度调试指南

## 问题现象

在 IconComponent 的 setup 函数中访问 props.name 时得到 undefined：

```typescript
setup(props: any) {
  console.log("🚀 ~ getName ~ props?.name:", props?.name)
  // 输出：undefined
}
```

## 可能的原因分析

### 原因 1：属性未正确收集

**检查点**：模板编译器是否正确收集了组件标签的属性？

在 `template-compiler.ts` 的第 275-316 行，代码处理所有属性：

```typescript
Array.from(el.attributes).forEach(attr => {
  const name = attr.name      // 例如："name"
  const value = attr.value    // 例如："play"
  
  // 普通属性处理（第 304-312 行）
  const interpolatedValue = interpolate(value, context)
  props[name] = interpolatedValue
})
```

**预期结果**：`props.name = "play"`

### 原因 2：interpolate 函数处理异常

Interpolate 函数用于处理 `{{ }}` 插值，但对于普通字符串应该原样返回：

```typescript
function interpolate(str: string, context: any): string {
  if (!str) return str || ''  // ✅ 已修复空值问题
  
  return str.replace(/\{\{(.*?)\}\}/g, (match, expr) => {
    // 只处理包含 {{ }} 的字符串
  })
}
```

对于 `name="play"`，`interpolate("play", context)` 应该返回 `"play"`。

### 原因 3：VNode 构建失败

在收集属性后，需要正确构建 VNode：

```typescript
return {
  type: componentType,
  props,      // 应该包含 { name: 'play', width: 24, ... }
  children
}
```

### 原因 4：Renderer 未正确传递 Props

在 `renderer.ts` 的 mountComponent 函数中：

```typescript
function mountComponent(vnode: VNode, container: Element) {
  const props = vnode.props || {}  // 从 VNode 获取 props
  
  const instance = {
    props: reactive(props),  // 转换为响应式对象
    // ...
  }
  
  component.setup(instance.props)  // 传递给 setup
}
```

## 调试步骤

### 步骤 1：检查模板编译器输出

在 `template-compiler.ts` 中添加日志（已添加）：

```typescript
console.log('🔍 处理属性:', name, '=', value)
console.log('📝 插值结果:', name, '=', interpolatedValue)
```

**预期输出**：
```
🔍 处理属性：name = play
📝 插值结果：name = play
```

### 步骤 2：检查 VNode 创建

在返回 VNode 前添加日志：

```typescript
console.log('✅ VNode created:', { 
  type: componentType.constructor.name, 
  props 
})
```

**预期输出**：
```
✅ VNode created: { 
  type: "Object", 
  props: { name: 'play', width: 24, height: 24, className: '...' } 
}
```

### 步骤 3：检查 Renderer 接收

在 `renderer.ts` 中添加日志（已添加）：

```typescript
console.log('🎯 Mounting component:', component)
console.log('📦 VNode props:', props)
```

**预期输出**：
```
🎯 Mounting component: Object
📦 VNode props: { name: 'play', width: 24, ... }
```

### 步骤 4：检查 Setup 调用

在 `renderer.ts` 中继续添加日志：

```typescript
console.log('🔧 Reactive props:', instance.props)
console.log('🚀 Calling setup with:', instance.props)
console.log('📦 Setup 中访问 props.name:', instance.props.name)
```

**如果这里已经是 undefined，说明是响应式系统的问题**。

## 已实施的修复

### 修复 1：增强 interpolate 函数的健壮性

```typescript
function interpolate(str: string, context: any): string {
  if (!str) return str || ''  // 处理 null/undefined
  
  return str.replace(/\{\{(.*?)\}\}/g, (match, expr) => {
    try {
      const result = evaluateExpression(expr.trim(), context)
      return String(result)
    } catch (e) {
      console.warn('Interpolation error:', expr, e)
      return match
    }
  })
}
```

### 修复 2：IconComponent 使用安全访问

```typescript
const IconComponent = {
  setup(props: any) {
    const name: string = '#icon-' + (props?.name || '')
    const width: number = props?.width || 24
    const height: number = props?.height || 24
    const className: string = props?.className || ''
    
    return { name, width, height, className }
  }
}
```

### 修复 3：添加全面的调试日志

已在关键位置添加日志：
- ✅ 模板编译器：属性处理阶段
- ✅ 模板编译器：VNode 创建阶段
- ✅ Renderer：组件挂载阶段
- ✅ Renderer：Setup 调用阶段

## 验证方法

运行项目后，查看控制台输出，按顺序检查：

1. **属性收集阶段**
   ```
   🔍 处理属性：name = play
   📝 插值结果：name = play
   ```

2. **VNode 创建阶段**
   ```
   ✅ VNode created: { type: "Object", props: { name: 'play', ... } }
   ```

3. **组件挂载阶段**
   ```
   🎯 Mounting component: Object
   📦 VNode props: { name: 'play', ... }
   ```

4. **Setup 调用阶段**
   ```
   🔧 Reactive props: Proxy { name: 'play', ... }
   🚀 Calling setup with: Proxy
   📦 Setup 中访问：name = play  ✅ 或 undefined ❌
   ```

## 常见问题场景

### 场景 1：属性值为 undefined

**原因**：DOMParser 可能无法正确解析某些属性格式。

**解决**：确保模板中的属性使用标准 HTML 语法：
```html
<!-- ✅ 正确 -->
<IconComponent name="play" :width="24" />

<!-- ❌ 错误：可能导致解析失败 -->
<IconComponent name={play} />
```

### 场景 2：响应式代理导致访问失败

**原因**：`reactive()` 创建的 Proxy 对象可能在初始化完成前无法访问。

**解决**：使用延迟访问或计算属性：
```typescript
setup(props: any) {
  return {
    get name() {
      return '#icon-' + (props?.name || '')
    },
    get width() {
      return props?.width || 24
    }
  }
}
```

### 场景 3：属性名大小写问题

**原因**：DOMParser 可能改变属性名的大小写。

**解决**：检查实际解析后的属性名：
```typescript
Array.from(el.attributes).forEach(attr => {
  console.log('Attribute:', attr.name, attr.value)
  // 确认 name 是否为预期的值
})
```

## 下一步行动

1. **运行项目**并查看控制台输出
2. **定位问题阶段**：确定是哪个环节出了问题
3. **根据日志调整**：
   - 如果属性收集阶段就错了 → 检查 DOMParser 解析
   - 如果 VNode 创建阶段错了 → 检查属性收集逻辑
   - 如果 Renderer 阶段错了 → 检查 VNode 传递
   - 如果 Setup 调用阶段错了 → 检查响应式系统

## 相关文档

- [ICON_PROPS_DEBUG.md](ICON_PROPS_DEBUG.md) - Props 传递机制详解
- [TEMPLATE_COMPILER_GUIDE.md](TEMPLATE_COMPILER_GUIDE.md) - 模板编译器实现细节
- [RENDERER_ARCHITECTURE.md](RENDERER_ARCHITECTURE.md) - 渲染器架构说明
