import { describe, it, expect } from 'vitest';
import { sanitizeHtml, escapeText, sanitizeUrl, stripHtml, sanitizeEmail, sanitizeFilename } from '@/lib/sanitize';

describe('Security - XSS Prevention', () => {
  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const malicious = '<script>alert("XSS")</script><p>Safe content</p>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Safe content</p>');
    });

    it('should remove event handlers', () => {
      const malicious = '<img src="x" onerror="alert(\'XSS\')" />';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('onerror');
    });

    it('should remove javascript: URLs', () => {
      const malicious = '<a href="javascript:alert(\'XSS\')">Click me</a>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('javascript:');
    });

    it('should allow safe HTML tags', () => {
      const safe = '<p><strong>Bold</strong> and <em>italic</em></p>';
      const result = sanitizeHtml(safe);
      expect(result).toBe(safe);
    });

    it('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as any)).toBe('');
      expect(sanitizeHtml(undefined as any)).toBe('');
    });

    it('should remove data attributes', () => {
      const malicious = '<div data-evil="payload">Content</div>';
      const result = sanitizeHtml(malicious);
      expect(result).not.toContain('data-evil');
    });
  });

  describe('escapeText', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const result = escapeText(input);
      expect(result).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    it('should escape ampersands', () => {
      const input = 'Tom & Jerry';
      const result = escapeText(input);
      expect(result).toBe('Tom &amp; Jerry');
    });

    it('should escape quotes', () => {
      const input = "It's a \"test\"";
      const result = escapeText(input);
      expect(result).toBe('It&#039;s a &quot;test&quot;');
    });

    it('should handle empty input', () => {
      expect(escapeText('')).toBe('');
      expect(escapeText(null as any)).toBe('');
    });
  });

  describe('sanitizeUrl', () => {
    it('should block javascript: protocol', () => {
      expect(sanitizeUrl('javascript:alert("XSS")')).toBe('');
      expect(sanitizeUrl('JAVASCRIPT:alert("XSS")')).toBe('');
      expect(sanitizeUrl('  javascript:alert("XSS")  ')).toBe('');
    });

    it('should block data: protocol', () => {
      expect(sanitizeUrl('data:text/html,<script>alert("XSS")</script>')).toBe('');
    });

    it('should block vbscript: protocol', () => {
      expect(sanitizeUrl('vbscript:msgbox("XSS")')).toBe('');
    });

    it('should allow safe URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('http://example.com/path?query=1')).toBe('http://example.com/path?query=1');
      expect(sanitizeUrl('/relative/path')).toBe('/relative/path');
    });

    it('should handle empty input', () => {
      expect(sanitizeUrl('')).toBe('');
      expect(sanitizeUrl(null as any)).toBe('');
    });
  });

  describe('stripHtml', () => {
    it('should remove all HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      expect(stripHtml(input)).toBe('Hello World');
    });

    it('should handle nested tags', () => {
      const input = '<div><p><span>Nested</span></p></div>';
      expect(stripHtml(input)).toBe('Nested');
    });

    it('should handle script tags', () => {
      const input = '<script>alert("XSS")</script>Safe text';
      expect(stripHtml(input)).toBe('Safe text');
    });
  });

  describe('sanitizeEmail', () => {
    it('should accept valid emails', () => {
      expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
      expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com');
    });

    it('should reject invalid emails', () => {
      expect(sanitizeEmail('not-an-email')).toBe('');
      expect(sanitizeEmail('user@')).toBe('');
      expect(sanitizeEmail('@example.com')).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeEmail('  user@example.com  ')).toBe('user@example.com');
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove path traversal attempts', () => {
      // The sanitizeFilename function replaces path separators with underscores
      const result1 = sanitizeFilename('../../../etc/passwd');
      const result2 = sanitizeFilename('..\\..\\windows\\system32');
      // Verify no actual path traversal characters remain
      expect(result1).not.toContain('/');
      expect(result1).not.toContain('\\');
      expect(result2).not.toContain('/');
      expect(result2).not.toContain('\\');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeFilename('file<script>.txt')).toBe('file_script_.txt');
      expect(sanitizeFilename('file:name.txt')).toBe('file_name.txt');
    });

    it('should handle normal filenames', () => {
      expect(sanitizeFilename('resume_2024.pdf')).toBe('resume_2024.pdf');
      expect(sanitizeFilename('My Resume (Final).docx')).toBe('My Resume (Final).docx');
    });
  });
});

describe('Security - Input Validation', () => {
  it('should handle extremely long inputs', () => {
    const longInput = 'a'.repeat(100000);
    const result = escapeText(longInput);
    expect(result.length).toBe(100000);
  });

  it('should handle unicode characters', () => {
    const unicode = '<script>alert("🔥💀")</script>';
    const result = sanitizeHtml(unicode);
    expect(result).not.toContain('<script>');
  });

  it('should handle null bytes', () => {
    const nullByte = 'normal\x00text';
    const result = escapeText(nullByte);
    expect(result).toBe('normal\x00text');
  });
});
