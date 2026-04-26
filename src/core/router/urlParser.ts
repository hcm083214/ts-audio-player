/**
 * URL 解析工具 - 提取 path、query、hash
 * 
 * 参照 Vue Router 4 设计
 */

/**
 * 解析 URL，提取 path、query、hash
 * @param url URL 字符串
 * @returns 解析结果对象
 */
export function parseURL(url: string): { path: string; query: Record<string, string>; hash: string } {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  
  let path = url;
  let queryStr = '';
  let hash = '';
  
  if (hashIndex !== -1) {
    path = url.substring(0, hashIndex);
    hash = url.substring(hashIndex);
  }
  
  if (queryIndex !== -1 && (hashIndex === -1 || queryIndex < hashIndex)) {
    const queryEnd = hashIndex !== -1 ? hashIndex : url.length;
    path = url.substring(0, queryIndex);
    queryStr = url.substring(queryIndex + 1, queryEnd);
  }
  
  // 解析 query 参数
  const query: Record<string, string> = {};
  if (queryStr) {
    queryStr.split('&').forEach(param => {
      const [key, value] = param.split('=');
      if (key) {
        query[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
      }
    });
  }
  
  return { path, query, hash };
}

/**
 * 标准化导航目标为路径字符串
 * @param to 导航目标（字符串或对象）
 * @returns 标准化后的路径字符串
 */
export function normalizeTo(to: string | { path: string; query?: Record<string, any>; params?: Record<string, any> }): string {
  if (typeof to === 'string') {
    return to;
  }
  
  let path = to.path;
  
  // 添加 query 参数
  if (to.query && Object.keys(to.query).length > 0) {
    const queryString = Object.entries(to.query)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    path += `?${queryString}`;
  }
  
  // TODO: 处理 params（需要动态路由支持）
  
  return path;
}
