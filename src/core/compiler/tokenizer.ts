/**
 * 词法分析器 - 将模板字符串转换为 token 数组
 */

import { parseProps } from './parser'

export interface Token {
  type: 'TAG_START' | 'TAG_END' | 'TEXT' | 'INTERPOLATION';
  value: string;
  props?: Record<string, unknown>;
  directives?: Record<string, string>;
}

/**
 * 词法分析：将模板字符串转换为 token 数组
 */
export function tokenize(template: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < template.length) {
    const char = template[i];
    if (char === '<') {
      if (template[i + 1] === '/') {
        // 使用捕获组准确提取结束标签名
        const match = template.slice(i).match(/^<\/(\w+)>/);
        if (match) {
          console.log('[Tokenize] 结束标签:', match[1], '完整匹配:', match[0]);
          tokens.push({ type: 'TAG_END', value: match[1] });
          i += match[0].length;
        } else {
          // 如果匹配失败，将当前字符视为普通文本
          console.log('[Tokenize] 结束标签匹配失败，当前位置:', i, '内容:', template.slice(i, i + 10));
          tokens.push({ type: 'TEXT', value: char });
          i++;
        }
      } else {
        // 使用 [\s\S] 替代 . 以匹配包括换行符在内的所有字符
        const match = template.slice(i).match(/^<(\w+)([\s\S]*?)>/);
        if (match) {
          const tagName = match[1]; // 直接从捕获组获取标签名
          const attrsStr = match[2] || ''; // 属性字符串（可能为空，包含换行符）
          const { props, directives } = parseProps(attrsStr);
          console.log('[Tokenize] 开始标签:', tagName, '属性:', props, '指令:', directives, '完整匹配:', match[0]);
          tokens.push({ type: 'TAG_START', value: tagName, props, directives });
          i += match[0].length;
        }
      }
    } else if (char === '{') {
      const match = template.slice(i).match(/^\{\{([^}]+)\}\}/);
      if (match) {
        const trimmedValue = match[1].trim();
        console.log('[Tokenize] 插值: 原始值="' + match[1] + '", 修剪后="' + trimmedValue + '"');
        tokens.push({ type: 'INTERPOLATION', value: trimmedValue });
        i += match[0].length;
      }
    } else {
      const match = template.slice(i).match(/^[^{<]+/);
      if (match) {
        console.log('[Tokenize] 文本:', match[0], '完整匹配:', match[0]);
        tokens.push({ type: 'TEXT', value: match[0] });
        i += match[0].length;
      }
    }
  }
  return tokens;
}