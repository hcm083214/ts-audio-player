import { ref, onMounted, h, Fragment, compileComponent } from '../core'
import {getPersonalized,getTopArtists,getTopSong,getTopPlaylist} from '../api/HomeApi'
import HeaderComponent from '../components/home/HeaderComponet'
import BannerComponent from '../components/home/BannerComponent'




const HomePageComponent = {
  setup() {
    console.log('[HomePage] setup 被调用')
    // 状态 - 使用 any 类型以兼容 API 返回的数据
    const playlists: any = ref([])
    const topSongs: any = ref([])
    const topArtists: any = ref([])
    const loading = ref(true)

    // 加载数据
    async function loadData() {
      try {
        const [playlistsRes, songsRes, artistsRes] = await Promise.all([
          getPersonalized(12),
          getTopSong(),
          getTopArtists(0, 10)
        ])
        console.log("🚀 ~ loadData ~ playlistsRes, songsRes, artistsRes:", playlistsRes, songsRes, artistsRes)

        playlists.value = playlistsRes.result
        topSongs.value = songsRes.data
        topArtists.value = artistsRes.artists
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        loading.value = false
      }
    }



    // 初始加载
    onMounted(() => {
      console.log('[HomePage] onMounted 触发')
      loadData()
    })

    console.log('[HomePage] setup 返回')
    return {
      playlists,
      topSongs,
      topArtists,
      loading,
    }
  },
  components: {
    HeaderComponent,
    BannerComponent
  },
  template: `
    <div>
      <!-- 页面头部注释 -->
      <HeaderComponent></HeaderComponent>
      <!-- 主内容区 -->
      <main class="w-[1080px] mx-auto px-4 pt-24 pb-20">
        <!-- 加载状态 -->
        <div v-if="loading" class="flex justify-center items-center h-screen">
          <div class="text-2xl font-bold text-primary">加载中...</div>
        </div>
        <!-- 数据展示区域 -->
        <div v-else> 
          <!-- 轮播图 -->
          <BannerComponent :playlists="playlists"></BannerComponent>
        </div>
      </main>
      <!-- 页面底部注释 -->
    </div>
  `
}

// 编译组件（将 template 编译为 render 函数）
const compiledComponent = compileComponent(HomePageComponent)

export default compiledComponent
