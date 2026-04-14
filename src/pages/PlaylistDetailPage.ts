import { h, compileComponent, ref, onMounted, computed, } from '../core'
import { getPlaylistDetail, getPlaylistAllTracks } from '../api/HomeApi'
import { useRouter, useRoute } from "../router";
import PlaylistInfoComponent from '../components/playlistDetail/PlaylistInfoComponent'
import TrackListComponent from '../components/playlistDetail/TrackListComponent'

const PlaylistDetailPage = {
  components: { PlaylistInfoComponent, TrackListComponent },
  setup() {
    const router = useRouter()
    const route = useRoute()

    // 歌单信息
    const playlistInfo = ref<any>(null)
    // 歌曲列表
    const tracks = ref<any[]>([])
    // 加载状态
    const loading = ref(false)
    // 当前页码
    const currentPage = ref(1)
    // 每页显示条数
    const pageSize = ref(20)
    // 总歌曲数
    const totalTracks = ref(0)

    // 从路由参数获取歌单ID
    const playlistId = computed(() => {
      return Number(route.params.id)
    })

    // 计算总页数
    const totalPages = computed(() => Math.ceil(totalTracks.value / pageSize.value))

    // 格式化时长
    const formatDuration = (ms: number) => {
      if (!ms) return '--:--'
      const minutes = Math.floor(ms / 60000)
      const seconds = Math.floor((ms % 60000) / 1000)
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }

    // 格式化播放次数
    const formatPlayCount = (count: number) => {
      if (!count) return '0'
      if (count >= 100000000) {
        return (count / 100000000).toFixed(1) + '亿'
      }
      if (count >= 10000) {
        return (count / 10000).toFixed(1) + '万'
      }
      return String(count)
    }

    // 加载歌单详情
    async function loadPlaylistDetail() {
      if (!playlistId.value) return

      try {
        loading.value = true
        const res = await getPlaylistDetail(playlistId.value)
        if (res.code === 200) {
          playlistInfo.value = res.playlist
          totalTracks.value = res.playlist.trackCount || 0
        }
      } catch (error) {
        console.error('Failed to load playlist detail:', error)
      } finally {
        loading.value = false
      }
    }

    // 加载歌曲列表
    async function loadTracks(page: number = 1) {
      if (!playlistId.value) return

      try {
        loading.value = true
        const offset = (page - 1) * pageSize.value
        const res = await getPlaylistAllTracks(playlistId.value, pageSize.value, offset)
        if (res.code === 200) {
          tracks.value = res.songs || []
        }
      } catch (error) {
        console.error('Failed to load tracks:', error)
      } finally {
        loading.value = false
      }
    }

    // 初始化加载
    onMounted(() => {
      loadPlaylistDetail()
      loadTracks(1)
    })

    // 页码变化
    function handlePageChange(page: number) {
      currentPage.value = page
      loadTracks(page)
      // 滚动到顶部
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // 每页显示条数变化
    function handlePageSizeChange(size: number) {
      pageSize.value = size
      currentPage.value = 1
      loadTracks(1)
    }

    // 返回上一页
    function goBack() {
      router.back()
    }

    // 播放全部
    function playAll() {
      // TODO: 实现播放全部功能
      console.log('Play all tracks')
    }

    return {
      playlistInfo,
      tracks,
      loading,
      currentPage,
      pageSize,
      totalTracks,
      totalPages,
      formatDuration,
      formatPlayCount,
      handlePageChange,
      handlePageSizeChange,
      goBack,
      playAll
    }
  },
  template: `
    <div class="min-h-screen bg-white pb-20">
      <!-- 加载状态 -->
      <div v-if="loading && !playlistInfo" class="flex justify-center items-center py-40">
        <div class="text-xl text-primary">加载中...</div>
      </div>
      
      <!-- 歌单详情内容 -->
      <div v-else-if="playlistInfo" class="w-[1080px] mx-auto px-4 py-8">
        <!-- 返回按钮 -->
        <button 
          @click="goBack"
          class="mb-6 px-4 py-2 text-gray-600 hover:text-primary transition-colors flex items-center gap-2"
        >
          <svg width="16" height="16" class="inline-block" style="display: inline-block;">
            <use xlink:href="#icon-back" width="100%" height="100%"></use>
          </svg>
          返回
        </button>
        
        <!-- 歌单信息组件 -->
        <PlaylistInfoComponent
          :playlist-info="playlistInfo"
          :format-play-count="formatPlayCount"
          :on-play-all="playAll"
          :on-go-back="goBack"
        />
        
        <!-- 歌曲列表组件 -->
        <TrackListComponent
          :tracks="tracks"
          :loading="loading"
          :current-page="currentPage"
          :page-size="pageSize"
          :total-tracks="totalTracks"
          :total-pages="totalPages"
          :format-duration="formatDuration"
          @page-change="handlePageChange"
          @page-size-change="handlePageSizeChange"
        />
      </div>
      
      <!-- 错误提示 -->
      <div v-else class="flex flex-col justify-center items-center py-40">
        <div class="text-xl text-gray-500 mb-4">歌单不存在或加载失败</div>
        <button 
          @click="goBack"
          class="px-6 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        >
          返回首页
        </button>
      </div>
    </div>
  `
}

const compiledComponent = compileComponent(PlaylistDetailPage)

export default compiledComponent
