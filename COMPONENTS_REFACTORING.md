# Components 文件夹重构说明

## 重构日期
2026-04-06

## 重构目标
按照页面维度组织组件，提高代码可维护性和可读性。

## 新的目录结构

```
src/components/
├── common/              # 共用组件（多个页面使用）
│   └── PlayerBarComponent.ts    # 底部播放控制栏
│
├── home/                # 首页相关组件
│   ├── HeaderComponet.ts        # 顶部导航栏（带搜索）
│   ├── BannerComponent.ts       # 轮播图组件
│   ├── PlaylistCardComponent.ts # 歌单卡片
│   ├── SongListComponent.ts     # 歌曲列表
│   └── ArtistCardComponent.ts   # 歌手卡片
│
└── player/              # 播放器页面相关组件
    ├── PlayerHeaderComponent.ts      # 播放器顶部导航（带返回按钮）
    ├── AlbumCoverComponent.ts        # 专辑封面展示
    ├── SongInfoComponent.ts          # 歌曲信息展示
    ├── ProgressBarComponent.ts       # 进度条组件
    ├── PlayerControlsComponent.ts    # 播放控制按钮
    ├── VolumeControlComponent.ts     # 音量控制
    └── LyricsPanelComponent.ts       # 歌词面板
```

## 组件分类说明

### Home 页面组件
这些组件仅在首页（`HomePage.ts`）中使用：
- **HeaderComponet**: 首页顶部导航，包含 Logo、搜索框和登录按钮
- **BannerComponent**: 首页轮播图，展示推荐内容
- **PlaylistCardComponent**: 歌单卡片展示，用于推荐歌单区域
- **SongListComponent**: 歌曲列表展示，用于热门歌曲区域
- **ArtistCardComponent**: 歌手头像卡片，用于歌手推荐区域

### Player 页面组件
这些组件仅在播放器页面（`PlayerPage.ts`）中使用：
- **PlayerHeaderComponent**: 播放器页面顶部导航，包含返回按钮和标题
- **AlbumCoverComponent**: 专辑封面大图展示
- **SongInfoComponent**: 当前播放歌曲的详细信息（歌名、歌手、专辑）
- **ProgressBarComponent**: 播放进度条，支持拖拽和时间显示
- **PlayerControlsComponent**: 播放控制按钮（上一首、播放/暂停、下一首）
- **VolumeControlComponent**: 音量调节滑块
- **LyricsPanelComponent**: 歌词滚动展示面板

### Common 共用组件
这些组件在多个页面中都可能使用：
- **PlayerBarComponent**: 底部固定播放控制栏，在任何页面都可以显示当前播放状态和控制按钮

## 导入路径变更

### 页面文件中的导入
所有页面文件中的组件导入路径已更新：

**HomePage.ts:**
```typescript
// 之前
import HeaderComponent from '../components/HeaderComponet'
import BannerComponent from '../components/BannerComponent'
// ...

// 之后
import HeaderComponent from '../components/home/HeaderComponet'
import BannerComponent from '../components/home/BannerComponent'
// ...
import PlayerBarComponent from '../components/common/PlayerBarComponent'
```

**PlayerPage.ts:**
```typescript
// 之前
import PlayerHeaderComponent from '../components/PlayerHeaderComponent'
import AlbumCoverComponent from '../components/AlbumCoverComponent'
// ...

// 之后
import PlayerHeaderComponent from '../components/player/PlayerHeaderComponent'
import AlbumCoverComponent from '../components/player/AlbumCoverComponent'
// ...
```

### 组件文件中的导入
所有组件文件中对 core 模块的导入路径已从 `../core/` 更新为 `../../core/`：

```typescript
// 之前（组件在 components 根目录）
import { h } from '../core/renderer'
import { compileComponent } from '../core/template-compiler'

// 之后（组件在 components 子目录）
import { h } from '../../core/renderer'
import { compileComponent } from '../../core/template-compiler'
```

## 修改的文件清单

### 页面文件（2个）
- `src/pages/HomePage.ts` - 更新了5个组件的导入路径
- `src/pages/PlayerPage.ts` - 更新了7个组件的导入路径

### 组件文件（13个）
**Home 文件夹（5个）:**
- `src/components/home/HeaderComponet.ts`
- `src/components/home/BannerComponent.ts`
- `src/components/home/PlaylistCardComponent.ts`
- `src/components/home/SongListComponent.ts`
- `src/components/home/ArtistCardComponent.ts`

**Player 文件夹（7个）:**
- `src/components/player/PlayerHeaderComponent.ts`
- `src/components/player/AlbumCoverComponent.ts`
- `src/components/player/SongInfoComponent.ts`
- `src/components/player/ProgressBarComponent.ts`
- `src/components/player/PlayerControlsComponent.ts`
- `src/components/player/VolumeControlComponent.ts`
- `src/components/player/LyricsPanelComponent.ts`

**Common 文件夹（1个）:**
- `src/components/common/PlayerBarComponent.ts`

## 验证结果
✅ 所有文件已通过 TypeScript 语法检查，无错误
✅ 所有导入路径已正确更新
✅ 目录结构清晰，便于维护

## 优势
1. **更好的组织性**: 按页面分组使相关组件更容易查找
2. **提高可维护性**: 修改某个页面的组件时，只需关注对应文件夹
3. **清晰的职责划分**: 通过文件夹名称即可了解组件的使用场景
4. **便于扩展**: 新增页面时，可以创建对应的组件文件夹
5. **复用组件明确标识**: common 文件夹清晰标识了可复用组件

## 注意事项
- 如果未来需要跨页面共享其他组件，应将其移至 `common` 文件夹
- 新增页面时，建议在 `components` 下创建对应的页面文件夹
- 保持导入路径的一致性，始终使用相对路径
