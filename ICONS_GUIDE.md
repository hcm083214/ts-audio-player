# SVG Sprite 图标组件使用指南

## 概述
本项目已采用 **SVG Sprite** 方式统一管理所有图标。通过 `<symbol>` 定义图标，使用 `<use>` 标签引用，实现了图标的集中管理和高效复用。

## 技术实现

### SVG Sprite 文件
所有图标定义在 `index.html` 中的 `<svg>` 标签内（或独立的 `icons.svg` 文件），每个图标使用 `<symbol>` 元素定义：

```xml
<svg style="display: none;">
  <symbol id="icon-search" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </symbol>
  
  <symbol id="icon-play" viewBox="0 0 24 24">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </symbol>
  
  <!-- 更多图标... -->
</svg>
```

### IconComponent 组件
组件内部使用 `<use>` 标签引用对应的图标：

```html
<svg 
  :width="width" 
  :height="height" 
  :class="className"
  class="inline-block"
>
  <use :xlink:href="'#icon-' + name"></use>
</svg>
```

## 使用方法

### 基本用法
```html
<IconComponent 
  name="search" 
  :width="16" 
  :height="16"
/>
```

### 添加样式类
```html
<IconComponent 
  name="play" 
  :width="40" 
  :height="40"
  className="cursor-pointer hover:text-primary"
/>
```

### 条件渲染
```html
<IconComponent 
  v-if="isPlaying"
  name="pause" 
  :width="40" 
  :height="40"
  className="text-primary"
/>
<IconComponent 
  v-else
  name="play" 
  :width="40" 
  :height="40"
  className="text-primary"
/>
```

## Props 说明

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `name` | String | - | 图标名称（对应 symbol 的 id，去掉 `icon-` 前缀） |
| `width` | Number | 24 | 图标宽度 |
| `height` | Number | 24 | 图标高度 |
| `className` | String | - | CSS 类名，用于添加自定义样式 |

## 图标列表

### 导航图标
| 名称 | Symbol ID | 用途 |
|------|-----------|------|
| `search` | icon-search | 搜索图标 |
| `arrow-left` | icon-arrow-left | 返回箭头 |

### 播放控制图标
| 名称 | Symbol ID | 用途 |
|------|-----------|------|
| `skip-previous` | icon-skip-previous | 上一首 |
| `play` | icon-play | 播放（大） |
| `pause` | icon-pause | 暂停 |
| `skip-next` | icon-skip-next | 下一首 |
| `play-small` | icon-play-small | 播放（小） |

### 功能图标
| 名称 | Symbol ID | 用途 |
|------|-----------|------|
| `volume` | icon-volume | 音量图标 |
| `expand` | icon-expand | 展开/更多 |

## 已更新的组件

以下组件已全部改用 IconComponent：

1. ✅ **HeaderComponent** - 搜索图标
2. ✅ **PlayerHeaderComponent** - 返回箭头
3. ✅ **PlayerControlsComponent** - 播放控制按钮
4. ✅ **VolumeControlComponent** - 音量图标
5. ✅ **PlayerBarComponent** - 播放控制、展开图标
6. ✅ **SongListComponent** - 播放按钮

## 添加新图标的步骤

### 1. 在 index.html 中添加 symbol
打开 `index.html`，在 `<svg>` 标签内添加新的 `<symbol>`：

```xml
<symbol id="icon-your-icon-name" viewBox="0 0 24 24">
  <!-- SVG 图形内容 -->
  <path d="..."/>
  <!-- 或其他图形元素 -->
</symbol>
```

### 2. 在组件中使用
```html
<IconComponent 
  name="your-icon-name" 
  :width="24" 
  :height="24"
  className="your-custom-class"
/>
```

### 3. 导入 IconComponent
```typescript
import IconComponent from './IconComponent'

const YourComponent = {
  components: { IconComponent },
  // ...
}
```

## 优势

### 1. 性能优化
- **减少 HTTP 请求**：所有图标在一个文件中，只需一次加载
- **浏览器缓存**：SVG Sprite 可被浏览器缓存，后续页面无需重新加载
- **体积小**：多个图标共享公共部分，减小总体积

### 2. 易于维护
- **集中管理**：所有图标定义在一处，方便查找和修改
- **即时生效**：修改一个图标，所有使用该图标的地方都会更新
- **版本控制**：便于追踪图标的变更历史

### 3. 灵活性强
- **CSS 控制颜色**：使用 `currentColor` 可通过 CSS 的 `color` 属性控制图标颜色
- **任意尺寸**：通过 `width` 和 `height` props 可设置任意大小
- **支持动画**：可对 SVG 应用 CSS 动画和过渡效果

