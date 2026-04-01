# 快速开始 - JavaScript 对象形式 Vue 组件

## 5 分钟上手指南

### 第 1 步：创建组件文件

在 `src/pages/` 目录下创建一个新的 `.ts` 文件：

```typescript
// src/pages/MyComponent.ts
import { ref } from '../core/reactive'
import { compileComponent } from '../core/template-compiler'

const MyComponent = {
  setup() {
    const message = ref('Hello, World!')
    const count = ref(0)
    
    function increment() {
      count.value++
    }
    
    return {
      message,
      count,
      increment
    }
  },
  
  template: `
    <div class="p-4">
      <h1>{{ message }}</h1>
      <p>点击次数：{{ count }}</p>
      <button 
        @click="increment"
        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        点击我
      </button>
    </div>
  `
}

export default compileComponent(MyComponent)
```

### 第 2 步：在路由中使用

编辑 `src/router/index.ts` 或相关页面导入：

```typescript
// src/main.ts 或其他入口文件
import MyComponent from './pages/MyComponent'

// 使用组件
const routes = [
  {
    path: '/my-page',
    component: MyComponent
  }
]
```

### 第 3 步：运行项目

```bash
npm run dev
```

访问 `http://localhost:5173/my-page` 查看你的组件！

## 常用模式速查

### 响应式数据

```typescript
import { ref, reactive } from '../core/reactive'

setup() {
  // 基本类型用 ref
  const count = ref(0)
  const name = ref('张三')
  
  // 对象用 reactive
  const user = reactive({
    name: '李四',
    age: 25,
    address: '北京'
  })
  
  return { count, name, user }
}
```

### 计算属性

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

// 模板中使用
template: `<p>{{ fullName }}</p>`
```

### 条件渲染

```typescript
template: `
  <div>
    <div v-if="loading">加载中...</div>
    <div v-else-if="error">出错了</div>
    <div v-else>内容显示</div>
  </div>
`
```

### 列表循环

```typescript
setup() {
  const items = ref([
    { id: 1, name: '苹果' },
    { id: 2, name: '香蕉' },
    { id: 3, name: '橙子' }
  ])
  
  return { items }
}

template: `
  <ul>
    <li v-for="item in items" :key="item.id">
      {{ item.name }}
    </li>
  </ul>
`
```

### 事件处理

```typescript
setup() {
  const handleClick = (event) => {
    // console.log('点击了', event.target)
  }
  
  const handleSubmit = () => {
    // console.log('表单提交')
  }
  
  return { handleClick, handleSubmit }
}

template: `
  <button @click="handleClick">点击</button>
  <form @submit.prevent="handleSubmit">
    <input type="text" />
    <button type="submit">提交</button>
  </form>
`
```

### 双向绑定

```typescript
setup() {
  const searchText = ref('')
  
  return { searchText }
}

template: `
  <div>
    <input v-model="searchText" placeholder="输入搜索内容..." />
    <p>你输入的是：{{ searchText }}</p>
  </div>
`
```

### 生命周期

```typescript
import { onMounted } from '../core/reactive'

setup() {
  onMounted(() => {
    // console.log('组件已挂载')
    // 调用 API、初始化等
  })
  
  return {}
}
```

## 完整示例：用户列表

```typescript
// src/pages/UserList.ts
import { ref, reactive, onMounted, computed } from '../core/reactive'
import { compileComponent } from '../core/template-compiler'

interface User {
  id: number
  name: string
  email: string
  active: boolean
}

const UserListComponent = {
  setup() {
    // 状态
    const users = ref<User[]>([])
    const loading = ref(true)
    const error = ref<string | null>(null)
    const filterText = ref('')
    
    // 计算属性
    const filteredUsers = computed(() => {
      if (!filterText.value) return users.value
      return users.value.filter(user => 
        user.name.includes(filterText.value)
      )
    })
    
    // 方法
    async function loadUsers() {
      try {
        loading.value = true
        // 模拟 API 调用
        const response = await fetch('/api/users')
        users.value = await response.json()
        error.value = null
      } catch (e) {
        error.value = '加载失败'
      } finally {
        loading.value = false
      }
    }
    
    function toggleActive(user: User) {
      user.active = !user.active
    }
    
    // 生命周期
    onMounted(() => {
      loadUsers()
    })
    
    return {
      users: filteredUsers,
      loading,
      error,
      filterText,
      toggleActive
    }
  },
  
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-4">用户列表</h1>
      
      <!-- 搜索框 -->
      <input
        v-model="filterText"
        placeholder="搜索用户..."
        class="w-full p-2 border rounded mb-4"
      />
      
      <!-- 加载状态 -->
      <div v-if="loading" class="text-center py-8">
        加载中...
      </div>
      
      <!-- 错误提示 -->
      <div v-else-if="error" class="text-red-500 py-8">
        {{ error }}
      </div>
      
      <!-- 用户列表 -->
      <div v-else class="space-y-2">
        <div
          v-for="user in users"
          :key="user.id"
          class="flex items-center justify-between p-3 bg-white rounded shadow"
        >
          <div>
            <h3 class="font-medium">{{ user.name }}</h3>
            <p class="text-sm text-gray-500">{{ user.email }}</p>
          </div>
          <button
            @click="toggleActive(user)"
            :class="user.active ? 'bg-green-500' : 'bg-gray-300'"
            class="px-3 py-1 rounded text-white"
          >
            {{ user.active ? '活跃' : '离线' }}
          </button>
        </div>
      </div>
    </div>
  `
}

export default compileComponent(UserListComponent)
```

## 模板语法速查表

| 功能 | 语法 | 示例 |
|------|------|------|
| 插值 | `{{ }}` | `{{ message }}` |
| 属性绑定 | `:prop` | `:src="url"` |
| 事件绑定 | `@event` | `@click="handler"` |
| 条件渲染 | `v-if` | `<div v-if="show">` |
| 列表循环 | `v-for` | `<li v-for="i in items">` |
| 双向绑定 | `v-model` | `<input v-model="val">` |

## 常见问题

### Q: 为什么必须调用 compileComponent？

A: 因为组件定义了 `template` 字符串，需要通过编译器将其转换为 `render` 函数才能被渲染器识别。

### Q: 可以使用 .vue 文件吗？

A: 可以，项目同时支持两种格式。JavaScript 对象形式更适合学习和理解原理。

### Q: 如何调试？

A: 打开浏览器开发者工具，在控制台查看错误信息。编译器会输出模板解析错误。

### Q: 支持 TypeScript 吗？

A: 完全支持！推荐使用 TypeScript 编写组件以获得更好的类型提示。

## 下一步

- 查看 [`COMPONENT_USAGE.md`](./COMPONENT_USAGE.md) 了解详细 API
- 查看 [`JS_OBJECT_COMPONENT_GUIDE.md`](./JS_OBJECT_COMPONENT_GUIDE.md) 了解技术细节
- 查看 [`src/pages/HomePage.ts`](./src/pages/HomePage.ts) 查看完整示例
- 尝试修改 [`Counter.ts`](./src/pages/Counter.ts) 进行实践

祝你开发愉快！🎉