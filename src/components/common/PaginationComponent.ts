import { h, compileComponent } from '../../core'

interface PaginationProps {
  currentPage: number
  totalPages: number
}

const PaginationComponent = {
  setup(props: PaginationProps,{ emit }){
    const currentPage = props.currentPage
    const totalPages = props.totalPages
    const handlePageChange = (page: number) => {
      emit('onPageChange', page)  
    }
    return { currentPage, totalPages, handlePageChange}
  },
  props: ['currentPage', 'totalPages'],
  emits: ['onPageChange'],
  template: `
    <div class="flex justify-center items-center gap-2 mt-12 mb-8">
      <!-- 上一页 -->
      <button
        @click="handlePageChange(currentPage - 1)"
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
        @click="handlePageChange(page)"
        :class="currentPage === page ? 
          'bg-primary text-white border-primary' : 
          'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'"
        class="px-4 py-2 rounded-lg border transition-colors"
      >
        {{ page }}
      </button>

      <!-- 下一页 -->
      <button
        @click="handlePageChange(currentPage + 1)"
        :disabled="currentPage === totalPages"
        :class="currentPage === totalPages ? 
          'bg-gray-100 text-gray-400 cursor-not-allowed' : 
          'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'"
        class="px-4 py-2 rounded-lg transition-colors"
      >
        下一页
      </button>
    </div>
  `
}

const compiledComponent = compileComponent(PaginationComponent)

export default compiledComponent
