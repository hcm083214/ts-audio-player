# JavaScript 对象形式定义 Vue 组件指南

本项目支持使用 JavaScript 对象的方式定义 Vue 风格的组件，类似于 Vue 3 的 Options API 语法。

## 基本语法

```typescript
import { ref, computed, onMounted } from '../core/reactive'
import { compileComponent } from '../core/template-compiler'

const MyComponent = {
  // setup 函数定义组件逻辑
  setup() {
    const count = ref(0)
    
    function increment() {
      count.value++
    }
    
    return { count, increment }
  },

  // template 字符串定义模板
  template: `
    <div>
      <button @click="increment">
        点击次数：{{ count }}
      </button>
    </div>
  `
}

// 编译组件（将 template 编译为 render 函数）
export default compileComponent(MyComponent)
```

## 工作原理

### 1. 组件定义流程

```
JavaScript 对象组件
    ↓
setup() 返回状态和方法
    ↓
template 字符串定义 UI
    ↓
compileComponent() 编译
    ↓
带有 render 函数的组件
    ↓
renderer.ts 渲染到 DOM
```

### 2. 模板编译过程

`compileComponent` 函数内部执行以下步骤：

1. **解析模板**：使用运行时编译器解析 template 字符串
2. **构建 VNode**：将 HTML 模板转换为虚拟 DOM 节点树
3. **处理指令**：解析 `v-if`、`v-for`、`@click`、`:binding` 等 Vue 指令
4. **插值处理**：处理 `{{ expression }}` 语法
5. **返回组件**：将编译后的 render 函数附加到组件对象

### 3. 运行时编译器特性

本项目的运行时编译器支持：

- ✅ **插值表达式**：`{{ message }}`、`{{ count + 1 }}`
- ✅ **属性绑定**：`:src="imageUrl"`、`:id="itemId"`
- ✅ **事件绑定**：`@click="handleClick"`、`@input="handleInput"`
- ✅ **条件渲染**：`v-if`、`v-else-if`、`v-else`
- ✅ **列表渲染**：`v-for="item in items"`
- ✅ **双向绑定**：`v-model="value"`
- ✅ **Fragment**：支持多根节点
- ✅ **内联样式和类名**：完整的 CSS 支持

## 核心特性

### 1. 响应式状态

使用 `ref` 和 `reactive` 创建响应式数据：

```typescript
import { ref, reactive } from '../core/reactive'

setup() {
  const count = ref(0)
  const user = reactive({
    name: '张三',
    age: 25
  })
  
  return { count, user }
}
```

当 `count.value` 或 `user.name` 改变时，视图会自动更新。

### 2. 计算属性

使用 `computed` 创建计算属性：

```typescript
import { ref, computed } from '../core/reactive'

setup() {
  const firstName = ref('张')
  const lastName = ref('三')
  
  const fullName = computed(() => {
    return `${firstName.value}${lastName.value}`
  })
  
  return { firstName, lastName, fullName }
}
```

### 3. 生命周期钩子

使用 `onMounted` 等生命周期钩子：

```typescript
import { onMounted } from '../core/reactive'

setup() {
  onMounted(() => {
    console.log('组件已挂载')
    // 可以在这里调用 API、初始化 DOM 等
  })
  
  return {}
}
```

### 4. 事件处理

在模板中使用 `@click`、`@input` 等事件绑定：

```typescript
setup() {
  const handleClick = (event) => {
    console.log('按钮被点击了', event)
  }
  
  const handleSubmit = () => {
    console.log('表单提交')
  }
  
  return { handleClick, handleSubmit }
}
```

模板：
```html
<button @click="handleClick">点击我</button>
<form @submit.prevent="handleSubmit">
  <input type="text" />
  <button type="submit">提交</button>
</form>
```

### 5. 条件渲染

使用 `v-if`、`v-else-if`、`v-else`：

