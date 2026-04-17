# Router 迁移指南

## 概述
项目中有两个 Router 实现：
1. **旧的 Router**：`src/router/index.ts` - 基于 History API 的完整实现
2. **新的 Router**：`src/core/compiler/router.ts` - 基于 mVue.ts 的简化实现

本指南说明如何从旧 Router 迁移到新 Router。

## 主要差异对比

| 特性 | 旧 Router | 新 Router |
|------|-----------|-----------|
| 路由模式 | 仅 History | Hash / History |
| 动态路由 | ✅ 支持 `:id` | ❌ 不支持 |
| 子路由 | ✅ 支持 children | ❌ 不支持 |
| 插件系统 | ❌ 无 | ✅ 支持 install |
| 响应式集成 | ❌ 手动管理 | ✅ 自动响应 |
| 代码复杂度 | ~230 行 | ~80 行 |
| 依赖 | 独立实现 | 依赖 core 模块 |

## 迁移步骤

### 方案 A：完全迁移到新 Router（推荐用于简单场景）

#### 1. 更新 main.ts

**旧代码：**
```typescript
import { createRouter } from './router'
import { h } from './core'

const routes = [
  {
    path: '/',
    component: () => h(HomePage, {})
  },
  // ...
]

const router = createRouter(routes, app)
```

**新代码：**
```typescript
import { createRouter, h } from './core'
import HomePage from './pages/HomePage'
// ... 其他页面导入

const routes = [
  {
    path: '/',
    component: HomePage  // 直接引用组件，不需要包装函数
  },
  {
    path: '/player',
    component: PlayerPage
  },
  {
    path: '/playlist',
    component: PlaylistPage
  }
]

const router = createRouter(routes, 'hash')  // 使用 Hash 模式
```

#### 2. 处理动态路由

**旧代码（支持 `/playlist/:id`）：**
```typescript
{
  path: '/playlist/:id',
  component: () => h(PlaylistDetailPage, {})
}
```

**新代码（需要手动解析参数）：**
```typescript
// 在 PlaylistDetailPage 组件中
setup() {
  const routeId = computed(() => {
    const hash = window.location.hash
    const match = hash.match(/\/playlist\/(\d+)/)
    return match ? match[1] : null
  })
  
  return { routeId }
}
```

或者扩展 Router 支持动态路由（见下方"增强方案"）。

#### 3. 删除旧 Router 文件

```bash
# 备份旧文件
mv src/router/index.ts src/router/index.ts.bak

# 或者完全删除
rm src/router/index.ts
```

### 方案 B：保留旧 Router（推荐用于复杂场景）

如果项目需要动态路由、子路由等高级功能，建议保留旧 Router。

#### 1. 保持现有 main.ts 不变

```typescript
import { createRouter } from './router'  // 继续使用旧 Router
// ... 其余代码不变
```

#### 2. 新 Router 作为备选方案

可以在其他小型项目或简单页面中使用新 Router：

```typescript
import { createRouter } from './core'

// 用于简单的弹窗、侧边栏等
const modalRouter = createRouter([
  { path: '/modal1', component: ModalComponent1 },
  { path: '/modal2', component: ModalComponent2 }
], 'hash')
```

## 增强新 Router（可选）

如果需要动态路由支持，可以扩展新 Router：

```typescript
// src/core/compiler/router.ts

function createRouter(routes: RouteConfig[], mode: 'hash' | 'history' = 'hash') {
  // ... 现有代码
  
  // 添加动态路由匹配
  const getMatchedComponent = (path: string) => {
    // 精确匹配
    let route = routes.find(r => r.path === path)
    if (route) return { component: route.component, params: {} }
    
    // 动态路由匹配
    for (const r of routes) {
      const pattern = r.path
      const regex = new RegExp('^' + pattern.replace(/:\w+/g, '(\\w+)') + '$')
      const match = path.match(regex)
      if (match) {
        const paramNames = pattern.match(/:(\w+)/g)?.map(p => p.slice(1)) || []
        const params = paramNames.reduce((acc, name, i) => {
          acc[name] = match[i + 1]
          return acc
        }, {} as Record<string, string>)
        return { component: r.component, params }
      }
    }
    
    return null
  }
  
  // ... 其余代码
}
```

## 测试清单

迁移后需要测试：

- [ ] 首页正常加载
- [ ] 路由跳转正常工作
- [ ] 浏览器前进/后退按钮正常
- [ ] 刷新页面后路由状态保持
- [ ] 动态路由参数正确获取（如果使用）
- [ ] 404 页面正常显示

## 常见问题

### Q1: 为什么要迁移到新 Router？

**A:** 
- 更少的代码（~80 行 vs ~230 行）
- 与响应式系统集成更好
- 支持插件系统
- 更容易理解和维护

### Q2: 新 Router 性能更好吗？

**A:** 
是的，因为：
- 使用响应式系统自动更新视图
- 减少了手动 DOM 操作
- 更简洁的 diff 算法

### Q3: 我可以混合使用两个 Router 吗？

**A:** 
不建议。应该选择一个作为主路由系统，避免冲突。

### Q4: 如果迁移后出现问题怎么办？

**A:** 
1. 检查控制台错误信息
2. 确认路由配置格式正确
3. 回滚到旧 Router（如果保留了备份）
4. 参考 `CORE_REFACTORING_TEST.md` 进行调试

## 最佳实践

1. **简单项目**：使用新 Router（Hash 模式）
2. **复杂项目**：保留旧 Router 或扩展新 Router
3. **SEO 要求高**：使用 History 模式 + 服务端配置
4. **快速原型**：使用新 Router + Hash 模式

## 总结

- ✅ 如果只是简单的页面切换，迁移到新 Router
- ⚠️ 如果需要动态路由、子路由等高级功能，保留旧 Router
- 💡 可以根据实际需求扩展新 Router 的功能
