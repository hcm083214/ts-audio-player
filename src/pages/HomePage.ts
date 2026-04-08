import { ref, onMounted, h, Fragment, compileComponent } from '../core'
import {getPersonalized,getTopArtists,getTopSong,getTopPlaylist} from '../api/HomeApi'
import HeaderComponent from '../components/home/HeaderComponet'
import BannerComponent from '../components/home/BannerComponent'
import PlaylistComponent from '../components/home/PlaylistComponent'
import SongListComponent from '../components/home/SongListComponent'
import ArtistCardComponent from '../components/home/ArtistCardComponent'
import PlayerBarComponent from '../components/common/PlayerBarComponent'

const HomePageComponent = {
  setup() {
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
      loadData()
    })

    return {
      playlists,
      topSongs,
      topArtists,
      loading,
    }
  },
  components: {
    HeaderComponent,
    BannerComponent,
    PlaylistComponent,
    SongListComponent,
    ArtistCardComponent,
    PlayerBarComponent
  },
  template: `
    <div>
      <HeaderComponent />
      
      <!-- 主内容区 -->
      <main class="w-[1080px] mx-auto px-4 pt-24 pb-20">
        <!-- 加载状态 -->
        <div v-if="loading" class="flex justify-center items-center h-screen">
          <div class="text-2xl font-bold text-primary">加载中...</div>
        </div>

        <!-- 内容 -->
        <div v-else>
          <!-- 轮播图 -->
          <BannerComponent :playlists="playlists" />

          <!-- 热门推荐标题和分类标签 -->
          <PlaylistComponent :playlists="playlists" />

          <!-- 热门歌曲 -->
          <div class="mt-12">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-2xl font-bold">热门歌曲</h2>
              <a href="#" class="text-primary hover:underline">查看更多</a>
            </div>
            <SongListComponent :songs="topSongs" />
          </div>

          <!-- 歌手推荐 -->
          <div class="mt-12">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-2xl font-bold">歌手推荐</h2>
              <a href="#" class="text-primary hover:underline">查看更多</a>
            </div>
            <div class="grid grid-cols-5 gap-4">
              <ArtistCardComponent
                v-for="artist in topArtists"
                :key="artist.id"
                :artist="artist"
              />
            </div>
          </div>
        </div>
      </main>

      <!-- 底部播放栏 -->
      <PlayerBarComponent />
    </div>
  `
}

// 编译组件（将 template 编译为 render 函数）
const compiledComponent = compileComponent(HomePageComponent)

export default compiledComponent