### 4. 兼容性好
- **现代浏览器**：支持所有现代浏览器
- **无障碍支持**：可通过添加 `aria` 属性提高可访问性

## 示例代码

### 完整组件示例
```typescript
import { compileComponent } from '../core/template-compiler'
import IconComponent from './IconComponent'

const ExampleComponent = {
  components: { IconComponent },
  template: `
    <div class="flex items-center space-x-4">
      <!-- 搜索图标 -->
      <IconComponent 
        name="search" 
        :width="20" 
        :height="20"
        className="text-gray-500 hover:text-primary"
      />
      
      <!-- 播放图标 -->
      <IconComponent 
        name="play" 
        :width="40" 
        :height="40"
        className="text-primary cursor-pointer"
      />
      
      <!-- 返回箭头 -->
      <IconComponent 
        name="arrow-left" 
        :width="24" 
        :height="24"
      />
    </div>
  `
}

export default compileComponent(ExampleComponent)
```

### 在循环中使用
```html
<div v-for="song in songs" :key="song.id">
  <IconComponent 
    name="play" 
    :width="20" 
    :height="20"
    className="cursor-pointer hover:text-primary"
  />
</div>
```

## CSS 样式控制

### 改变颜色
```css
.text-primary {
  color: #e91e63; /* 通过 color 属性控制 SVG fill/stroke */
}

.hover\:text-primary:hover {
  color: #c2185b;
}
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
<IconComponent 
  name="volume" 
  :width="24" 
  :height="24"
  className="animate-spin"
/>
```

## 注意事项

### 1. xlink:href 的使用
- 使用 `:xlink:href` 而不是 `href` 以确保在所有浏览器中正常工作
- Vue 中需要动态绑定：`:xlink:href="'#icon-' + name"`

### 2. viewBox 的重要性
- 每个 `<symbol>` 必须定义 `viewBox` 属性
- `viewBox` 确保图标可以正确缩放

### 3. 颜色控制
- SVG 图形应使用 `fill="currentColor"` 或 `stroke="currentColor"`
- 这样才能通过 CSS 的 `color` 属性控制颜色

### 4. 命名规范
- Symbol ID 统一使用 `icon-` 前缀
- 图标名称使用中划线分隔（kebab-case）
- 例如：`icon-arrow-left`, `icon-skip-previous`

## 与之前方案的对比

### 方案 1：内联 SVG（已废弃）
```html
<svg xmlns="..." width="24" height="24" ...>
  <polygon points="..."></polygon>
</svg>
```
**缺点**：代码冗长、难以维护、无法复用

### 方案 2：图片标签（已废弃）
```html
<img src="/src/img/search.svg" width="16" height="16" />
```
**缺点**：
- 每个图标一个 HTTP 请求
- 无法通过 CSS 控制颜色
- 性能差

### 方案 3：SVG Sprite（当前方案）✅
```html
<svg width="24" height="24">
  <use xlink:href="#icon-search"></use>
</svg>
```
**优点**：
- 集中管理，减少请求
- CSS 可控颜色和样式
- 性能好，易于维护

## 图标资源

可以从以下网站获取 SVG 图标并转换为 symbol 格式：

- [Heroicons](https://heroicons.com/) - Tailwind CSS 官方图标库
- [Feather Icons](https://feathericons.com/) - 简洁的开源图标集
- [Lucide Icons](https://lucide.dev/) - Feather 的继任者
- [Material Design Icons](https://materialdesignicons.com/) - Material 风格

## 转换工具

可以使用在线工具将普通 SVG 转换为 SVG Sprite：
- [SVGOMG](https://jakearchibald.github.io/svgomg/) - SVG 优化工具
- [IcoMoon App](https://icomoon.io/app/) - SVG Sprite 生成工具

## 后续优化建议

1. **自动化构建**：使用 Vite 插件自动扫描并生成 SVG Sprite
2. **TypeScript 类型**：为图标名称创建严格的类型定义
3. **按需加载**：对于大量图标，可以实现按需加载机制
4. **图标常量**：创建图标名称的常量对象，避免拼写错误

```typescript
// utils/icons.ts
export const ICONS = {
  SEARCH: 'search',
  PLAY: 'play',
  PAUSE: 'pause',
  // ...
} as const

export type IconName = typeof ICONS[keyof typeof ICONS]
```

## 相关文件

- `src/components/IconComponent.ts` - 图标组件实现
- `index.html` - SVG Sprite 定义位置
- `src/img/icons.svg` - 独立的 SVG Sprite 文件（可选）
