# 🎵 TypeScript 音乐播放器 - Vue 3 风格架构

> 基于《Vue.js 设计与实现》和 Vue 3 设计思路的自研响应式系统和渲染器

## ✨ 最新特性（v2.0）

### 🚀 Core 模块重构完成

按照 Vue 3 的设计理念，我们完成了核心模块的全面重构：

- ✅ **响应式系统**：完整的 effect 栈、调度器、watch API
- ✅ **渲染器**：基于 key 的 Diff 算法、ShapeFlags 优化
- ✅ **组件系统**：完善的实例管理、生命周期钩子
- ✅ **类型安全**：完整的 TypeScript 类型定义
- ✅ **向后兼容**：100% 兼容现有代码

📚 **详细文档**：
- [重构总结](REFACTORING_SUMMARY.md) - 整体概览
- [技术实现](CORE_REFACTORING_VUE3.md) - 深入细节
- [使用指南](VUE3_STYLE_USAGE.md) - 完整教程
- [API 参考](API_QUICK_REFERENCE.md) - 快速查询
- [变更清单](CHANGELOG.md) - 详细记录

## 🎯 项目简介

这是一个使用 TypeScript 开发的音乐播放器前端项目，采用自研的类 Vue 3 架构：

- 🎨 **组件化开发**：基于 TypeScript + 自研响应式系统
- 🎭 **虚拟 DOM**：自定义渲染器和 Diff 算法
- 🔧 **运行时编译**：使用 DOMParser 进行模板编译
- 🎪 **Tailwind CSS**：原子化 CSS 框架
- ⚡ **Vite**：现代化的构建工具

## 📦 技术栈

### 核心技术
- **TypeScript** - 类型安全的 JavaScript
- **自研响应式系统** - 类 Vue 3 的实现
- **自研渲染器** - 虚拟 DOM + Diff 算法
- **DOMParser** - 运行时模板编译

### UI & 样式
- **Tailwind CSS** - 实用优先的 CSS 框架
- **SVG Icons** - 矢量图标系统

### 构建工具
- **Vite** - 下一代前端构建工具
- **PostCSS** - CSS 处理工具

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3001

### 构建生产版本

```bash
pnpm build
```

## 📁 项目结构

```
Frontend/
├── src/
│   ├── api/                    # API 接口
│   ├── components/             # 组件库
│   ├── core/                   # 核心模块 ⭐
│   │   ├── reactivity/        # 响应式系统
│   │   ├── renderer/          # 渲染器
│   │   └── compiler/          # 编译器
│   ├── pages/                  # 页面组件
│   ├── router/                 # 路由配置
│   ├── styles/                 # 全局样式
│   └── main.ts                 # 应用入口
│
└── docs/                       # 文档
    ├── CORE_REFACTORING_VUE3.md
    ├── VUE3_STYLE_USAGE.md
    ├── REFACTORING_SUMMARY.md
    ├── API_QUICK_REFERENCE.md
    └── CHANGELOG.md
```

## 🎓 核心 API

### 响应式系统

```typescript
import { ref, reactive, computed, effect, watch } from './core'

const count = ref(0)
const state = reactive({ name: '张三' })
const double = computed(() => count.value * 2)

effect(() => {
  console.log('count:', count.value)
})

watch(count, (newVal) => {
  console.log('changed to:', newVal)
})
```

### 组件开发

```typescript
import { h, ref, onMounted } from './core'

const MyComponent = {
  setup(props, { emit }) {
    const count = ref(0)
    onMounted(() => console.log('Mounted!'))
    return { count }
  },
  
  render(props, state) {
    return h('div', {}, [
      h('p', {}, `Count: ${state.count}`),
      h('button', { onClick: () => state.count++ }, '+')
    ])
  }
}
```

## 📖 文档导航

- [API 快速参考](API_QUICK_REFERENCE.md) - 快速上手
- [使用指南](VUE3_STYLE_USAGE.md) - 详细教程
- [技术实现](CORE_REFACTORING_VUE3.md) - 底层原理
- [重构总结](REFACTORING_SUMMARY.md) - 整体架构

## 🔥 核心优势

- 🎯 **精确的依赖追踪**：只更新真正需要的组件
- ⚡ **高效的 Diff 算法**：基于 key 的双向同步
- 🔧 **灵活的调度器**：支持自定义更新策略
- 📦 **零依赖**：无需第三方库
- 🎨 **完全可控**：理解每一行代码

## 🙏 致谢

- **霍春阳** - 《Vue.js 设计与实现》作者
- **Vue Team** - Vue.js 框架的创造者
- **Vite Team** - 提供优秀的构建工具

---

**Made with ❤️ using TypeScript and Vue 3 Architecture**

*最后更新：2026-04-22*
