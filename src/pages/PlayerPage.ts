// PlayerPage.vue 改造为 JavaScript 对象形式组件

import { ref, computed, onMounted, h, Fragment, compileComponent } from '../core'
import * as api from '../api'
import PlayerHeaderComponent from '../components/player/PlayerHeaderComponent'
import AlbumCoverComponent from '../components/player/AlbumCoverComponent'
import SongInfoComponent from '../components/player/SongInfoComponent'
import ProgressBarComponent from '../components/player/ProgressBarComponent'
import PlayerControlsComponent from '../components/player/PlayerControlsComponent'
import VolumeControlComponent from '../components/player/VolumeControlComponent'
import LyricsPanelComponent from '../components/player/LyricsPanelComponent'

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
  components: { 
    PlayerHeaderComponent,
    AlbumCoverComponent,
    SongInfoComponent,
    ProgressBarComponent,
    PlayerControlsComponent,
    VolumeControlComponent,
    LyricsPanelComponent
  },
  template: `
    <Fragment>
      <!-- 顶部导航栏 -->
      <PlayerHeaderComponent />

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
              <AlbumCoverComponent 
                :src="currentSong.album.picUrl"
                :alt="currentSong.album.name"
              />

              <!-- 歌曲信息 -->
              <SongInfoComponent :song="currentSong" />

              <!-- 播放控制区域 -->
              <div class="mt-12 w-full max-w-md">
                <!-- 进度条 -->
                <ProgressBarComponent 
                  :currentTime="currentTime"
                  :duration="currentSong.duration / 1000"
                  :formatTime="formatTime"
                />

                <!-- 播放按钮 -->
                <PlayerControlsComponent :isPlaying="isPlaying" />

                <!-- 音量控制 -->
                <VolumeControlComponent :volume="volume" />
              </div>
            </div>

            <!-- 右侧歌词 -->
            <LyricsPanelComponent :lyricLines="lyricLines" />
          </div>
        </template>
      </main>
    </Fragment>
  `
}

// 编译组件（将 template 编译为 render 函数）
const compiledComponent = compileComponent(PlayerPageComponent)

export default compiledComponent