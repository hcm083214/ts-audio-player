import { h, compileComponent, onMounted, ref } from '../core'
import { getSongCategories, SongCategory, getTopPlaylist } from '../api/HomeApi'
import PlaylistCardComponent from '../components/common/PlaylistCardComponent'

interface CategoryGroup {
  name: string
  icon: string
  categories: string[]
}

const PlayListPage = {
  setup() {
    const allCategories = ref<SongCategory[]>([])
    const currentCategory = ref<string>('全部')
    const playlists = ref<any[]>([])
    const total = ref(0)
    const currentPage = ref(1)
    const pageSize = ref(30)
    const loading = ref(false)
    const showCategoryDropdown = ref(false)

    // 分类分组配置
    const categoryGroups = ref<CategoryGroup[]>([
      {
        name: '语种',
        icon: 'icon-globe',
        categories: ['华语', '欧美', '日语', '韩语', '粤语']
      },
      {
        name: '风格',
        icon: 'icon-music',
        categories: ['流行', '摇滚', '民谣', '电子', '舞曲', '说唱', '轻音乐', '爵士', '乡村', 'R&B/Soul', '古典', '民族', '英伦', '金属', '朋克', '蓝调', '雷鬼', '世界音乐', '拉丁', 'New Age', '古风', '后摇', 'Bossa Nova']
      },
      {
        name: '场景',
        icon: 'icon-coffee',
        categories: ['清晨', '夜晚', '学习', '工作', '午休', '下午茶', '地铁', '驾车', '运动', '旅行', '散步', '酒吧']
      },
      {
        name: '情感',
        icon: 'icon-smile',
        categories: ['怀旧', '清新', '浪漫', '伤感', '治愈', '放松', '孤独', '感动', '兴奋', '快乐', '安静', '思念']
      },
      {
        name: '主题',
        icon: 'icon-music-note',
        categories: ['综艺', '影视原声', 'ACG', '儿童', '校园', '游戏', '70后', '80后', '90后', '网络歌曲', 'KTV', '经典', '翻唱', '吉他', '钢琴', '器乐', '榜单', '00后']
      }
    ])

    // 加载所有分类
    onMounted(async () => {
      try {
        const result = await getSongCategories()
        allCategories.value = result.sub || []
      } catch (error) {
        console.error('Failed to load categories:', error)
      }
      loadPlaylists()
    })

    // 加载歌单列表
    async function loadPlaylists(page: number = 1) {
      try {
        loading.value = true
        const offset = (page - 1) * pageSize.value
        const res = await getTopPlaylist(currentCategory.value, 'hot', pageSize.value, offset)
        playlists.value = res.playlists || []
        total.value = res.total || 0
        currentPage.value = page
      } catch (error) {
        console.error('Failed to load playlists:', error)
      } finally {
        loading.value = false
      }
    }

    // 切换分类
    function selectCategory(cat: string) {
      currentCategory.value = cat
      showCategoryDropdown.value = false
      loadPlaylists(1)
    }

    // 切换分页
    function changePage(page: number) {
      if (page < 1 || page > totalPages.value) return
      loadPlaylists(page)
    }

    // 计算总页数
    const totalPages = ref(0)
    
    // 监听 total 变化，更新总页数
    const updateTotalPages = () => {
      totalPages.value = Math.ceil(total.value / pageSize.value)
    }

    return {
      allCategories,
      currentCategory,
      playlists,
      total,
      currentPage,
      pageSize,
      loading,
      showCategoryDropdown,
      categoryGroups,
      selectCategory,
      changePage,
      totalPages,
      updateTotalPages
    }
  },
  components: { PlaylistCardComponent },
  template: `
    <div class="min-h-screen bg-gray-50 pb-20">
      <!-- 顶部导航栏 -->
      <div class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div class="container mx-auto px-4 py-3">
          <div class="flex items-center justify-between">
            <!-- 左侧：分类选择 -->
            <div class="relative">
              <button
                @click="showCategoryDropdown = !showCategoryDropdown"
                class="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <span class="text-lg font-bold">{{ currentCategory }}</span>
                <svg width="16" height="16" class="inline-block" style="display: inline-block;">
                  <use xlink:href="#icon-chevron-down" width="100%" height="100%"></use>
                </svg>
              </button>

              <!-- 分类下拉菜单 -->
              <div
                v-if="showCategoryDropdown"
                class="absolute top-full left-0 mt-2 w-[800px] bg-white rounded-lg shadow-xl border border-gray-200 p-6 z-50"
              >
                <!-- 全部分类按钮 -->
                <button
                  @click="selectCategory('全部')"
                  :class="currentCategory === '全部' ? 
                    'bg-primary text-white px-4 py-2 rounded-lg mb-4' : 
                    'bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg mb-4'"
                >
                  全部风格
                </button>

                <!-- 分类分组 -->
                <div class="space-y-4">
                  <div v-for="group in categoryGroups" :key="group.name">
                    <div class="flex items-start gap-4 mb-2">
                      <!-- 分组图标和名称 -->
                      <div class="flex items-center gap-2 min-w-[80px]">
                        <svg width="20" height="20" class="text-gray-600 inline-block" style="display: inline-block;">
                          <use :xlink:href="'#' + group.icon" width="100%" height="100%"></use>
                        </svg>
                        <span class="text-gray-700 font-medium text-sm">{{ group.name }}</span>
                      </div>
                      <!-- 分类标签 -->
                      <div class="flex flex-wrap gap-2">
                        <button
                          v-for="cat in group.categories"
                          :key="cat"
                          @click="selectCategory(cat)"
                          :class="currentCategory === cat ? 
                            'bg-primary text-white px-3 py-1 rounded text-sm' : 
                            'text-gray-600 hover:text-primary hover:bg-gray-100 px-3 py-1 rounded text-sm transition-colors'"
                        >
                          {{ cat }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 右侧：排序按钮 -->
            <div class="flex items-center gap-2">
              <button class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                热门
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 歌单列表 -->
      <div class="container mx-auto px-4 py-6">
        <!-- 加载状态 -->
        <div v-if="loading" class="flex justify-center items-center py-20">
          <div class="text-xl text-primary">加载中...</div>
        </div>

        <!-- 歌单网格 -->
        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          <PlaylistCardComponent
            v-for="playlist in playlists"
            :key="playlist.id"
            :playlist="playlist"
          />
        </div>

        <!-- 分页组件 -->
        <div v-if="totalPages > 1" class="flex justify-center items-center gap-2 mt-12 mb-8">
          <!-- 上一页 -->
          <button
            @click="changePage(currentPage - 1)"
            :disabled="currentPage === 1"
            :class="currentPage === 1 ? 
              'bg-gray-100 text-gray-400 cursor-not-allowed' : 
              'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'"
            class="px-4 py-2 rounded-lg transition-colors"
          >
            上一页
          </button>

          <!-- 页码 -->
          <button
            v-for="page in totalPages"
            :key="page"
            @click="changePage(page)"
            :class="currentPage === page ? 
              'bg-primary text-white border-primary' : 
              'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'"
            class="px-4 py-2 rounded-lg border transition-colors"
          >
            {{ page }}
          </button>

          <!-- 下一页 -->
          <button
            @click="changePage(currentPage + 1)"
            :disabled="currentPage === totalPages"
            :class="currentPage === totalPages ? 
              'bg-gray-100 text-gray-400 cursor-not-allowed' : 
              'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'"
            class="px-4 py-2 rounded-lg transition-colors"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  `
}

const compiledComponent = compileComponent(PlayListPage)

export default compiledComponent