```html
<div v-if="loading">加载中...</div>
<div v-else-if="error">出错了</div>
<div v-else>内容显示</div>
```

### 6. 列表渲染

使用 `v-for` 渲染列表：

```html
<ul>
  <li v-for="item in items" :key="item.id">
    {{ item.name }}
  </li>
</ul>
```

或者带索引：
```html
<div v-for="(song, index) in topSongs" :key="song.id">
  <span>{{ index + 1 }}</span>
  <h3>{{ song.name }}</h3>
</div>
```

### 7. 双向绑定

使用 `v-model` 实现表单输入的双向绑定：

```typescript
setup() {
  const searchText = ref('')
  
  return { searchText }
}
```

模板：
```html
<input v-model="searchText" placeholder="请输入搜索内容..." />
<p>你输入的内容是：{{ searchText }}</p>
```

### 8. 组件引用

可以导入并使用其他组件：

```typescript
import Counter from './Counter'

const App = {
  setup() {
    return {}
  },
  
  template: `
    <div>
      <h1>我的应用</h1>
      <Counter />
    </div>
  `
}

export default compileComponent(App)
```

## 完整示例：音乐播放器首页

```typescript
import { ref, onMounted } from '../core/reactive'
import { compileComponent } from '../core/template-compiler'
import * as api from '../api'

const HomePageComponent = {
  setup() {
    const playlists = ref([])
    const topSongs = ref([])
    const loading = ref(true)

    async function loadData() {
      try {
        const [playlistsRes, songsRes] = await Promise.all([
          api.getPersonalized(12),
          api.getTopSong()
        ])
        playlists.value = playlistsRes.result
        topSongs.value = songsRes.data
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      loadData()
    })

    return {
      playlists,
      topSongs,
      loading
    }
  },

  template: `
    <Fragment>
      <header class="bg-white shadow-sm">
        <h1>网易云音乐</h1>
      </header>
      
      <main>
        <div v-if="loading">加载中...</div>
        
        <template v-else>
          <section>
            <h2>推荐歌单</h2>
            <div v-for="playlist in playlists" :key="playlist.id">
              <img :src="playlist.coverImgUrl" :alt="playlist.name" />
              <h3>{{ playlist.name }}</h3>
            </div>
          </section>
          
          <section>
            <h2>热门歌曲</h2>
            <div v-for="song in topSongs" :key="song.id">
              <h3>{{ song.name }}</h3>
              <p>{{ song.artists.map(a => a.name).join('/') }}</p>
            </div>
          </section>
        </template>
      </main>
    </Fragment>
  `
}

export default compileComponent(HomePageComponent)
```

## 模板语法参考

### 支持的指令

| 指令 | 说明 | 示例 |
|------|------|------|
| `{{ }}` | 文本插值 | `{{ message }}` |
| `:prop` | 属性绑定 | `:src="imageUrl"` |
| `@event` | 事件绑定 | `@click="handler"` |
| `v-if` | 条件渲染 | `<div v-if="show">` |
| `v-else` | 否则 | `<div v-else>` |
| `v-else-if` | 否则如果 | `<div v-else-if="condition">` |
| `v-for` | 列表循环 | `<li v-for="item in items">` |
| `v-model` | 双向绑定 | `<input v-model="value">` |

### 事件修饰符

支持常见的事件修饰符：

- `.prevent` - 阻止默认行为
- `.stop` - 阻止事件冒泡

```html
<form @submit.prevent="handleSubmit">
  <button @click.stop="handleClick">提交</button>
</form>
```

## 与 Vue 3 的区别

| 特性 | 本项目 | Vue 3 |
|------|--------|-------|
| 编译时机 | 运行时编译 | 构建时编译 |
| 性能 | 较慢（运行时解析） | 较快（预编译） |
| 包大小 | 较小（无编译代码） | 较大（包含编译代码） |
| 灵活性 | 高（动态模板） | 中（需要重新编译） |
| IDE 支持 | 一般 | 优秀 |

