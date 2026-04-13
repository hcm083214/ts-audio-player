import { h, compileComponent } from '../../core'

interface PaginationProps {
  currentPage: number
  totalPages: number
  pageSize?: number
  pageSizes?: number[]
}

const PaginationComponent = {
  setup(props: PaginationProps, { emit }: any){
    // 🔥 默认每页显示条数选项
    const defaultPageSizes = [10, 20, 50, 100]
    
    // 🔥 获取当前每页显示条数
    const currentPageSize = () => {
      return props.pageSize || defaultPageSizes[0]
    }
    
    // 🔥 获取可用的每页显示条数数组
    const availablePageSizes = () => {
      return props.pageSizes || defaultPageSizes
    }
    
    // 🔥 生成智能页码数组，包含省略号逻辑
    const pageNumbers = () => {
      const pages: (number | string)[] = []
      const current = props.currentPage
      const total = props.totalPages
      
      // 显示最多 7 个页码按钮（不包括省略号）
      const maxVisible = 7
      
      if (total <= maxVisible) {
        // 总页数少于最大显示数，显示所有页码
        for (let i = 1; i <= total; i++) {
          pages.push(i)
        }
      } else {
        // 总页数较多，需要省略
        pages.push(1) // 始终显示第一页
        
        if (current > 4) {
          pages.push('...') // 左侧省略号
        }
        
        // 计算中间页码范围
        let start = Math.max(2, current - 2)
        let end = Math.min(total - 1, current + 2)
        
        // 调整范围以确保显示足够的页码
        if (current <= 4) {
          end = Math.min(total - 1, maxVisible - 1)
        }
        if (current >= total - 3) {
          start = Math.max(2, total - maxVisible + 2)
        }
        
        for (let i = start; i <= end; i++) {
          pages.push(i)
        }
        
        if (current < total - 3) {
          pages.push('...') // 右侧省略号
        }
        
        pages.push(total) // 始终显示最后一页
      }
      
      return pages
    }
    
    const handlePageChange = (page: number | string) => {
      if (typeof page === 'number') {
        emit('pageChange', page)
      }
    }
    
    // 🔥 处理每页显示条数变化
    const handlePageSizeChange = (event: Event) => {
      const target = event.target as HTMLSelectElement
      const newPageSize = Number(target.value)
      emit('pageSizeChange', newPageSize)
    }
    
    // 🔥 关键修复：直接返回 props 对象，不要解构 props 的值
    // 这样模板通过 props.currentPage 访问，保持响应式
    return { 
      props,
      pageNumbers,
      handlePageChange,
      handlePageSizeChange,
      currentPageSize,
      availablePageSizes
    }
  },
  props: ['currentPage', 'totalPages', 'pageSize', 'pageSizes'],
  emits: ['pageChange', 'pageSizeChange'],
  template: `
    <div class="flex flex-col items-center gap-4 mt-12 mb-8">
      <!-- 分页控制区 -->
      <div class="flex justify-center items-center gap-2">
        <!-- 上一页 -->
        <button
          @click="handlePageChange(props.currentPage - 1)"
          :disabled="props.currentPage === 1"
          :class="props.currentPage === 1 ? 
            'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 
            'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'"
          class="px-3 py-1.5 rounded text-sm border transition-colors"
        >
          < 上一页
        </button>

        <!-- 页码 -->
        <div class="flex items-center space-x-2">
          <div v-for="page in pageNumbers()" :key="page">
            <!-- 省略号 -->
            <span
              v-if="page === '...'"
              class="px-2 py-1.5 text-gray-500 text-sm"
            >
              ...
            </span>
            <!-- 页码按钮 -->
            <button
              v-else
              @click="handlePageChange(page)"
              :class="props.currentPage === page ? 
                'bg-primary text-white border-primary' : 
                'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'"
              class="min-w-[32px] px-2 py-1.5 rounded text-sm border transition-colors"
            >
              {{ page }}
            </button>
          </div>
        </div>

        <!-- 下一页 -->
        <button
          @click="handlePageChange(props.currentPage + 1)"
          :disabled="props.currentPage === props.totalPages"
          :class="props.currentPage === props.totalPages ? 
            'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 
            'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'"
          class="px-3 py-1.5 rounded text-sm border transition-colors"
        >
          下一页 >
        </button>
        <!-- 每页显示条数选择器 -->
        <div class="flex items-center gap-2 text-sm text-gray-600">
          <span>每页显示</span>
          <select
            @change="handlePageSizeChange"
            :value="currentPageSize()"
            class="px-2 py-1 border border-gray-300 rounded text-sm bg-white hover:border-gray-400 focus:outline-none focus:border-primary transition-colors"
          >
            <option 
              v-for="size in availablePageSizes()" 
              :key="size" 
              :value="size"
            >
              {{ size }}
            </option>
          </select>
          <span>条</span>
        </div>
      </div>
      

    </div>
  `
}

const compiledComponent = compileComponent(PaginationComponent)

export default compiledComponent
