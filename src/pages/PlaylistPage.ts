import { h, compileComponent, ref, onMounted, computed } from '../core'
import PlaylistCardComponent from '../components/common/PlaylistCardComponent'
import PaginationComponent from '../components/common/PaginationComponent'
import PlaylistBannerComponent from '../components/playlist/PlaylistBannerComponent'
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
    async function loadPlaylists(page: number = 1,pageSize: number = 32) {
      try {
        loading.value = true
        const offset = (page - 1) * pageSize
        const res = await getTopPlaylist(currentCategory.value, 'hot', pageSize, offset)
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
      loadPlaylists(1)
    }

    // 切换分页
    function changePage(page: number) {
      if (page < 1 || page > totalPages.value) return
      currentPage.value = page
      loadPlaylists(page)
    }

    function handlePageSizeChange(size: number) {
      pageSize.value = size
      loadPlaylists(currentPage.value,size)
    }

    // 计算总页数
    const totalPages = computed(() => Math.ceil(total.value / pageSize.value))


    return {
      allCategories,
      currentCategory,
      playlists,
      total,
      currentPage,
      pageSize,
      loading,
      categoryGroups,
      selectCategory,
      changePage,
      totalPages,
      handlePageSizeChange
    }
  },
  components: { PlaylistCardComponent, PaginationComponent, PlaylistBannerComponent },
  template: `
    <div class="min-h-screen bg-gray-50 pb-20">
      <!-- 顶部导航栏组件 -->
      <PlaylistBannerComponent
        :current-category="currentCategory"
        :category-groups="categoryGroups"
        @select-category="selectCategory"
      />

      <!-- 歌单列表 -->
      <div class="w-[1080px] mx-auto px-4 py-6">
        <div>
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
        </div>
        <!-- 分页组件 -->
        <PaginationComponent
          :current-page="currentPage"
          :total-pages="totalPages"
          :page-sizes="[8, 16, 24, 40, 80]"
          @page-change="changePage"
          @page-size-change="handlePageSizeChange"
        />
      </div>
    </div>
  `
}

const compiledComponent = compileComponent(PlayListPage)

export default compiledComponent
