# IconComponent Props 传递问题分析

## 问题现象

在 `IconComponent.ts` 中添加调试日志：

```typescript
setup(props: any) {
  // console.log("🚀 ~ props:", props.name)
  // ...
}
```

**控制台输出**：
```
🚀 ~ props: undefined
```

## 根本原因

### 1. setup 函数的调用时机

在当前的渲染系统中，**组件的 setup 函数是在组件实例化时由 renderer 调用的**，而不是在文件导入时。

查看 `renderer.ts` 中的 `mountComponent` 函数：

```typescript
function mountComponent(vnode: VNode, container: Element) {
  const component = vnode.type as Component
  const props = vnode.props || {}  // ✅ props 从 vnode 中获取
  
  const instance: ComponentInstance = {
    vnode,
    props: reactive(props),  // props 被转换为响应式对象
    setupState: null,
    // ...
  }
  
  if (component.setup) {
    instance.setupState = component.setup(instance.props)  // ⚠️ 调用 setup，传入响应式 props
  }
  // ...
}
```

### 2. Props 的传递流程

```
模板中的 <IconComponent name="play" />
    ↓
template-compiler.ts 解析为 VNode
    ↓
{
  type: IconComponent,
  props: { name: 'play', width: 24, ... },  // ✅ 正确收集
  children: []
}
    ↓
renderer.ts 挂载组件
    ↓
mountComponent(vnode, container)
    ↓
component.setup(instance.props)  // ⚠️ 传入的是响应式代理对象
```

### 3. 为什么 props.name 是 undefined？

可能的原因：

#### 原因 1：访问时机过早
如果 setup 函数在文件顶层被调用（而不是作为对象方法），props 可能还未传递。

**错误示例**：
```typescript
const IconComponent = {
  setup(props: any) {
    // console.log(props.name)  // ❌ 此时 props 可能未定义
    return {}
  }
}
```

#### 原因 2：响应式代理对象的访问问题
`instance.props` 被 `reactive()` 包装过，是一个 Proxy 对象。直接访问可能在某些情况下失效。

**解决方案**：使用更安全的方式访问 props。

## 解决方案

### 方案 1：使用默认值和安全访问（推荐）

```typescript
const IconComponent = {
  setup(props: any) {
    // 安全访问 props，提供默认值
    const name = props?.name || ''
    const width = props?.width || 24
    const height = props?.height || 24
    const className = props?.className || ''
    
    return { name, width, height, className }
  }
}
```

### 方案 2：在返回的对象中使用计算属性

```typescript
const IconComponent = {
  setup(props: any) {
    return {
      get name() {
        return '#icon-' + (props?.name || '')
      },
      get width() {
        return props?.width || 24
      },
      get height() {
        return props?.height || 24
      },
      get className() {
        return props?.className || ''
      }
    }
  }
}
```

### 方案 3：延迟访问 props

如果需要在 setup 中立即使用 props 进行某些操作（如 API 调用），确保在正确的时机访问：

```typescript
const IconComponent = {
  setup(props: any) {
    // 不要在这里立即访问 props
    // // console.log(props.name)  // ❌ 可能未定义
    
    // 而是在返回的方法中访问
    const updateIcon = () => {
      const iconName = props?.name  // ✅ 在方法中访问
      // ...
    }
    
    return { updateIcon }
  }
}
```

## 实际修改

根据项目代码，IconComponent 已经修改为：

```typescript
const IconComponent = {
  setup(props: any) {
    // props 可能是响应式代理对象，需要安全地访问
    const getName = () => {
      try {
        return props?.name || ''
      } catch (e) {
        console.error('Failed to access props.name:', e)
        return ''
      }
    }
    
    const name: string = '#icon-' + getName()
    const width: number = props?.width || 24
    const height: number = props?.height || 24
    const className: string = props?.className || ''
    
    // console.log("✅ ~ 处理后的值:", { name, width, height, className })
    
    return { name, width, height, className }
  },
  props: ['name', 'width', 'height', 'className'],
  template: `...`
}
```

## 调试技巧

### 1. 添加详细的日志

```typescript
setup(props: any) {
  // console.log("🔍 IconComponent setup 被调用")
  // console.log("📦 props:", props)
  // console.log("📦 props 类型:", typeof props, Object.getPrototypeOf(props))
  // console.log("📦 props.name:", props?.name)
  // console.log("📦 props.width:", props?.width)
  
  // ...
}
```

### 2. 检查 vnode 创建

在 `template-compiler.ts` 中添加日志：

```typescript
return {
  type: componentType,
  props,
  children,
  _debug: () => // console.log('VNode created:', { type: componentType, props })
}
```

### 3. 检查 renderer 调用

在 `renderer.ts` 的 `mountComponent` 中添加日志：

```typescript
function mountComponent(vnode: VNode, container: Element) {
  // console.log('Mounting component:', vnode.type)
  // console.log('Component props:', vnode.props)
  // ...
}
```

## 常见问题

### Q: 为什么不能直接在 setup 中访问 props.name？

A: 
1. **时序问题**：setup 可能在 props 完全初始化之前被调用
2. **响应式代理**：props 被 reactive() 包装后是 Proxy 对象，访问方式可能不同
3. **防御性编程**：使用可选链和默认值可以避免运行时错误

### Q: 如何确认 props 是否正确传递？

A: 
1. 在 `mountComponent` 中检查 `vnode.props`
2. 在 setup 中打印完整的 props 对象
3. 检查模板编译器是否正确收集了属性

### Q: 如果 props 有多个层级怎么办？

A: 
使用深度克隆或逐层访问：

```typescript
setup(props: any) {
  const config = props?.config || {}
  const iconConfig = config.icon || {}
  const name = iconConfig.name || ''
  
  // 或者使用工具函数
  const getProp = (path: string, defaultValue: any) => {
    return path.split('.').reduce((acc, key) => acc?.[key], props) || defaultValue
  }
  
  const name = getProp('config.icon.name', '')
  
  return { name }
}
```

## 总结

Props 为 undefined 的原因通常是：
1. ✅ **访问时机不对** - 在 props 完全初始化前访问
2. ✅ **响应式代理** - Proxy 对象的特殊行为
3. ✅ **缺少防御性编程** - 没有使用可选链和默认值

**最佳实践**：
- 始终使用可选链 `?.` 访问 props
- 提供合理的默认值
- 避免在 setup 顶层直接访问 props 进行副作用操作
- 在方法或计算属性中延迟访问
