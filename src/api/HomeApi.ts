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

// 歌单（网友精选碟）接口
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