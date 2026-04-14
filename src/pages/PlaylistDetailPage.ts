import { h, compileComponent, ref, onMounted, computed, } from '../core'
import { getPlaylistDetail, getPlaylistAllTracks } from '../api/HomeApi'
import {  useRouter, useRoute } from "../router";

const PlaylistDetailPage = {
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
        
        <!-- 歌单信息区域 -->
        <div class="flex gap-8 mb-12">
          <!-- 歌单封面 -->
          <div class="flex-shrink-0">
            <img 
              :src="playlistInfo.coverImgUrl" 
              :alt="playlistInfo.name"
              class="w-[250px] h-[250px] rounded-lg object-cover shadow-lg"
            />
          </div>
          
          <!-- 歌单详情 -->
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-4">
              <span class="bg-primary text-white px-3 py-1 rounded text-sm">歌单</span>
              <h1 class="text-2xl font-bold text-gray-900">{{ playlistInfo.name }}</h1>
            </div>
            
            <!-- 创作者信息 -->
            <div class="flex items-center gap-3 mb-6">
              <img 
                :src="playlistInfo.creator.avatarUrl" 
                :alt="playlistInfo.creator.nickname"
                class="w-8 h-8 rounded-full"
              />
              <span class="text-primary text-sm">{{ playlistInfo.creator.nickname }}</span>
              <span class="text-gray-400 text-sm">{{ playlistInfo.createTime ? new Date(playlistInfo.createTime).toLocaleDateString() : '' }} 创建</span>
            </div>
            
            <!-- 操作按钮 -->
            <div class="flex gap-3 mb-6">
              <button 
                @click="playAll"
                class="bg-primary text-white px-6 py-2 rounded flex items-center gap-2 hover:bg-primary/90 transition-colors"
              >
                <svg width="16" height="16" class="inline-block" style="display: inline-block;">
                  <use xlink:href="#icon-play" width="100%" height="100%"></use>
                </svg>
                播放
              </button>
              <button class="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-50 transition-colors">
                <svg width="16" height="16" class="inline-block" style="display: inline-block;">
                  <use xlink:href="#icon-should" width="100%" height="100%"></use>
                </svg>
                <span>({{ formatPlayCount(playlistInfo.subscribedCount || 0) }})</span>
              </button>
              <button class="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-50 transition-colors">
                <svg width="16" height="16" class="inline-block" style="display: inline-block;">
                  <use xlink:href="#icon-share" width="100%" height="100%"></use>
                </svg>
                </svg>
                <span>({{ formatPlayCount(playlistInfo.shareCount || 0) }})</span>
              </button>
              <button class="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-50 transition-colors">
                <svg width="16" height="16" class="inline-block" style="display: inline-block;">
                  <use xlink:href="#icon-download" width="100%" height="100%"></use>
                </svg>
                下载
              </button>
              <button class="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-50 transition-colors">
                <svg width="16" height="16" class="inline-block" style="display: inline-block;">
                  <use xlink:href="#icon-comment" width="100%" height="100%"></use>
                </svg>
                <span>({{ formatPlayCount(playlistInfo.commentCount || 0) }})</span>
              </button>
            </div>
            
            <!-- 歌单介绍 -->
            <div class="text-sm text-gray-600 leading-relaxed">
              <span class="font-medium text-gray-900">介绍：</span>
              {{ playlistInfo.description || '暂无介绍' }}
            </div>
          </div>
        </div>
        
        <!-- 歌曲列表标题 -->
        <div class="flex items-center justify-between mb-4 pb-4 border-b-2 border-primary">
          <div class="flex items-center gap-4">
            <h2 class="text-xl font-bold text-gray-900">歌曲列表</h2>
            <span class="text-sm text-gray-500">{{ totalTracks }}首歌</span>
          </div>
          <div class="flex items-center gap-4 text-sm">
            <span class="text-primary cursor-pointer hover:underline">生成外链播放器</span>
            <span class="text-gray-600">播放：<span class="text-primary font-bold">{{ formatPlayCount(playlistInfo.playCount || 0) }}</span>次</span>
          </div>
        </div>
        
        <!-- 歌曲列表表头 -->
        <div class="grid grid-cols-[50px_1fr_100px_150px_200px] gap-4 px-4 py-3 bg-gray-50 text-sm text-gray-600 font-medium border-b border-gray-200">
          <div class="text-center"> </div>
          <div>歌曲标题</div>
          <div class="text-center">时长</div>
          <div>歌手</div>
          <div>专辑</div>
        </div>
        
        <!-- 歌曲列表内容 -->
        <div v-if="loading" class="flex justify-center items-center py-20">
          <div class="text-xl text-primary">加载中...</div>
        </div>
        
        <div v-else class="divide-y divide-gray-100">
          <div 
            v-for="(track, index) in tracks" 
            :key="track.id"
            :class="index % 2 === 0 ? 'bg-white' : 'bg-gray-50'"
            class="grid grid-cols-[50px_1fr_100px_150px_200px] gap-4 px-4 py-3 text-sm hover:bg-gray-100 transition-colors cursor-pointer group"
          >
            <!-- 序号/播放按钮 -->
            <div class="flex items-center justify-center">
              <span class="text-gray-500 mr-1">{{ (currentPage - 1) * pageSize + index + 1 }}</span>
              <svg width="16" height="16" class="inline-block" style="display: inline-block;">
                <use xlink:href="#icon-play" width="100%" height="100%"></use>
              </svg>
            </div>
            
            <!-- 歌曲标题 -->
            <div class="flex items-center gap-2">
              <span class="text-gray-900 font-medium truncate">{{ track.name }}</span>
              <span v-if="track.mv" class="text-red-500 text-xs border border-red-500 px-1 rounded">MV</span>
            </div>
            
            <!-- 时长 -->
            <div class="text-center text-gray-600">
              {{ formatDuration(track.dt || track.duration) }}
            </div>
            
            <!-- 歌手 -->
            <div class="text-gray-600 truncate">
              {{ track.ar ? track.ar.map(a => a.name).join('/') : (track.artists ? track.artists.map(a => a.name).join('/') : '未知') }}
            </div>
            
            <!-- 专辑 -->
            <div class="text-gray-600 truncate">
              {{ track.al ? track.al.name : (track.album ? track.album.name : '未知') }}
            </div>
          </div>
        </div>
        
        <!-- 分页组件 -->
        <div v-if="totalPages > 1" class="mt-8">
          <PaginationComponent
            :current-page="currentPage"
            :total-pages="totalPages"
            :page-size="pageSize"
            :page-sizes="[10, 20, 30, 50]"
            @page-change="handlePageChange"
            @page-size-change="handlePageSizeChange"
          />
        </div>
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
