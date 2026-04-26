# 路由系统架构

## 概述

本目录包含基于 **Vue Router 4** 设计的轻量级路由系统，支持 Hash 和 History 两种模式。

参照 **Vue Router 4 源码**及**霍春阳《Vue.js 设计与实现》**的设计理念，采用模块化架构，按职责拆分为五个核心模块。

## 模块结构

```
router/
├── types.ts          # 类型定义
├── urlParser.ts      # URL 解析工具
├── routeMatcher.ts   # 路由匹配器
├── routerView.ts     # RouterView 渲染器
├── router.ts         # 主路由器入口
├── index.ts          # 统一导出
└── README.md         # 本文档
```

## 模块职责

### 1. types.ts - 类型定义

**职责**：定义路由系统的所有 TypeScript 接口和类型

**核心类型**：
- `AppInstance`: 应用实例接口（包含 config、_container）
- `RouteConfig`: 路由配置接口（path、component、name）
- `RouteLocationNormalizedLoaded`: 路由信息接口（参照 Vue Router 4）
  - `path`: 当前路径
  - `fullPath`: 完整 URL（含 query 和 hash）
  - `params`: 路由参数
  - `query`: 查询参数
  - `hash`: hash 片段
  - `matched`: 匹配的路由配置数组
- `Router`: 路由器实例接口
  - `install()`: 安装到应用
  - `push()`: 导航到新路径
  - `replace()`: 替换当前历史记录
  - `go()`, `back()`, `forward()`: 历史导航
  - `currentRoute`: 当前路由的响应式引用
  - `mode`: 路由模式

**设计原则**：
- 所有类型集中管理，便于维护和复用
- 严格遵循 Vue Router 4 的接口设计

### 2. urlParser.ts - URL 解析工具

**职责**：处理 URL 的解析和标准化

**核心函数**：
- `parseURL(url)`: 解析 URL 字符串
  - 提取 `path`、`query`、`hash`
  - 自动解码 query 参数
  - 处理边界情况（无 query、无 hash）

- `normalizeTo(to)`: 标准化导航目标
  - 支持字符串路径：`'/playlist'`
  - 支持对象格式：`{ path: '/playlist', query: { id: '123' } }`
  - 自动拼接 query 参数

**使用示例**：
```typescript
import { parseURL, normalizeTo } from './router/urlParser'

// 解析 URL
const result = parseURL('/playlist?id=123#section')
// { path: '/playlist', query: { id: '123' }, hash: '#section' }

// 标准化导航
const path = normalizeTo({ path: '/playlist', query: { id: '123' } })
// '/playlist?id=123'
```

### 3. routeMatcher.ts - 路由匹配器

**职责**：根据路径匹配对应的组件

**核心函数**：
- `matchRoute(path, routes)`: 匹配路由
  - 精确匹配：`routes.find(r => r.path === path)`
  - 返回匹配的组件、参数和路由配置
  - 未匹配时返回 `null`

**当前限制**：
- 仅支持精确路径匹配
- TODO: 支持动态路由参数（如 `/user/:id`）

**扩展方向**：
```typescript
// 未来可支持动态路由
const dynamicMatch = path.match(/^\/user\/([^/]+)$/);
if (dynamicMatch) {
  return { 
    component: UserComponent, 
    params: { id: dynamicMatch[1] } 
  };
}
```

### 4. routerView.ts - RouterView 渲染器

**职责**：负责渲染匹配到的组件到 DOM

