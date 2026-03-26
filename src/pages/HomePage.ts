import { ref, onMounted } from '../core/reactive'
import { h, Fragment } from '../core/renderer'
import { compileComponent } from '../core/template-compiler'
import * as api from '../api'
import HeaderComponent from '../components/HeaderComponet'

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
  components: { HeaderComponent },
  template: `
    <Fragment>
      <HeaderComponent />
      111
      <!-- 主内容区 -->
      <main class="container mx-auto px-4 pt-24 pb-20">
        <!-- 加载状态 -->
        <div v-if="loading" class="flex justify-center items-center h-screen">
          <div class="text-2xl font-bold text-primary">加载中...</div>
        </div>

        <!-- 内容 -->
        <template v-else>
          <!-- 轮播图 -->
          <div class="relative h-64 md:h-80 rounded-lg overflow-hidden">
            <img
              src="https://p2.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg"
              alt="轮播图"
              class="w-full h-full object-cover"
            />
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
              <h2 class="text-white text-2xl font-bold">欢迎来到网易云音乐</h2>
              <p class="text-white/80 mt-2">发现好音乐，从这里开始</p>
            </div>
          </div>

          <!-- 推荐歌单 -->
          <div class="mt-8">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-2xl font-bold">推荐歌单</h2>
              <a href="#" class="text-primary hover:underline">查看更多</a>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div
                v-for="playlist in playlists"
                :key="playlist.id"
                class="playlist-card bg-white rounded-lg overflow-hidden shadow-md"
              >
                <div class="relative">
                  <img
                    :src="playlist.coverImgUrl"
                    :alt="playlist.name"
                    class="w-full h-48 object-cover"
                  />
                  <div class="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white rounded-full px-2 py-1 text-xs">
                    {{ Math.floor(playlist.playCount / 10000) }}万
                  </div>
                </div>
                <div class="p-3">
                  <h3 class="font-medium text-sm mb-1 truncate">{{ playlist.name }}</h3>
                  <p class="text-xs text-gray-500 truncate">{{ playlist.copywriter || '未知作者' }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 热门歌曲 -->
          <div class="mt-12">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-2xl font-bold">热门歌曲</h2>
              <a href="#" class="text-primary hover:underline">查看更多</a>
            </div>
            <div class="bg-white rounded-lg shadow-md p-4">
              <div
                v-for="(song, index) in topSongs"
                :key="song.id"
                class="flex items-center py-3 border-b border-gray-100 last:border-0"
              >
                <div
                  class="w-8 h-8 flex items-center justify-center text-sm"
                  :class="index < 3 ? 'text-error font-bold' : 'text-gray-400'"
                >
                  {{ index + 1 }}
                </div>
                <div class="flex-1 ml-4">
                  <div class="flex items-center">
                    <h3 class="font-medium text-sm">{{ song.name }}</h3>
                    <a v-if="song.mvid" :href="'#/mv/' + song.mvid" class="ml-2 text-gray-400 text-xs">
                      MV
                    </a>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">
                    {{ song.artists.map(artist => artist.name).join('/') }}
                  </p>
                </div>
                <div class="text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="cursor-pointer hover:text-primary"
                  >
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- 歌手推荐 -->
          <div class="mt-12">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-2xl font-bold">歌手推荐</h2>
              <a href="#" class="text-primary hover:underline">查看更多</a>
            </div>
            <div class="grid grid-cols-5 gap-4">
              <div
                v-for="artist in topArtists"
                :key="artist.id"
                class="flex flex-col items-center"
              >
                <div class="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                  <img
                    :src="artist.picUrl"
                    :alt="artist.name"
                    class="w-full h-full object-cover"
                  />
                </div>
                <p class="mt-2 text-sm font-medium">{{ artist.name }}</p>
              </div>
            </div>
          </div>
        </template>
      </main>

      <!-- 底部播放栏 -->
      <footer class="fixed bottom-0 left-0 right-0 bg-white shadow-md border-t border-gray-200 py-3 px-4">
        <div class="container mx-auto flex items-center justify-between">
          <div class="flex items-center">
            <img
              src="https://p2.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg"
              alt="当前歌曲"
              class="w-12 h-12 rounded object-cover"
            />
            <div class="ml-3">
              <h3 class="text-sm font-medium">海阔天空</h3>
              <p class="text-xs text-gray-500">Beyond</p>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="cursor-pointer hover:text-primary"
            >
              <polygon points="19 20 9 12 19 4 19 20"></polygon>
            </svg>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="cursor-pointer text-primary"
            >
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="cursor-pointer hover:text-primary"
            >
              <polygon points="5 4 15 12 5 20 5 4"></polygon>
            </svg>
          </div>
          <div class="flex items-center space-x-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="cursor-pointer hover:text-primary"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            <a href="#/player" class="text-primary hover:underline">展开</a>
          </div>
        </div>
      </footer>
    </Fragment>
  `
}

// 编译组件（将 template 编译为 render 函数）
const compiledComponent = compileComponent(HomePageComponent)

export default compiledComponent