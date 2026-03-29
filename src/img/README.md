# SVG Sprite 图标系统

## 目录结构

```
src/
├── img/
│   ├── icons-sprite.svg    # SVG Sprite 文件（包含所有图标）
│   └── ...                 # 其他图片资源
└── components/
    └── IconComponent.ts    # 图标组件
```

## 使用方式

### 1. HTML 中引入 SVG Sprite

在 `index.html` 的 `<body>` 标签中添加：

```html
<body>
  <!-- SVG Sprite 图标库 - 通过外部文件引入 -->
  <object data="/src/img/icons-sprite.svg" type="image/svg+xml" style="display: none;"></object>
  
  <div id="app"></div>
  <script type="module" src="./src/main.ts"></script>
</body>
```

**说明**：
- 使用 `<object>` 标签加载外部 SVG Sprite 文件
- `style="display: none;"` 隐藏 SVG 元素本身
- 图标会通过 `<use>` 标签引用显示

### 2. 在组件中使用图标

```typescript
import IconComponent from './IconComponent'

const MyComponent = {
  components: { IconComponent },
  template: `
    <div>
      <IconComponent 
        name="search" 
        :width="16" 
        :height="16"
        className="text-gray-400"
      />
    </div>
  `
}
```

### 3. IconComponent 内部实现

```typescript
const IconComponent = {
  props: ['name', 'width', 'height', 'className'],
  template: `
    <svg 
      :width="width" 
      :height="height" 
      :class="className"
      class="inline-block"
    >
      <use :xlink:href="'#icon-' + name"></use>
    </svg>
  `
}
```

## 图标列表

| 名称 | Symbol ID | 用途 |
|------|-----------|------|
| search | icon-search | 搜索图标 |
| arrow-left | icon-arrow-left | 返回箭头 |
| skip-previous | icon-skip-previous | 上一首 |
| play | icon-play | 播放 |
| pause | icon-pause | 暂停 |
| skip-next | icon-skip-next | 下一首 |
| play-small | icon-play-small | 小播放按钮 |
| volume | icon-volume | 音量图标 |
| expand | icon-expand | 展开/更多 |

## 添加新图标的步骤

### 1. 在 icons-sprite.svg 中添加 symbol

打开 `src/img/icons-sprite.svg`，在 `<svg>` 标签内添加新的 `<symbol>`：

```xml
<symbol id="icon-new-icon" viewBox="0 0 24 24">
  <!-- SVG 图形内容 -->
  <path d="..."/>
</symbol>
```

### 2. 在组件中使用

```html
<IconComponent 
  name="new-icon" 
  :width="24" 
  :height="24"
/>
```

## 优势

### vs 内联在 index.html

| 特性 | 内联方式 | 外部文件方式 |
|------|---------|-------------|
| **HTML 简洁性** | ❌ HTML 文件冗长 | ✅ HTML 文件简洁 |
| **可维护性** | ❌ 图标定义分散 | ✅ 集中管理 |
| **可复用性** | ❌ 仅限当前页面 | ✅ 可跨项目复用 |
| **版本控制** | ❌ 与 HTML 耦合 | ✅ 独立文件，便于追踪 |
| **构建优化** | ❌ 难以单独优化 | ✅ 可单独压缩优化 |

### vs 独立 SVG 文件

| 特性 | 独立文件 | SVG Sprite |
|------|---------|-----------|
| **HTTP 请求** | ❌ N 个文件 N 个请求 | ✅ 1 个文件 1 个请求 |
| **缓存效率** | ❌ 单个图标变更需重新加载 | ✅ 整体缓存 |
| **颜色控制** | ❌ 无法通过 CSS 控制 | ✅ 完全可控 |
| **性能** | ❌ 差 | ✅ 优秀 |

## 技术细节

### object 标签的作用

```html
<object data="/src/img/icons-sprite.svg" type="image/svg+xml" style="display: none;"></object>
```

**工作原理**：
1. 浏览器加载外部 SVG 文件
2. 将 SVG 内容注入到 DOM 中
3. 虽然 `<object>` 本身被隐藏，但其定义的 `<symbol>` 仍然可用
4. `<use>` 标签可以通过 `xlink:href` 引用这些 symbol

### 为什么需要 xlink:href

```html
<use :xlink:href="'#icon-' + name"></use>
```

**原因**：
- `xlink:href` 是 SVG 标准的一部分
- 提供更好的浏览器兼容性
- 支持跨文档引用（包括外部文件中的 symbol）

### 命名空间声明

在 `icons-sprite.svg` 文件中需要声明两个命名空间：

```xml
<svg xmlns="http://www.w3.org/2000/svg" 
     xmlns:xlink="http://www.w3.org/1999/xlink">
```

- `xmlns`: SVG 基本命名空间
- `xmlns:xlink`: XLink 命名空间（用于 href 属性）

## CSS 样式控制

### 改变颜色

```css
.text-primary {
  color: #e91e63;
}
```

```html
<IconComponent name="play" className="text-primary" />
```

### 添加悬停效果

```css
.hover\:text-primary:hover {
  color: #c2185b;
}
```

```html
<IconComponent 
  name="search" 
  className="hover:text-primary cursor-pointer"
/>
```

### 添加动画

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
```

```html
<IconComponent name="volume" className="animate-spin" />
```

## Vite 配置注意事项

### 静态资源处理

Vite 会自动处理 `/src/img/` 目录下的静态资源，无需特殊配置。

### 生产环境路径

在生产环境中，确保 SVG Sprite 文件被正确复制到输出目录。

如果需要自定义配置，可以在 `vite.config.ts` 中添加：

```typescript
export default defineConfig({
  build: {
    assetsInclude: ['**/*.svg']
  }
})
```

## 常见问题

### Q: 为什么不直接内联在 index.html？

A: 
1. 保持 HTML 文件简洁
2. 图标定义独立管理，便于维护
3. 可以跨多个 HTML 页面复用
4. 便于版本控制和协作开发

### Q: object 标签会影响性能吗？

A: 
不会。`<object>` 标签只会加载一次 SVG 文件，并且：
- 浏览器会缓存该文件
- 后续页面访问无需重新加载
- 对性能影响极小

### Q: 可以使用 embed 或 iframe 吗？

A: 
不推荐：
- `<embed>`: 已废弃，不推荐使用
- `<iframe>`: 过于重量级，不适合小图标

`<object>` 是最合适的选择。

### Q: 如何调试图标显示问题？

A: 
1. 检查浏览器开发者工具中的 Network 面板，确认 SVG 文件是否加载成功
2. 检查 Console 是否有错误信息
3. 确认 `<use>` 标签的 `xlink:href` 是否正确指向 symbol ID
4. 检查 symbol 的 viewBox 是否正确设置

## 最佳实践

1. **统一命名**：所有 symbol ID 使用 `icon-` 前缀
2. **合理组织**：相关图标放在相邻位置，便于查找
3. **注释清晰**：为每个图标添加注释说明用途
4. **定期清理**：删除未使用的图标定义
5. **文档同步**：更新图标列表时同步更新文档

## 相关文件

- [`src/img/icons-sprite.svg`](src/img/icons-sprite.svg) - SVG Sprite 文件
- [`index.html`](index.html) - HTML 入口文件
- [`src/components/IconComponent.ts`](src/components/IconComponent.ts) - 图标组件
- [`ICONS_GUIDE.md`](ICONS_GUIDE.md) - 详细使用指南
