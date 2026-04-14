# PlaylistDetailPage 组件拆分文档

## 概述
将 `PlaylistDetailPage` 页面拆分为独立的子组件，提高代码的可维护性和复用性。

## 组件结构

### 1. PlaylistInfoComponent (歌单详情信息组件)
**位置**: `src/components/playlistDetail/PlaylistInfoComponent.ts`

**职责**:
- 显示歌单封面图片
- 展示歌单基本信息（名称、创建者、创建时间）
- 提供操作按钮（播放、收藏、分享、下载、评论）
- 显示歌单介绍

**Props**:
- `playlistInfo`: 歌单详细信息对象
- `formatPlayCount`: 格式化播放次数的函数
- `onPlayAll`: 播放全部回调函数（可选）
- `onGoBack`: 返回上一页回调函数（可选）

### 2. TrackListComponent (歌曲列表组件)
**位置**: `src/components/playlistDetail/TrackListComponent.ts`

**职责**:
- 显示歌曲列表标题和统计信息
- 渲染歌曲列表表格（序号、标题、时长、歌手、专辑）
- 集成分页组件
- 处理分页逻辑

**Props**:
- `tracks`: 歌曲列表数组
- `loading`: 加载状态
- `currentPage`: 当前页码
- `pageSize`: 每页显示条数
- `totalTracks`: 总歌曲数
- `totalPages`: 总页数
- `formatDuration`: 格式化时长的函数
- `onPageChange`: 页码变化回调（可选）
- `onPageSizeChange`: 每页条数变化回调（可选）

**依赖组件**:
- `PaginationComponent`: 分页组件

### 3. PlaylistDetailPage (页面容器)
**位置**: `src/pages/PlaylistDetailPage.ts`

**职责**:
- 管理页面级状态（歌单信息、歌曲列表、加载状态等）
- 处理数据获取逻辑
- 协调子组件之间的通信
- 处理路由导航

**使用的子组件**:
- `PlaylistInfoComponent`: 歌单详情信息
- `TrackListComponent`: 歌曲列表

## 数据流

```
PlaylistDetailPage (父组件)
  ├─ 状态管理: playlistInfo, tracks, loading, currentPage, pageSize, totalTracks
  ├─ 数据获取: loadPlaylistDetail(), loadTracks()
  │
  ├─> PlaylistInfoComponent (子组件)
  │   ├─ Props: playlistInfo, formatPlayCount, onPlayAll, onGoBack
  │   └─ Events: 通过回调函数通信
  │
  └─> TrackListComponent (子组件)
      ├─ Props: tracks, loading, currentPage, pageSize, totalTracks, totalPages, formatDuration
      ├─ Events: @page-change, @page-size-change
      └─> PaginationComponent (孙组件)
```

## 优势

1. **职责分离**: 每个组件只负责一个明确的功能区域
2. **可维护性**: 修改某个功能区域时只需关注对应组件
3. **可复用性**: 子组件可以在其他页面中复用
4. **可测试性**: 可以独立测试每个组件
5. **代码清晰**: 页面结构更加清晰，易于理解

## 注意事项

1. **Props 传递**: 确保所有必要的 props 都正确传递给子组件
2. **事件处理**: 使用回调函数实现子组件到父组件的通信
3. **响应式更新**: 遵循项目规范，避免解构 props 导致响应式丢失
4. **类型安全**: 为组件 props 定义清晰的接口类型

## 迁移指南

如果需要将类似的页面进行组件拆分，可以参考以下步骤：

1. 识别页面中的不同功能区域
2. 为每个功能区域创建独立的组件文件
3. 确定组件间的 props 和 events 接口
4. 在父组件中管理共享状态和数据获取逻辑
5. 将模板代码迁移到对应的子组件中
6. 测试确保功能正常
