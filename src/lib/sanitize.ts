import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Uses DOMPurify to remove dangerous HTML elements and attributes
 */
export const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
    ALLOW_DATA_ATTR: false,
  });
};

/**
 * Escape text to prevent XSS when inserting into HTML
 * Converts special characters to HTML entities
 */
export const escapeText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Sanitize URL to prevent javascript: and data: protocol attacks
 */
export const sanitizeUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
    return '';
  }
  return url;
};

/**
 * Sanitize user input for display - removes HTML tags completely
 */
export const stripHtml = (html: string): string => {
  if (!html) return '';
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
};

/**
 * Validate and sanitize email address
 */
export const sanitizeEmail = (email: string): string => {
  if (!email) return '';
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) ? trimmed : '';
};

/**
 * Sanitize filename to prevent path traversal attacks
 */
export const sanitizeFilename = (filename: string): string => {
  if (!filename) return '';
  return filename
    .replace(/\.\./g, '')
    .replace(/[/\\:*?"<>|]/g, '_')
    .trim();
};