## 注意事项

### 1. 必须调用 compileComponent

定义了 template 的组件必须通过 `compileComponent()` 编译才能正常渲染：

```typescript
// ❌ 错误：直接导出未编译的组件
export default MyComponent

// ✅ 正确：编译后导出
export default compileComponent(MyComponent)
```

### 2. Fragment 使用

使用 `<Fragment>` 作为多根节点的包装：

```html
<Fragment>
  <header>头部</header>
  <main>内容</main>
  <footer>底部</footer>
</Fragment>
```

### 3. 类型安全

推荐使用 TypeScript 编写组件以获得更好的类型提示：

```typescript
interface Playlist {
  id: number
  name: string
  coverImgUrl: string
}

setup() {
  const playlists = ref<Playlist[]>([])
  return { playlists }
}
```

### 4. 性能考虑

由于使用运行时编译，建议在可能的情况下缓存编译结果：

```typescript
// 组件只编译一次
const compiledComponent = compileComponent(MyComponent)
export default compiledComponent
```

## 调试技巧

### 1. 查看编译错误

如果模板有语法错误，编译器会在控制台输出：

```typescript
// 浏览器控制台会显示错误信息
console.error('Template parse errors:', errors)
```

### 2. 检查渲染结果

可以在浏览器开发者工具中查看生成的 DOM 结构，确认是否正确渲染。

### 3. 响应式调试

在 setup 函数中添加日志：

```typescript
setup() {
  const count = ref(0)
  
  watch(count, (newVal, oldVal) => {
    console.log(`Count changed from ${oldVal} to ${newVal}`)
  })
  
  return { count }
}
```

## 项目文件结构

```
Frontend/
├── src/
│   ├── core/
│   │   ├── reactive.ts          # 响应式系统
│   │   ├── renderer.ts          # 渲染器
│   │   └── template-compiler.ts # 模板编译器
│   ├── pages/
│   │   ├── HomePage.ts          # 首页组件（JS 对象形式）
│   │   ├── PlayerPage.ts        # 播放页组件
│   │   └── Counter.ts           # 简单示例组件
│   └── main.ts                  # 应用入口
└── COMPONENT_USAGE.md           # 本文档
```

## 迁移指南

### 从 .vue 文件迁移

如果你正在使用 .vue 文件，可以参考以下步骤迁移到 JavaScript 对象形式：

1. **复制 script 内容**：将 `<script setup>` 中的代码移到 `setup()` 函数
2. **复制 template 内容**：将 `<template>` 中的内容复制到 `template` 字符串
3. **移除 style**：将 `<style>` 改为 Tailwind CSS 类名或外部 CSS
4. **添加编译**：使用 `compileComponent()` 包装组件对象
5. **更新导入**：确保导入所有需要的依赖

### 示例迁移

原始 .vue 文件：
```vue
<template>
  <div>
    <button @click="count++">{{ count }}</button>
  </div>
</template>

<script setup>
import { ref } from '../core/reactive'
const count = ref(0)
</script>

<style scoped>
button { color: blue; }
</style>
```

迁移后：
```typescript
import { ref } from '../core/reactive'
import { compileComponent } from '../core/template-compiler'

const MyComponent = {
  setup() {
    const count = ref(0)
    return { count }
  },
  
  template: `
    <div>
      <button @click="count++" class="text-blue-500">
        {{ count }}
      </button>
    </div>
  `
}

export default compileComponent(MyComponent)
```

## 更多资源

- [`Counter.ts`](./src/pages/Counter.ts) - 简单计数器示例
- [`HomePage.ts`](./src/pages/HomePage.ts) - 完整应用示例
- [`reactive.ts`](./src/core/reactive.ts) - 响应式系统源码
- [`renderer.ts`](./src/core/renderer.ts) - 渲染器源码
- [`template-compiler.ts`](./src/core/template-compiler.ts) - 模板编译器源码