**核心函数**：
- `renderRouterView(currentPath, routes)`: 渲染 RouterView
  - 调用 [matchRoute](file://d:\Project\01.前端项目\ts-music-player\Frontend\src\core\router\routeMatcher.ts#L13-L25) 获取组件
  - 创建 VNode 并挂载到容器
  - 未匹配时显示 404 提示

- `getRouterViewContainer()`: 获取容器引用
- `setRouterViewContainer(container)`: 设置容器引用

**关键特性**：
- **单例容器**：全局共享一个 RouterView 容器
- **错误处理**：容器为空或组件未找到时给出明确提示
- **VNode 挂载**：集成渲染器的 [mount()](file://d:\Project\01.前端项目\ts-music-player\Frontend\src\core\renderer\mount.ts#L18-L40) 函数

### 5. router.ts - 主路由器入口

**职责**：协调各模块，实现完整的路由功能

**核心函数**：
- `createRouter(routes, mode)`: 创建路由实例
  - 初始化响应式状态（[currentPath](file://d:\Project\01.前端项目\ts-music-player\Frontend\src\core\compiler\router.ts#L96-L96)、[currentRoute](file://d:\Project\01.前端项目\ts-music-player\Frontend\src\core\compiler\router.ts#L97-L103)）
  - 注册 URL 变化监听（`hashchange`、`popstate`）
  - 返回 Router 实例

- `useRouter()`: 组合式 API，获取路由实例
- `useRoute()`: 组合式 API，获取当前路由信息

**Router 实例方法**：
- `install(app)`: 安装到应用
  - 注入全局属性 `$router`、`$route`
  - 创建 RouterView 容器并追加到 app._container
  - 首次渲染 RouterView

- `push(to)`: 导航到新路径
  - Hash 模式：修改 `window.location.hash`
  - History 模式：调用 `history.pushState()`

- `replace(to)`: 替换当前历史记录
- `go(delta)`, `back()`, `forward()`: 历史导航

**响应式更新流程**：
```
URL 变化
  ↓
handleUrlChange() 触发
  ↓
updateCurrentRoute() 更新响应式状态
  ↓
renderRouterView() 重新渲染
  ↓
matchRoute() 匹配新组件
  ↓
mount() 挂载到 DOM
```

## 数据流

```
用户操作（点击链接、浏览器前进/后退）
    ↓
URL 变化（hashchange / popstate）
    ↓
handleUrlChange() [router.ts]
    ├─ parseURL() [urlParser.ts] → 解析新路径
    ├─ matchRoute() [routeMatcher.ts] → 匹配组件
    └─ updateCurrentRoute() → 更新响应式状态
    ↓
renderRouterView() [routerView.ts]
    ├─ getRouterViewContainer() → 获取容器
    ├─ matchRoute() → 再次匹配（确保一致性）
    └─ mount(vnode, container) → 挂载组件
    ↓
DOM 更新完成
```

## 使用示例

### 1. 创建和安装路由

```typescript
import { createRouter } from './core/router'
import HomePage from './pages/HomePage'
import PlaylistPage from './pages/PlaylistPage'

const routes = [
  { path: '/', component: HomePage },
  { path: '/playlist', component: PlaylistPage }
]

const router = createRouter(routes, 'hash')

// 在应用中安装
const app = createApp(App)
router.install(app)
app.mount('#app')
```

### 2. 在组件中使用

```typescript
import { useRouter, useRoute } from './core/router'

const MyComponent = {
  setup() {
    const router = useRouter()
    const route = useRoute()
    
    // 访问当前路由信息
    console.log(route.path)      // '/'
    console.log(route.query)     // { id: '123' }
    
    // 导航
    function goToPlaylist(id: number) {
      router.push({
        path: '/playlist',
        query: { id }
      })
    }
    
    return { goToPlaylist }
  }
}
```

### 3. 编程式导航

```typescript
// 字符串路径
router.push('/playlist')

// 带 query 参数
router.push({ path: '/playlist', query: { id: '123' } })

// 替换当前记录
router.replace('/home')

// 后退
router.back()
```

## 关键设计决策

### 1. 单例模式

**问题**：多个路由实例会导致状态混乱。

**解决方案**：
```typescript
let currentRouterInstance: Router | null = null;

export function createRouter(...) {
  // ...
  currentRouterInstance = router;
  return router;
}

export function useRouter(): Router {
  if (!currentRouterInstance) {
    throw new Error('useRouter() called before router is installed');
  }
  return currentRouterInstance;
}
```

### 2. 响应式路由信息

**问题**：路由变化时，组件需要自动更新。

**解决方案**：
```typescript
const currentRoute = reactive<RouteLocationNormalizedLoaded>({
  path: '/',
  fullPath: '/',
  // ...
});

// 在 updateCurrentRoute 中直接修改属性
currentRoute.path = parsed.path;
currentRoute.query = parsed.query;
// 触发响应式更新
```

### 3. 容器隔离

**问题**：RouterView 需要一个独立的 DOM 容器。

**解决方案**：
```typescript
// 在 install 时创建
const routerViewContainer = document.createElement('div');
routerViewContainer.id = 'router-view';
app._container.appendChild(routerViewContainer);

// 保存全局引用
setRouterViewContainer(routerViewContainer);
```

## 注意事项与约束

1. **初始化顺序**：必须先调用 `createRouter()` 和 `install()` 后才能使用 `useRouter()` 和 `useRoute()`。
2. **功能限制**：当前仅支持精确路径匹配，动态路由参数（如 `/user/:id`）待实现。
3. **模式差异**：
   - Hash 模式：URL 格式为 `#/path?query=value#hash`
   - History 模式：需要服务器配置支持（Vite 开发环境默认支持）
4. **组件配置**：路由配置中的 `component` 字段必须直接指向**编译后的组件对象**。
5. **导航交互**：基于 `popstate` 的路由严禁使用原生锚点 `<a href="#/path">` 跳转，必须通过路由实例 `push()` 方法。

## 参考资源

- [Vue Router 4 源码](https://github.com/vuejs/router)
- 《Vue.js 设计与实现》第 12 章：路由的实现
- 项目记忆规范：[Vue Router 4 风格路由系统 API 规范与使用约束](memory://21001087-d9af-4154-aa10-f71303e77970)
