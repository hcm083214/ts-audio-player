import { h, compileComponent, ref } from '../../core'
import type { SongCategory } from '../../api/HomeApi'
import { useRouter } from '../../router'

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

const PlaylistBannerComponent = {
    props: ['currentCategory',  'categoryGroups'],
    emits: ['selectCategory'],
    setup(props: any, context: any) {
        const { emit } = context
        const showCategoryDropdown = ref(false)
        // 切换分类下拉菜单
        function handleChangeCategoryDropdown() {
            showCategoryDropdown.value = !showCategoryDropdown.value
        }

        // 选择分类
        function handleSelectCategory(cat: string) {
            emit('selectCategory', cat)
            showCategoryDropdown.value = false
        }

        function handleGoHomePage(){
          const router = useRouter()
          router.push('/')
        }

        return {
            showCategoryDropdown,
            handleChangeCategoryDropdown,
            handleSelectCategory,
            handleGoHomePage
        }
    },
    template: `
    <!-- 顶部导航栏 -->
    <div class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div class="container mx-auto px-4 py-3">
        <div class="flex items-center justify-between">
          <!-- 左侧：分类选择 -->
          <div class="relative">
            <button
              @click="handleChangeCategoryDropdown"
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
                @click="handleSelectCategory('全部')"
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
                        @click="handleSelectCategory(cat)"
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
            <button @click="handleGoHomePage" class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
              首页
            </button>
          </div>
        </div>
      </div>
    </div>
  `
}

const compiledComponent = compileComponent(PlaylistBannerComponent)

export default compiledComponent
