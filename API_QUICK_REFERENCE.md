# Core API 快速参考

## 响应式系统

### ref
```typescript
import { ref } from './core'

const count = ref(0)
count.value++ // 修改值
```

### reactive
```typescript
import { reactive } from './core'

const state = reactive({ name: '张三', age: 25 })
state.age = 26 // 触发更新
```

### computed
```typescript
import { ref, computed } from './core'

const count = ref(0)
const double = computed(() => count.value * 2)
console.log(double.value) // 自动计算
```

### effect
```typescript
import { ref, effect } from './core'

const count = ref(0)
effect(() => {
  console.log(count.value) // 依赖变化时自动执行
})
```

### watch
```typescript
import { ref, watch } from './core'

const count = ref(0)
watch(count, (newVal, oldVal) => {
  console.log(`${oldVal} -> ${newVal}`)
}, { immediate: true })
```

### 工具函数
```typescript
import { isRef, unref, isReactive } from './core'

isRef(ref(0))      // true
unref(ref(42))     // 42
isReactive({})     // false
isReactive(reactive({})) // true
```

## 渲染器

### h 函数
```typescript
import { h } from './core'

// 元素
h('div', { className: 'box' }, [
  h('h1', {}, 'Title'),
  h('p', {}, 'Content')
])

// 文本
h('span', {}, 'Hello')

// 组件
h(MyComponent, { prop: 'value' })
```

### 组件定义
```typescript
import { h, ref, onMounted } from './core'

const MyComponent = {
  props: ['title'],
  emits: ['click'],
  
  setup(props, { emit }) {
    const count = ref(0)
    
    onMounted(() => {
      console.log('Mounted!')
    })
    
    return { count }
  },
  
  render(props, state) {
    return h('div', {}, [
      h('h2', {}, props.title),
      h('p', {}, `Count: ${state.count}`)
    ])
  }
}
```

### 生命周期
```typescript
import { onMounted, onUnmounted } from './core'

setup() {
  onMounted(() => {
    console.log('组件已挂载')
  })
  
  onUnmounted(() => {
    console.log('组件已卸载')
  })
}
```

### 事件处理
```typescript
// 子组件
setup(props, { emit }) {
  const handleClick = () => {
    emit('click', 'data')
  }
  return { handleClick }
}

render(props, state) {
  return h('button', { onClick: state.handleClick }, 'Click')
}

// 父组件
h(MyComponent, {
  onClick: (data) => console.log(data)
})
```

## ShapeFlags

```typescript
import { ShapeFlags } from './core'

// 判断 vnode 类型
if (vnode.shapeFlag & ShapeFlags.ELEMENT) {
  // 是元素节点
}

if (vnode.shapeFlag & ShapeFlags.COMPONENT) {
  // 是组件
}

if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
  // 有数组子节点
}

if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
  // 有文本子节点
}
```

## 完整示例

```typescript
import { h, ref, computed, reactive, watch, onMounted } from './core'

const TodoApp = {
  setup() {
    const todos = ref([])
    const newTodo = ref('')
    
    const completedCount = computed(() => 
      todos.value.filter(t => t.completed).length
    )
    
    const addTodo = () => {
      if (newTodo.value.trim()) {
        todos.value.push({
          id: Date.now(),
          text: newTodo.value,
          completed: false
        })
        newTodo.value = ''
      }
    }
    
    watch(completedCount, (count) => {
      console.log(`已完成: ${count}`)
    })
    
    onMounted(() => {
      console.log('Todo App 已启动')
    })
    
    return {
      todos,
      newTodo,
      completedCount,
      addTodo
    }
  },
  
  render(props, state) {
    return h('div', { className: 'todo-app' }, [
      h('h1', {}, 'Todo List'),
      
      h('div', { className: 'input-group' }, [
        h('input', {
          type: 'text',
          value: state.newTodo,
          onInput: (e) => state.newTodo = e.target.value,
          placeholder: '添加新任务...'
        }),
        h('button', { onClick: state.addTodo }, '添加')
      ]),
      
      h('p', {}, `已完成: ${state.completedCount}/${state.todos.length}`),
      
      h('ul', {}, 
        state.todos.map(todo => 
          h('li', { key: todo.id }, [
            h('input', {
              type: 'checkbox',
              checked: todo.completed,
              onChange: () => todo.completed = !todo.completed
            }),
            h('span', { 
              className: todo.completed ? 'completed' : '' 
            }, todo.text)
          ])
        )
      )
    ])
  }
}

export default TodoApp
```

## 常用模式

### 条件渲染
```typescript
render(props, state) {
  return h('div', {}, [
    state.isLoading 
      ? h('p', {}, '加载中...')
      : h('p', {}, '加载完成')
  ])
}
```

### 列表渲染
```typescript
render(props, state) {
  return h('ul', {}, 
    state.items.map(item => 
      h('li', { key: item.id }, item.name)
    )
  )
}
```

### 表单绑定
```typescript
setup() {
  const form = reactive({
    username: '',
    password: ''
  })
  
  const handleSubmit = () => {
    console.log(form.username, form.password)
  }
  
  return { form, handleSubmit }
}

render(props, state) {
  return h('form', { onSubmit: state.handleSubmit }, [
    h('input', {
      type: 'text',
      value: state.form.username,
      onInput: (e) => state.form.username = e.target.value
    }),
    h('input', {
      type: 'password',
      value: state.form.password,
      onInput: (e) => state.form.password = e.target.value
    }),
    h('button', { type: 'submit' }, '提交')
  ])
}
```

## 注意事项

1. **ref 需要 .value**：访问和修改 ref 都要用 `.value`
2. **reactive 解包**：在模板中 reactive 对象会自动解包
3. **key 的重要性**：列表渲染时必须提供唯一的 key
4. **避免直接修改**：始终通过响应式 API 修改数据
5. **effect 清理**：使用 watch 的 cleanup 回调清理副作用

## 调试技巧

```typescript
// 1. 检查是否为响应式
console.log(isRef(count))
console.log(isReactive(state))

// 2. 追踪 effect 执行
effect(() => {
  console.log('Effect 执行', count.value)
})

// 3. 查看 vnode 结构
const vnode = h('div', {}, 'Hello')
console.log(vnode)

// 4. 监听所有变化
watch(() => ({ ...state }), 
  (newState) => console.log('State changed:', newState),
  { deep: true }
)
```

---

更多详细信息请查看：
- `CORE_REFACTORING_VUE3.md` - 技术实现详解
- `VUE3_STYLE_USAGE.md` - 完整使用指南
- `REFACTORING_SUMMARY.md` - 重构总结
