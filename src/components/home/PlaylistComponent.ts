import { h, compileComponent, onMounted, ref } from '../../core'
import { getSongCategories, SongCategory, getTopPlaylist } from '../../api/HomeApi'

const PlaylistComponent = {
  setup(props: { playlists: any }) {
    const playlists: any = props.playlists
    const categories = ref<string[]>([])
    const currentCategory = ref<string>('全部')
    const topPlaylists: any = ref([])
    const playlistsLoading = ref(false)

    // 加载精选歌单
    async function loadTopPlaylists(cat: string = '全部') {
      try {
        playlistsLoading.value = true
        const res = await getTopPlaylist(cat, 'hot', 8)
        topPlaylists.value = res.playlists || []
      } catch (error) {
        console.error('Failed to load top playlists:', error)
      } finally {
        playlistsLoading.value = false
      }
    }
    // 切换分类
    function switchCategory(cat: string) {
      currentCategory.value = cat
      loadTopPlaylists(cat)
    }

    onMounted(async () => {
      const result = await getSongCategories()
      categories.value = result.sub.map((cat: SongCategory) => cat.name).slice(0, 8) 
      loadTopPlaylists()
    })
    return { playlists, categories, currentCategory, switchCategory, topPlaylists, playlistsLoading }
  },
  props: ['playlists'],
  template: `
    <div class="mt-2">
      <div class="flex items-center gap-4 mb-2">
        <div class="flex items-center gap-2">
          <svg width="16" height="16" class="text-gray-100 inline-block" style="display: inline-block;">
              <use xlink:href="#icon-circle" width="100%" height="100%"></use>
          </svg>
          <h2 class="text-2xl font-bold">热门推荐</h2>
        </div>
        <div class="flex gap-3">
          <button
            v-for="cat in categories"
            :key="cat"
            @click="switchCategory(cat)"
            :class="currentCategory === cat ? 
            'bg-primary text-white rounded-lg px-3 py-1 text-sm rounded transition-all duration-300' : 
            'text-gray-600 hover:text-primary hover:bg-gray-100 px-3 py-1 text-sm rounded transition-all duration-300'"
          >
            {{ cat }}
          </button>
        </div>
      </div>
      
      <!-- 歌单网格 -->
      <div v-if="playlistsLoading" class="flex justify-center items-center py-12">
        <div class="text-xl text-primary">加载中...</div>
      </div>
      <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div
          v-for="playlist in topPlaylists"
          :key="playlist.id"
          class="group cursor-pointer"
        >
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
                {{ playlist.playCount > 10000 ? (playlist.playCount / 10000).toFixed(0) + '万' : playlist.playCount }}
              </div>
            </div>
            <!-- 播放按钮 -->
            <div class="absolute bottom-2 right-2 w-6 h-6 bg-slate-50  rounded-full flex items-center justify-center opacity-0 group-hover:opacity-30 transition-opacity duration-300">
              <svg width="16" height="16" class="inline-block" style="display: inline-block;" fill="#ccc">
                  <use xlink:href="#icon-play" width="100%" height="100%" ></use>
              </svg>
            </div>
          </div>
          <!-- 歌单标题 -->
          <div class="line-clamp-2 text-sm text-gray-800 group-hover:text-primary transition-colors">
            {{ playlist.name }}
          </div>
        </div>
      </div>
    </div>
  `
}

const compiledComponent = compileComponent(PlaylistComponent)

export default compiledComponent
