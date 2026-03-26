// PlayerPage.vue 改造为 JavaScript 对象形式组件

import { ref, computed, onMounted } from '../core/reactive'
import { compileComponent } from '../core/template-compiler'
import * as api from '../api'

const PlayerPageComponent = {
  setup() {
    // 状态
    const currentSong: any = ref({
      id: '347230',
      name: '海阔天空',
      artists: [{ id: 11972061, name: 'Beyond' }],
      album: {
        id: 34909,
        name: '乐与怒',
        picUrl: 'https://p2.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg'
      },
      duration: 317000
    })
    const isPlaying = ref(true)
    const currentTime = ref(0)
    const volume = ref(80)
    const lyrics: any = ref('')
    const loading = ref(true)

    // 计算属性：歌词行
    const lyricLines = computed(() => {
      if (!lyrics.value) return []
      
      return lyrics.value.split('\n').filter((line: string) => line.trim()).map((line: string) => {
        const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/)
        if (match) {
          const minutes = parseInt(match[1])
          const seconds = parseFloat(match[2])
          const text = match[3]
          return { minutes, seconds, text }
        }
        return { text: line }
      })
    })

    // 格式化时间
    function formatTime(time: number): string {
      const minutes = Math.floor(time / 60)
      const seconds = Math.floor(time % 60)
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }

    // 加载数据
    async function loadData() {
      try {
        const [lyricRes] = await Promise.all([
          api.getLyric(currentSong.value.id)
        ])
        lyrics.value = lyricRes.lrc?.lyric || ''
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
      currentSong,
      isPlaying,
      currentTime,
      volume,
      lyrics,
      loading,
      lyricLines,
      formatTime
    }
  },

  template: `
    <Fragment>
      <!-- 顶部导航栏 -->
      <header class="bg-white shadow-sm fixed top-0 left-0 right-0 z-10">
        <div class="container mx-auto px-4 py-3 flex items-center">
          <a href="#/" class="mr-4">
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
            >
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </a>
          <h1 class="text-xl font-bold">音乐播放</h1>
        </div>
      </header>

      <!-- 主内容区 -->
      <main class="container mx-auto px-4 pt-24 pb-20">
        <!-- 加载状态 -->
        <div v-if="loading" class="flex justify-center items-center h-screen">
          <div class="text-2xl font-bold text-primary">加载中...</div>
        </div>

        <!-- 内容 -->
        <template v-else>
          <div class="flex flex-col md:flex-row gap-8">
            <!-- 左侧歌曲信息 -->
            <div class="flex-1 md:w-1/2 flex flex-col items-center">
              <!-- 专辑封面 -->
              <div class="w-64 h-64 md:w-80 md:h-80 rounded-lg overflow-hidden shadow-xl mb-8">
                <img
                  :src="currentSong.album.picUrl"
                  :alt="currentSong.album.name"
                  class="w-full h-full object-cover"
                />
              </div>

              <!-- 歌曲信息 -->
              <div class="text-center">
                <h2 class="text-2xl font-bold mb-2">{{ currentSong.name }}</h2>
                <p class="text-gray-600">
                  {{ currentSong.artists.map(artist => artist.name).join('/') }}
                </p>
                <p class="text-gray-500 mt-1">{{ currentSong.album.name }}</p>
              </div>

              <!-- 播放控制 -->
              <div class="mt-12 w-full max-w-md">
                <!-- 进度条 -->
                <div class="mb-2 flex justify-between text-sm text-gray-500">
                  <span>{{ formatTime(currentTime) }}</span>
                  <span>{{ formatTime(currentSong.duration / 1000) }}</span>
                </div>
                <div class="progress-bar mb-8">
                  <div
                    class="progress-fill"
                    :style="{ width: (currentTime / (currentSong.duration / 1000)) * 100 + '%' }"
                  ></div>
                </div>

                <!-- 播放按钮 -->
                <div class="flex items-center justify-center space-x-8">
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
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="cursor-pointer text-primary"
                  >
                    <rect
                      v-if="isPlaying"
                      x="6"
                      y="4"
                      width="4"
                      height="16"
                    ></rect>
                    <polygon
                      v-else
                      points="5 3 19 12 5 21 5 3"
                    ></polygon>
                    <rect
                      v-if="isPlaying"
                      x="14"
                      y="4"
                      width="4"
                      height="16"
                    ></rect>
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

                <!-- 音量控制 -->
                <div class="mt-8 flex items-center space-x-4">
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
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                  </svg>
                  <div class="flex-1 volume-bar">
                    <div
                      class="volume-fill"
                      :style="{ width: volume + '%' }"
                    ></div>
                  </div>
                  <span class="text-sm text-gray-500">{{ volume }}%</span>
                </div>
              </div>
            </div>

            <!-- 右侧歌词 -->
            <div class="flex-1 md:w-1/2 bg-white rounded-lg shadow-md p-6">
              <h3 class="text-xl font-bold mb-4 text-center">歌词</h3>
              <div class="flex-1 overflow-y-auto">
                <template v-for="(line, index) in lyricLines" :key="index">
                  <div
                    v-if="line.text"
                    class="py-2 text-center text-gray-600 hover:text-primary"
                  >
                    {{ line.text }}
                  </div>
                </template>
              </div>
            </div>
          </div>
        </template>
      </main>
    </Fragment>
  `
}

// 编译组件（将 template 编译为 render 函数）
const compiledComponent = compileComponent(PlayerPageComponent)

export default compiledComponent