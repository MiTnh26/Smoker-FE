/**
 * Utility functions để nhận diện và xử lý links trong text
 */

/**
 * Regex pattern để detect URLs
 * Hỗ trợ: http://, https://, www., và các domain phổ biến
 */
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/gi;

/**
 * Kiểm tra xem một string có phải là URL hợp lệ không
 */
export function isValidUrl(string) {
  try {
    const url = string.startsWith('http') ? string : `https://${string}`;
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Convert text thành URL đầy đủ (thêm https:// nếu cần)
 */
export function normalizeUrl(url) {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('www.')) {
    return `https://${url}`;
  }
  return `https://${url}`;
}

/**
 * Parse text và convert URLs thành clickable links
 * Trả về array các objects: { type: 'text' | 'link', content: string, url?: string }
 */
export function parseTextWithLinks(text) {
  if (!text) return [];
  
  const parts = [];
  let lastIndex = 0;
  let match;
  
  // Reset regex lastIndex
  URL_REGEX.lastIndex = 0;
  
  while ((match = URL_REGEX.exec(text)) !== null) {
    // Thêm text trước link
    if (match.index > lastIndex) {
      const textBefore = text.substring(lastIndex, match.index);
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
    }
    
    // Thêm link
    const url = match[0];
    if (isValidUrl(url)) {
      parts.push({
        type: 'link',
        content: url,
        url: normalizeUrl(url)
      });
    } else {
      // Nếu không phải URL hợp lệ, giữ nguyên như text
      parts.push({ type: 'text', content: url });
    }
    
    lastIndex = match.index + url.length;
  }
  
  // Thêm phần text còn lại
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      parts.push({ type: 'text', content: remainingText });
    }
  }
  
  // Nếu không có link nào, trả về toàn bộ text
  if (parts.length === 0) {
    parts.push({ type: 'text', content: text });
  }
  
  return parts;
}

/**
 * Render text với links thành React elements
 */
export function renderTextWithLinks(text, maxLength = null) {
  const parts = parseTextWithLinks(text);
  
  if (maxLength && text.length > maxLength) {
    // Nếu cần truncate, chỉ lấy phần đầu
    let currentLength = 0;
    const truncatedParts = [];
    
    for (const part of parts) {
      if (currentLength + part.content.length <= maxLength) {
        truncatedParts.push(part);
        currentLength += part.content.length;
      } else {
        // Cắt phần cuối cùng nếu cần
        const remaining = maxLength - currentLength;
        if (remaining > 0 && part.type === 'text') {
          truncatedParts.push({
            ...part,
            content: part.content.substring(0, remaining)
          });
        }
        break;
      }
    }
    
    return truncatedParts;
  }
  
  return parts;
}


