# Core 模块拆分文档

## 概述

为了提高代码可维护性和可读性，已将原来的大型单体文件 `template-compiler.ts` (632 行) 和 `renderer.ts` (338 行) 拆分为多个职责单一的小模块。

## 新的模块结构

### 类型定义模块
- **types.ts** - 所有公共类型定义
  - `VNode` - 虚拟 DOM 节点接口
  - `Component` - 组件接口
  - `ComponentInstance` - 组件实例接口
  - `VNodeType` - 节点类型联合类型
  - `Fragment` - 片段类型符号

### 核心渲染模块
- **h.ts** - 创建 VNode 的工厂函数
- **mount.ts** - 挂载 VNode 到真实 DOM
- **mountComponent.ts** - 组件挂载逻辑
- **patch.ts** - VNode 更新/补丁逻辑
- **patchProp.ts** - 属性更新逻辑
- **render.ts** - 渲染入口函数

### 模板编译器模块
- **interpolate.ts** - 插值处理和表达式求值
  - `interpolate()` - 处理 {{ }} 插值
  - `evaluateExpression()` - 表达式求值
- **buildVNode.ts** - 递归构建 VNode
  - `buildVNode()` - 从 DOM 元素构建 VNode
  - `isSvgChild()` - 判断 SVG 子元素
- **compileComponent.ts** - 组件编译
  - `compileComponent()` - 编译包含 template 的组件
  - `createRuntimeCompiler()` - 创建运行时编译器

### 导出模块
- **renderer.ts** - 统一导出入口（推荐使用）
- **template-compiler.ts** - 向后兼容导出（供旧代码使用）
- **index.ts** - Core 模块统一入口

## 使用方式

### 推荐用法（从 renderer 导入）
```typescript
import { h, compileComponent, VNode } from './core/renderer'
```

### 兼容用法（仍然支持）
```typescript
import { compileComponent } from './core/template-compiler'
```

## 模块依赖关系

```
types.ts (基础类型，无依赖)
    ↓
h.ts (依赖 types)
    ↓
patchProp.ts (无内部依赖)
    ↓
mount.ts (依赖 types, h, patchProp, mountComponent)
mountComponent.ts (依赖 types, reactive, mount, patch)
patch.ts (依赖 types, mount, patchProp)
    ↓
render.ts (依赖 mount, patch)

interpolate.ts (无内部依赖)
    ↓
buildVNode.ts (依赖 types, interpolate)
    ↓
compileComponent.ts (依赖 types, buildVNode)
```

## 优势

1. **职责单一** - 每个文件只负责一个明确的功能
2. **易于测试** - 小模块更容易编写单元测试
3. **便于维护** - 代码定位更精确，修改影响范围清晰
4. **类型安全** - 统一的类型定义，避免重复声明
5. **向后兼容** - 保留旧的导入方式，平滑迁移

## 文件大小对比

### 拆分前
- template-compiler.ts: ~22.9 KB (632 行)
- renderer.ts: ~10.1 KB (338 行)

### 拆分后
- types.ts: ~0.7 KB
- h.ts: ~0.3 KB
- mount.ts: ~2.0 KB
- mountComponent.ts: ~1.5 KB
- patch.ts: ~3.5 KB
- patchProp.ts: ~2.8 KB
- render.ts: ~0.4 KB
- interpolate.ts: ~1.1 KB
- buildVNode.ts: ~11.9 KB
- compileComponent.ts: ~2.1 KB
- renderer.ts: ~0.5 KB (导出)
- template-compiler.ts: ~0.3 KB (导出)
- index.ts: ~0.1 KB

总计：~27.2 KB (略微增加，但可维护性大幅提升)

## 注意事项

1. **循环依赖** - 通过合理的导入顺序和延迟导入避免循环依赖
2. **TypeScript 缓存** - 修改后可能需要重启 TypeScript 服务
3. **导入路径** - 建议始终从 `./core/renderer` 导入，避免直接使用内部模块
