import { h, compileComponent, ref, onMounted, computed, } from '../../core'
import { useRouter } from '../../router'

interface PlaylistInfoComponentProps {
  playlistInfo: any
  formatPlayCount: (count: number) => string
  onPlayAll?: () => void
  onGoBack?: () => void
}

const PlaylistInfoComponent = {
  props: ['playlistInfo', 'formatPlayCount', 'onPlayAll', 'onGoBack'],
  setup(props: PlaylistInfoComponentProps) {
    const router = useRouter()

    // 播放全部
    function handlePlayAll() {
      if (props.onPlayAll) {
        props.onPlayAll()
      }
    }

    // 返回上一页
    function handleGoBack() {
      if (props.onGoBack) {
        props.onGoBack()
      } else {
        router.back()
      }
    }

    return {
      handlePlayAll,
      handleGoBack
    }
  },
  template: `
    <div class="flex gap-8 mb-12">
      <!-- 歌单封面 -->
      <div class="flex-shrink-0">
        <img 
          :src="playlistInfo.coverImgUrl" 
          :alt="playlistInfo.name"
          class="w-[250px] h-[250px] rounded-lg object-cover shadow-lg"
        />
      </div>
      
      <!-- 歌单详情 -->
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-4">
          <span class="bg-primary text-white px-3 py-1 rounded text-sm">歌单</span>
          <h1 class="text-2xl font-bold text-gray-900">{{ playlistInfo.name }}</h1>
        </div>
        
        <!-- 创作者信息 -->
        <div class="flex items-center gap-3 mb-6">
          <img 
            :src="playlistInfo.creator.avatarUrl" 
            :alt="playlistInfo.creator.nickname"
            class="w-8 h-8 rounded-full"
          />
          <span class="text-primary text-sm">{{ playlistInfo.creator.nickname }}</span>
          <span class="text-gray-400 text-sm">{{ playlistInfo.createTime ? new Date(playlistInfo.createTime).toLocaleDateString() : '' }} 创建</span>
        </div>
        
        <!-- 操作按钮 -->
        <div class="flex gap-3 mb-6">
          <button 
            @click="handlePlayAll"
            class="bg-primary text-white px-6 py-2 rounded flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <svg width="16" height="16" class="inline-block" style="display: inline-block;">
              <use xlink:href="#icon-play" width="100%" height="100%"></use>
            </svg>
            播放
          </button>
          <button class="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-50 transition-colors">
            <svg width="16" height="16" class="inline-block" style="display: inline-block;">
              <use xlink:href="#icon-should" width="100%" height="100%"></use>
            </svg>
            <span>({{ formatPlayCount(playlistInfo.subscribedCount || 0) }})</span>
          </button>
          <button class="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-50 transition-colors">
            <svg width="16" height="16" class="inline-block" style="display: inline-block;">
              <use xlink:href="#icon-share" width="100%" height="100%"></use>
            </svg>
            <span>({{ formatPlayCount(playlistInfo.shareCount || 0) }})</span>
          </button>
          <button class="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-50 transition-colors">
            <svg width="16" height="16" class="inline-block" style="display: inline-block;">
              <use xlink:href="#icon-download" width="100%" height="100%"></use>
            </svg>
            下载
          </button>
          <button class="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-50 transition-colors">
            <svg width="16" height="16" class="inline-block" style="display: inline-block;">
              <use xlink:href="#icon-comment" width="100%" height="100%"></use>
            </svg>
            <span>({{ formatPlayCount(playlistInfo.commentCount || 0) }})</span>
          </button>
        </div>
        
        <!-- 歌单介绍 -->
        <div class="text-sm text-gray-600 leading-relaxed">
          <span class="font-medium text-gray-900">介绍：</span>
          {{ playlistInfo.description || '暂无介绍' }}
        </div>
      </div>
    </div>
  `
}


const compiledComponent = compileComponent(PlaylistInfoComponent)

export default compiledComponent