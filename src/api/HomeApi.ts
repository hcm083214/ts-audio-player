import { request } from "./index";


export interface PlaylistDetail {
    id: number
    type: number
    name: string
    copywriter: string
    picUrl: string
    canDislike: boolean
    trackNumberUpdateTime: number
    trackCount: number
    playCount: number
    highQuality: boolean
    alg: string
}
/**
 * @description: 获取推荐歌单
 * @param {number} limit
 * @return {Promise<{ code: number; result: PlaylistDetail[] }>}
 */
export async function getPersonalized(limit: number = 30) {
    return request<{
        code: number
        result: PlaylistDetail[]
    }>('/personalized', {
        limit
    })
}

export interface SongDetail { 
}
/**
 * @description: 调用此接口 , 可获取新歌速递
 * @param {number} type
 * @return {*}
 */
export async function getTopSong(type: number = 0) {
    return request<{
        code: number
        data: any[]
    }>('/top/song', {
        type
    })
}

// 歌手推荐接口
export async function getTopArtists(offset: number = 0, limit: number = 50) {
    return request<{
        code: number
        artists: any[]
    }>('/top/artists', {
        offset,
        limit
    })
}

export interface SongCategory {
    name: string
    resourceCount: number
    imgId: number
    imgUrl: string
    type: number
    category: number
    resourceType: number
    hot: boolean
    activity: boolean
}
/**
 * @description:  获取歌单分类
 * @return {Promise<{ code: number; all: SongCategory; sub: SongCategory[] }>}
 */
export async function getSongCategories() {
    return request<{
        code: number
        all: SongCategory
        sub: SongCategory[]
        categories: Record<number, string>
    }>('/playlist/catlist')
}

/**
 * @description: 获取歌单详情
 * @param {number} id 歌单id
 * @param {number} s 歌单最近的s个收藏者，默认为8
 * @return {Promise<{ code: number; playlist: any; privileges: any[] }>}
 */
export async function getPlaylistDetail(id: number, s: number = 8) {
    return request<{
        code: number
        playlist: any
        privileges: any[]
    }>(`/playlist/detail`, {
        id,
        s
    })
}

/**
 * @description: 获取歌单所有歌曲
 * @param {number} id 歌单id
 * @param {number} limit 限制获取歌曲的数量，默认值为当前歌单的歌曲数量
 * @param {number} offset 偏移数量，用于分页
 * @return {Promise<{ code: number; songs: any[]; privileges: any[] }>}
 */
export async function getPlaylistAllTracks(id: number, limit?: number, offset: number = 0) {
    const params: any = { id, offset }
    if (limit !== undefined) {
        params.limit = limit
    }
    return request<{
        code: number
        songs: any[]
        privileges: any[]
    }>(`/playlist/track/all`, params)
}

// 歌单（网友精选碟）接口
/**
 * @description: 调用此接口 , 可获取网友精选碟歌单
 * @param {string} cat 比如 " 华语 "、" 古风 " 、" 欧美 "、" 流行 ", 默认为"全部",可从歌单分类接口获取(/playlist/catlist)
 * @param {*} order 可选值为 'new' 和 'hot', 分别对应最新和最热 , 默认为'hot'
 * @param {number} limit 取出歌单数量 , 默认为 50
 * @param {number} offset 偏移数量 , 用于分页 , 如 :(页数 - 1)*50, 其中 50 为 limit 的值
 * @return {*}
 */
export async function getTopPlaylist(cat: string = '全部', order: 'hot' | 'new' = 'hot', limit: number = 50, offset: number = 0) {
    return request<{
        code: number
        playlists: any[]
        total: number
        more: boolean
    }>('/top/playlist', {
        cat,
        order,
        limit,
        offset
    })
}