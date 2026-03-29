import { ref, onMounted } from '../core/reactive'
import { h, Fragment } from '../core/renderer'
import { compileComponent } from '../core/template-compiler'
import * as api from '../api'
import HeaderComponent from '../components/HeaderComponet'
import BannerComponent from '../components/BannerComponent'
import PlaylistCardComponent from '../components/PlaylistCardComponent'
import SongListComponent from '../components/SongListComponent'
import ArtistCardComponent from '../components/ArtistCardComponent'
import PlayerBarComponent from '../components/PlayerBarComponent'

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
          api.getPersonalized(12),
          api.getTopSong(),
          api.getTopArtists(0, 10)
        ])
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
      loading
    }
  },
  components: { 
    HeaderComponent,
    BannerComponent,
    PlaylistCardComponent,
    SongListComponent,
    ArtistCardComponent,
    PlayerBarComponent
  },
  template: `
    <Fragment>
      <HeaderComponent />
      
      <!-- 主内容区 -->
      <main class="container mx-auto px-4 pt-24 pb-20">
        <!-- 加载状态 -->
        <div v-if="loading" class="flex justify-center items-center h-screen">
          <div class="text-2xl font-bold text-primary">加载中...</div>
        </div>

        <!-- 内容 -->
        <div v-else>
          <!-- 轮播图 -->
          <BannerComponent />

          <!-- 推荐歌单 -->
          <div class="mt-8">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-2xl font-bold">推荐歌单</h2>
              <a href="#" class="text-primary hover:underline">查看更多</a>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <PlaylistCardComponent
                v-for="playlist in playlists"
                :key="playlist.id"
                :playlist="playlist"
              />
            </div>
          </div>

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
    </Fragment>
  `
}

// 编译组件（将 template 编译为 render 函数）
const compiledComponent = compileComponent(HomePageComponent)

export default compiledComponent
