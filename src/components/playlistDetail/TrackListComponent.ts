import { h, compileComponent, ref, onMounted, computed, } from '../../core'
import PaginationComponent from '../common/PaginationComponent'

interface TrackListComponentProps {
  tracks: any[]
  loading: boolean
  currentPage: number
  pageSize: number
  totalTracks: number
  totalPages: number
  formatDuration: (ms: number) => string
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

const TrackListComponent = {
  props: ['tracks', 'loading', 'currentPage', 'pageSize', 'totalTracks', 'totalPages', 'formatDuration', 'onPageChange', 'onPageSizeChange'],
  components: { PaginationComponent },
  setup(props: TrackListComponentProps) {
    // 页码变化
    function handlePageChange(page: number) {
      if (props.onPageChange) {
        props.onPageChange(page)
      }
    }

    // 每页显示条数变化
    function handlePageSizeChange(size: number) {
      if (props.onPageSizeChange) {
        props.onPageSizeChange(size)
      }
    }

    return {
      handlePageChange,
      handlePageSizeChange
    }
  },
  template: `
    <div>
      <!-- 歌曲列表标题 -->
      <div class="flex items-center justify-between mb-4 pb-4 border-b-2 border-primary">
        <div class="flex items-center gap-4">
          <h2 class="text-xl font-bold text-gray-900">歌曲列表</h2>
          <span class="text-sm text-gray-500">{{ totalTracks }}首歌</span>
        </div>
        <div class="flex items-center gap-4 text-sm">
          <span class="text-primary cursor-pointer hover:underline">生成外链播放器</span>
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
      <div>
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
  `
}

const compiledComponent = compileComponent(TrackListComponent)

export default compiledComponent
