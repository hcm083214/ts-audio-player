import { h, compileComponent, onMounted, ref, useRouter } from '../../core'
import { getSongCategories, SongCategory, getTopPlaylist } from '../../api/HomeApi'
import PlaylistCardComponent from '../common/PlaylistCardComponent'

const PlaylistComponent = {
  setup(props: Record<string, any>) {
    const playlists: any = props.playlists
    const categories = ref<string[]>([])
    const currentCategory = ref<string>('全部')
    const topPlaylists: any = ref([])
    const playlistsLoading = ref(false)
    
    // 获取路由实例
    const router = useRouter()

    onMounted(async () => {
      const result = await getSongCategories()
      categories.value = result.sub.map((cat: SongCategory) => cat.name).slice(0, 8)
      loadTopPlaylists()
    })
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

    function getMore() {
      // 使用路由实例进行导航
      router.push('/playlist')
    }

    return { playlists, categories, currentCategory, switchCategory, topPlaylists, playlistsLoading, getMore }
  },
  props: ['playlists'],
  components: { PlaylistCardComponent },
  template: `
    <div class="mt-2">
      <div class="flex justify-between items-center gap-4 mb-2">
        <div class="flex items-center gap-2">
          <svg width="16" height="16" class="text-gray-100 inline-block" style="display: inline-block;">
              <use xlink:href="#icon-circle" width="100%" height="100%"></use>
          </svg>
          <h2 class="text-2xl font-bold">热门推荐</h2>
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
        <div class="flex items-center cursor-pointer text-gray-600 hover:text-primary hover:bg-gray-100 px-3 py-1 text-sm rounded transition-all duration-300"
          @click="getMore"
        >
          <span>更多</span>
          <svg width="16" height="16" class="inline-block" style="display: inline-block;">
              <use xlink:href="#icon-more" width="100%" height="100%"></use>
          </svg>
        </div>
      </div>
      
      <!-- 歌单网格 -->
      <div v-if="playlistsLoading" class="flex justify-center items-center py-12">
        <div class="text-xl text-primary">加载中...</div>
      </div>
      <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <PlaylistCardComponent
          v-for="playlist in topPlaylists"
          :key="playlist.id"
          :playlist="playlist"
        />
      </div>
    </div>
  `
}

const compiledComponent = compileComponent(PlaylistComponent)

export default compiledComponent
