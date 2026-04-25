import { h, compileComponent, useRouter, useRoute } from '../../core'

interface PlaylistCardProps {
  playlist: {
    id: number | string
    name: string
    coverImgUrl?: string
    picUrl?: string
    playCount: number
  }
}

const PlaylistCardComponent = {
  setup(props: Record<string, any>) {
    console.log("🚀 ~ props:", props.playlist)
    const router = useRouter()
    
    // 格式化播放量
    const formatPlayCount = (count: number): string => {
      return count > 10000 ? (count / 10000).toFixed(0) + '万' : String(count)
    }
    
    // 跳转到歌单详情页
    function navigateToDetail() {
      router.push(`/playlist/${props.playlist.id}`)
    }

    return {
      playlist: props.playlist,  // 将 props 暴露给模板
      formatPlayCount,
      navigateToDetail
    }
  },
  props: ['playlist'],
  template: `
    <div class="group cursor-pointer" @click="navigateToDetail">
      <!-- 图片容器 -->
      <div class="relative aspect-square rounded-lg overflow-hidden mb-3">
        <img
          :src="playlist.coverImgUrl || playlist.picUrl"
          :alt="playlist.name"
          class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <!-- 播放量遮罩 -->
        <div class="absolute bottom-2 left-0 right-0 h-7 bg-gradient-to-b from-black/40 to-transparent flex items-start justify-between px-2 py-1">
          <div class="text-[#ccc] text-base flex items-center gap-1">
            <svg width="16" height="16" class="inline-block" style="display: inline-block;">
                <use xlink:href="#icon-headphone" width="100%" height="100%"></use>
            </svg>
            {{ formatPlayCount(playlist.playCount) }}
          </div>
        </div>
        <!-- 播放按钮 -->
        <div class="absolute bottom-2 right-2 w-6 h-6 bg-slate-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-30 transition-opacity duration-300">
          <svg width="16" height="16" class="inline-block" style="display: inline-block;" fill="#ccc">
              <use xlink:href="#icon-play" width="100%" height="100%"></use>
          </svg>
        </div>
      </div>
      <!-- 歌单标题 -->
      <div class="line-clamp-2 text-sm text-gray-800 group-hover:text-primary transition-colors">
        {{ playlist.name }}
      </div>
    </div>
  `
}

const compiledComponent = compileComponent(PlaylistCardComponent)

export default compiledComponent
export type { PlaylistCardProps }
