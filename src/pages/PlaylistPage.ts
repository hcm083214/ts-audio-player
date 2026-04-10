import { h, compileComponent, ref, onMounted } from '../core'
import PlaylistCardComponent from '../components/common/PlaylistCardComponent'
import PaginationComponent from '../components/common/PaginationComponent'
import { getSongCategories, getTopPlaylist, type SongCategory } from '../api/HomeApi'

interface CategoryGroup {
  name: string
  icon: string
  categories: string[]
}

// 分类图标映射
const categoryIcons: Record<string, string> = {
  '语种': 'icon-globe',
  '风格': 'icon-music',
  '场景': 'icon-coffee',
  '情感': 'icon-smile',
  '主题': 'icon-music-note'
}

/**
 * 将 API 返回的分类数据转换为分组格式
 * @param categories - API 返回的 sub 数组
 * @param categoriesMap - API 返回的 categories 映射对象
 * @returns 分组后的分类数据
 */
function getCategoryGroups(categories: SongCategory[], categoriesMap: Record<string, string>): CategoryGroup[] {
  const groups: Record<string, string[]> = {}
  
  // 按 category 字段分组
  categories.forEach(cat => {
    const groupName = categoriesMap[String(cat.category)]
    if (groupName && !groups[groupName]) {
      groups[groupName] = []
    }
    if (groupName) {
      groups[groupName].push(cat.name)
    }
  })
  
  // 转换为数组格式并添加图标
  return Object.entries(groups).map(([name, cats]) => ({
    name,
    icon: categoryIcons[name] || 'icon-music',
    categories: cats
  }))
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

    // 分类分组配置（从 API 动态生成）
    const categoryGroups = ref<CategoryGroup[]>([])

    // 加载所有分类
    onMounted(async () => {
      try {
        const result = await getSongCategories()
        allCategories.value = result.sub || []
        // 动态生成分组配置
        categoryGroups.value = getCategoryGroups(result.sub, result.categories)
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

    const changeCategoryDropdown = () => {
      showCategoryDropdown.value = !showCategoryDropdown.value
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
      updateTotalPages,
      changeCategoryDropdown
    }
  },
  components: { PlaylistCardComponent, PaginationComponent },
  template: `
    <div class="min-h-screen bg-gray-50 pb-20">
      <!-- 顶部导航栏 -->
      <div class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div class="container mx-auto px-4 py-3">
          <div class="flex items-center justify-between">
            <!-- 左侧：分类选择 -->
            <div class="relative">
              <button
                @click="changeCategoryDropdown"
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
        <PaginationComponent
          :currentPage="currentPage"
          :totalPages="totalPages"
          :onPageChange="changePage"
        />
      </div>
    </div>
  `
}

const compiledComponent = compileComponent(PlayListPage)

export default compiledComponent
