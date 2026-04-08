// API 基础 URL
const BASE_URL = '/api'

// 通用请求函数
export async function request<T>(url: string, params?: Record<string, any>): Promise<T> {
  const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
  const response = await fetch(`${BASE_URL}${url}${queryString}`)
  if (!response.ok) {
    throw new Error('Network response was not ok')
  }
  return await response.json()
}

// 搜索接口
export async function search(keywords: string, type: number = 1, limit: number = 30, offset: number = 0) {
  return request<{
    code: number
    result: {
      songs: any[]
      albums: any[]
      artists: any[]
      playlists: any[]
      mvs: any[]
      videos: any[]
      users: any[]
      djRadios: any[]
      lyrics: any[]
    }
  }>('/search', {
    keywords,
    type,
    limit,
    offset
  })
}

// 歌曲详情接口
export async function getSongDetail(ids: string) {
  return request<{
    code: number
    songs: any[]
    privileges: any[]
  }>('/song/detail', {
    ids
  })
}

// 歌曲链接接口
export async function getSongUrl(id: string, br: number = 999000) {
  return request<{
    code: number
    data: any[]
  }>('/song/url', {
    id,
    br
  })
}

// 歌单详情接口
export async function getPlaylistDetail(id: string, s: number = 8) {
  return request<{
    code: number
    playlist: any
  }>('/playlist/detail', {
    id,
    s
  })
}



// 歌词接口
export async function getLyric(id: string) {
  return request<{
    code: number
    lrc: {
      lyric: string
    }
    tlyric: {
      lyric: string
    }
  }>('/lyric', {
    id
  })
}

// 新专辑接口
export async function getNewAlbum(area: string = 'ALL', limit: number = 10) {
  return request<{
    code: number
    albums: any[]
  }>('/album/new', {
    area,
    limit
  })
}

// 专辑详情接口
export async function getAlbum(id: string) {
  return request<{
    code: number
    album: any
  }>('/album', {
    id
  })
}

// 艺术家详情接口
export async function getArtistDetail(id: string) {
  return request<{
    code: number
    data: any
  }>('/artist/detail', {
    id
  })
}

// 艺术家歌曲接口
export async function getArtistSongs(id: string, limit: number = 30, offset: number = 0) {
  return request<{
    code: number
    songs: any[]
  }>('/artist/songs', {
    id,
    limit,
    offset
  })
}

// 艺术家专辑接口
export async function getArtistAlbum(id: string, limit: number = 30, offset: number = 0) {
  return request<{
    code: number
    hotAlbums: any[]
  }>('/artist/album', {
    id,
    limit,
    offset
  })
}



