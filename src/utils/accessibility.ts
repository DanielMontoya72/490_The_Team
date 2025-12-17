/**
 * Accessibility utilities and helpers
 * WCAG 2.1 AA compliance utilities
 */

// Keyboard navigation constants
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

// ARIA live region announcements
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// Color contrast checker (WCAG AA requires 4.5:1 for normal text, 3:1 for large text)
export const checkColorContrast = (foreground: string, background: string): number => {
  const getLuminance = (color: string): number => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const [rs, gs, bs] = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

// Focus management utilities
export const focusFirstFocusableElement = (container: HTMLElement): boolean => {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
    return true;
  }
  return false;
};

export const focusLastFocusableElement = (container: HTMLElement): boolean => {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[focusableElements.length - 1].focus();
    return true;
  }
  return false;
};

export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[role="button"]:not([disabled])',
    '[role="link"]:not([disabled])',
  ];
  
  return Array.from(container.querySelectorAll(focusableSelectors.join(', ')))
    .filter((el): el is HTMLElement => el instanceof HTMLElement && el.tabIndex !== -1);
};

// Trap focus within a container (for modals, dropdowns)
export const trapFocus = (container: HTMLElement, event: KeyboardEvent): void => {
  if (event.key !== KEYBOARD_KEYS.TAB) return;
  
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return;
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  if (event.shiftKey) {
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
  } else {
    if (document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
};

// Generate unique IDs for form controls
let idCounter = 0;
export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}-${++idCounter}`;
};

// ARIA label helpers
export const getAriaLabel = (element: HTMLElement): string => {
  return element.getAttribute('aria-label') || 
         element.getAttribute('aria-labelledby') || 
         element.textContent || 
         'Interactive element';
};

// Skip links for keyboard navigation
export const createSkipLink = (targetId: string, text: string): HTMLElement => {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = text;
  skipLink.className = 'sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:p-4 focus:underline';
  
  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView();
    }
  });
  
  return skipLink;
};

// Validate ARIA attributes
export const validateAriaAttributes = (element: HTMLElement): string[] => {
  const errors: string[] = [];
  const ariaAttributes = Array.from(element.attributes)
    .filter(attr => attr.name.startsWith('aria-'));
  
  ariaAttributes.forEach(attr => {
    switch (attr.name) {
      case 'aria-labelledby':
      case 'aria-describedby':
        const ids = attr.value.split(' ');
        ids.forEach(id => {
          if (!document.getElementById(id.trim())) {
            errors.push(`Referenced element with id "${id}" does not exist`);
          }
        });
        break;
        
      case 'aria-expanded':
        if (!['true', 'false'].includes(attr.value)) {
          errors.push(`aria-expanded must be "true" or "false", got "${attr.value}"`);
        }
        break;
        
      case 'aria-hidden':
        if (!['true', 'false'].includes(attr.value)) {
          errors.push(`aria-hidden must be "true" or "false", got "${attr.value}"`);
        }
        break;
    }
  });
  
  return errors;
};

// Screen reader utilities
export const hideFromScreenReader = (element: HTMLElement): void => {
  element.setAttribute('aria-hidden', 'true');
};

export const showToScreenReader = (element: HTMLElement): void => {
  element.removeAttribute('aria-hidden');
};

// High contrast mode detection
export const isHighContrastMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: high)').matches;
};

// Reduced motion detection
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export default {
  KEYBOARD_KEYS,
  announceToScreenReader,
  checkColorContrast,
  focusFirstFocusableElement,
  focusLastFocusableElement,
  getFocusableElements,
  trapFocus,
  generateId,
  getAriaLabel,
  createSkipLink,
  validateAriaAttributes,
  hideFromScreenReader,
  showToScreenReader,
  isHighContrastMode,
  prefersReducedMotion,
};