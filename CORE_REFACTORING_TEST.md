# Core 模块重构 - 测试指南

## 快速测试清单

### 1. 响应式系统测试

#### 测试 ref 和 reactive
```typescript
import { ref, reactive, computed, watchEffect } from './core'

// 测试 ref
const count = ref(0)
console.log('ref value:', count.value) // 应该输出 0
count.value = 1
console.log('ref updated:', count.value) // 应该输出 1

// 测试 reactive
const state = reactive({ name: 'test', age: 25 })
console.log('reactive:', state.name, state.age) // 应该输出 test 25
state.name = 'updated'
console.log('reactive updated:', state.name) // 应该输出 updated

// 测试 computed
const doubled = computed(() => count.value * 2)
console.log('computed:', doubled.value) // 应该输出 2

// 测试 watchEffect
watchEffect(() => {
  console.log('watchEffect triggered:', count.value)
})
count.value = 5 // 应该触发 watchEffect
```

### 2. SVG 渲染测试

检查首页的图标是否正确显示：
- 访问 `http://localhost:3001/`
- 确认所有 SVG 图标（播放、暂停、下一曲等）正常显示
- 确认图标颜色正确（使用 currentColor）

### 3. 编译器 v-if/v-else 测试

在任意组件模板中测试：
```html
<div v-if="isLoading">加载中...</div>
<div v-else>加载完成</div>
```

### 4. 路由测试

#### Hash 模式（当前使用）
```typescript
// 测试路由跳转
router.push('/player')
console.log(window.location.hash) // 应该输出 #/player

// 监听路由变化
window.addEventListener('hashchange', () => {
  console.log('Route changed:', window.location.hash)
})
```

### 5. 完整功能测试流程

1. **首页加载**
   - [ ] Banner 轮播图正常显示
   - [ ] 推荐歌单列表正常渲染
   - [ ] 艺术家卡片正确显示
   - [ ] 歌曲列表正常展示

2. **播放器页面**
   - [ ] 专辑封面正确显示
   - [ ] 歌词面板正常滚动
   - [ ] 播放控制按钮（上一曲/播放/暂停/下一曲）正常工作
   - [ ] 进度条可拖动
   - [ ] 音量控制正常

3. **歌单页面**
   - [ ] 歌单列表正确分页
   - [ ] 点击歌单跳转到详情页

4. **歌单详情页**
   - [ ] 歌单信息正确显示
   - [ ] 曲目列表正常渲染
   - [ ] 点击歌曲开始播放

### 6. 性能测试

打开浏览器开发者工具：
- Performance 标签：记录页面加载和交互性能
- Network 标签：检查资源加载情况
- Console 标签：确认没有错误或警告

### 7. 兼容性测试

在不同浏览器中测试：
- [ ] Chrome
- [ ] Firefox
- [ ] Edge
- [ ] Safari（如果可用）

## 已知问题排查

### 如果页面白屏
1. 检查控制台错误信息
2. 确认 `main.ts` 中的路由配置正确
3. 检查组件是否正确导入

### 如果 SVG 图标不显示
1. 检查 `vnode.tag` 是否正确设置
2. 确认 SVG 元素使用 `createElementNS` 创建
3. 检查 SVG sprite 是否正确加载

### 如果响应式不更新
1. 确认使用了 `ref` 或 `reactive` 创建响应式数据
2. 检查是否在 `setup` 函数中返回了响应式数据
3. 确认模板中正确引用了响应式数据

## 调试技巧

### 启用详细日志
在关键位置添加 console.log：
```typescript
console.log('🔍 VNode:', vnode)
console.log('🔄 State changed:', state)
console.log('⚡ Effect triggered')
```

### 使用浏览器 DevTools
1. Elements 面板：检查 DOM 结构
2. Console 面板：查看日志和错误
3. Sources 面板：设置断点调试
4. Performance 面板：分析性能瓶颈

## 回滚方案

如果遇到问题需要回滚：
1. 使用 Git 恢复到之前的提交
2. 或者保留旧文件作为备份：
   ```bash
   # 重命名新文件
   mv src/core/reactivity/reactive.ts src/core/reactivity/reactive.new.ts
   # 恢复旧文件
   git checkout HEAD -- src/core/reactivity/reactive.ts
   ```

## 下一步优化建议

1. **添加错误边界**：捕获组件渲染错误
2. **实现 KeepAlive**：缓存组件状态
3. **优化 Diff 算法**：支持 key 属性的高效对比
4. **添加 SSR 支持**：服务端渲染
5. **编写单元测试**：使用 Jest 或 Vitest
