# Core 模块重构总结

## 概述
按照 `mVue.ts` 的实现重构了 `core` 文件夹下的 Vue 实现，简化了架构并增强了功能。

## 主要改进

### 1. 响应式系统 (reactivity/reactive.ts)
**改进点：**
- ✅ 采用 `ReactiveEffect` 类替代原有的简单 effect 函数
- ✅ 使用 `shouldTrack` 标志精确控制依赖追踪
- ✅ 简化 `track` 和 `trigger` 逻辑
- ✅ 添加 `watchEffect` API
- ✅ 保持向后兼容的 `onMounted`/`onUnmounted` 生命周期钩子

**关键变化：**
```typescript
// 旧实现：简单的 effect 函数
function effect(fn: Effect) { ... }

// 新实现：ReactiveEffect 类
class ReactiveEffect {
  fn: () => void;
  deps: Set<Function>[] = [];
  run() { ... }
  effect() { this.run(); }
}
```

### 2. 虚拟 DOM (renderer/h.ts, types.ts)
**改进点：**
- ✅ 简化 `h` 函数，支持 children 扁平化
- ✅ 添加 `tag` 字段用于 SVG 判断
- ✅ VNode 类型支持 `string | Function`（组件）
- ✅ 支持 `HTMLElement | SVGElement`

**关键变化：**
```typescript
interface VNode {
  type: string | Function;  // 支持组件
  props?: any;
  children?: VNode[] | string;
  el?: HTMLElement | SVGElement;  // 支持 SVG
  tag?: string;  // 用于 SVG 判断
}
```

### 3. 渲染器 (renderer/mount.ts, patch.ts, render.ts)
**改进点：**
- ✅ 统一 SVG 和 HTML 元素处理逻辑
- ✅ 简化 `mount` 函数，移除复杂的 Fragment 处理
- ✅ 极简 `patch` 实现，专注于核心 diff 逻辑
- ✅ `render` 统一使用 `patch` 处理首次挂载和更新

**SVG 支持：**
```typescript
const isSvg = vnode.tag === 'svg' || container.tagName.toLowerCase() === 'svg';
const el = isSvg 
  ? document.createElementNS('http://www.w3.org/2000/svg', vnode.type)
  : document.createElement(vnode.type);
```

### 4. 编译器 (compiler/compileComponent.ts)
**重大增强：**
- ✅ **支持 v-if / v-else 指令**（AST 预处理）
- ✅ **支持 v-model 双向绑定**
- ✅ 完整的模板编译流程：tokenize → parse → generate
- ✅ AST 级别的 v-else 挂载逻辑

**v-if/v-else 实现：**
```typescript
// 在生成代码前，将 v-else 节点挂载到 v-if 节点上
if (child.directives && child.directives.else) {
  children[prevIndex].elseNode = child;
  child._toRemove = true;
}

// 生成三元表达式
code = `${node.directives.if} ? ${ifCode} : ${elseCode}`;
```

### 5. 路由系统 (compiler/router.ts)
**新增功能：**
- ✅ 基于 mVue.ts 的 Mini-Router 实现
- ✅ 支持 Hash 和 History 两种模式
- ✅ 插件系统集成（`install` 方法）
- ✅ 动态组件渲染（RouterView）

**使用示例：**
```typescript
const router = createRouter([
  { path: '/', component: HomePage },
  { path: '/player', component: PlayerPage }
], 'hash');
```

### 6. 统一导出 (core/index.ts)
**新增导出：**
- `watchEffect` - 响应式副作用
- `ReactiveEffect` - 响应式效果类
- `createRouter` - 路由创建函数
- `compile` - 模板编译函数

## 兼容性

### 保持向后兼容
- ✅ 所有原有 API 仍然可用
- ✅ `createRuntimeCompiler` 和 `compileComponent` 保持接口不变
- ✅ `interpolate` 和 `evaluateExpression` 保留供向后兼容

### 可能需要调整的地方
- ⚠️ 旧的 `router/index.ts` 可能需要迁移到新的 router 实现
- ⚠️ 使用了复杂 Fragment 逻辑的代码可能需要简化

## 性能优化

1. **更高效的依赖追踪**：使用 `Set` 去重，避免重复执行
2. **简化的 patch 算法**：减少不必要的判断和遍历
3. **统一的 SVG 处理**：避免重复的类型检查

## 测试建议

1. 测试响应式系统的各种场景（ref、computed、watchEffect）
2. 测试 SVG 图标的正确渲染
3. 测试 v-if/v-else 的条件渲染
4. 测试路由切换和动态组件加载
5. 测试现有页面组件的正常运行

## 下一步

1. 考虑将旧的 `router/index.ts` 迁移到新的 router 实现
2. 清理不再使用的文件（如 `buildVNode.ts`、`mountComponent.ts` 等）
3. 添加单元测试覆盖核心功能
4. 性能基准测试对比新旧实现
