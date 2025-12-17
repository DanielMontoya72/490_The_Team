import { useEffect, useRef } from 'react';
import { KEYBOARD_KEYS, trapFocus, focusFirstFocusableElement, focusLastFocusableElement, generateId } from '@/utils/accessibility';

/**
 * Custom hooks for accessibility features
 */

// Hook for managing focus within a modal/dialog
export const useFocusTrap = (isActive: boolean = true) => {
  const containerRef = useRef<HTMLElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store previously focused element
    previousActiveElement.current = document.activeElement;

    // Focus first focusable element in container
    const firstFocused = focusFirstFocusableElement(containerRef.current);
    if (!firstFocused && containerRef.current.tabIndex === -1) {
      containerRef.current.tabIndex = -1;
      containerRef.current.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current) return;
      trapFocus(containerRef.current, event);

      // Close on Escape key
      if (event.key === KEYBOARD_KEYS.ESCAPE) {
        const escapeEvent = new CustomEvent('escape', { detail: event });
        containerRef.current.dispatchEvent(escapeEvent);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Restore focus to previously active element
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
};

// Hook for keyboard navigation in lists/grids
export const useKeyboardNavigation = (
  itemCount: number,
  orientation: 'horizontal' | 'vertical' | 'grid' = 'vertical',
  columnsCount?: number
) => {
  const containerRef = useRef<HTMLElement>(null);
  const currentIndex = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current) return;

      let newIndex = currentIndex.current;
      let handled = false;

      switch (event.key) {
        case KEYBOARD_KEYS.ARROW_DOWN:
          if (orientation === 'vertical' || orientation === 'grid') {
            newIndex = orientation === 'grid' && columnsCount
              ? Math.min(itemCount - 1, currentIndex.current + columnsCount)
              : Math.min(itemCount - 1, currentIndex.current + 1);
            handled = true;
          }
          break;

        case KEYBOARD_KEYS.ARROW_UP:
          if (orientation === 'vertical' || orientation === 'grid') {
            newIndex = orientation === 'grid' && columnsCount
              ? Math.max(0, currentIndex.current - columnsCount)
              : Math.max(0, currentIndex.current - 1);
            handled = true;
          }
          break;

        case KEYBOARD_KEYS.ARROW_LEFT:
          if (orientation === 'horizontal' || orientation === 'grid') {
            newIndex = Math.max(0, currentIndex.current - 1);
            handled = true;
          }
          break;

        case KEYBOARD_KEYS.ARROW_RIGHT:
          if (orientation === 'horizontal' || orientation === 'grid') {
            newIndex = Math.min(itemCount - 1, currentIndex.current + 1);
            handled = true;
          }
          break;

        case KEYBOARD_KEYS.HOME:
          newIndex = 0;
          handled = true;
          break;

        case KEYBOARD_KEYS.END:
          newIndex = itemCount - 1;
          handled = true;
          break;
      }

      if (handled) {
        event.preventDefault();
        currentIndex.current = newIndex;
        
        // Focus the appropriate item
        const items = containerRef.current.querySelectorAll('[role="option"], [role="gridcell"], [role="tab"], button, a[href]');
        const targetItem = items[newIndex] as HTMLElement;
        if (targetItem) {
          targetItem.focus();
        }
      }
    };

    containerRef.current.addEventListener('keydown', handleKeyDown);
    
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [itemCount, orientation, columnsCount]);

  return containerRef;
};

// Hook for generating stable IDs
export const useId = (prefix?: string): string => {
  const idRef = useRef<string | null>(null);
  
  if (!idRef.current) {
    idRef.current = generateId(prefix);
  }
  
  return idRef.current;
};

// Hook for announcing changes to screen readers
export const useAnnouncer = () => {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const region = document.createElement('div');
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    region.textContent = message;
    
    document.body.appendChild(region);
    
    setTimeout(() => {
      if (document.body.contains(region)) {
        document.body.removeChild(region);
      }
    }, 1000);
  };

  return { announce };
};

// Hook for managing roving tabindex in component groups
export const useRovingTabIndex = (itemsCount: number) => {
  const activeIndex = useRef(0);
  const itemRefs = useRef<(HTMLElement | null)[]>(new Array(itemsCount).fill(null));

  const setItemRef = (index: number) => (element: HTMLElement | null) => {
    itemRefs.current[index] = element;
  };

  const getItemProps = (index: number) => ({
    tabIndex: activeIndex.current === index ? 0 : -1,
    ref: setItemRef(index),
    onFocus: () => {
      activeIndex.current = index;
      // Update tabIndex of all items
      itemRefs.current.forEach((item, i) => {
        if (item) {
          item.tabIndex = i === index ? 0 : -1;
        }
      });
    },
  });

  return { getItemProps, activeIndex: activeIndex.current };
};

// Hook for form validation announcements
export const useFormValidation = () => {
  const announceError = (fieldName: string, errorMessage: string) => {
    const message = `${fieldName}: ${errorMessage}`;
    const region = document.createElement('div');
    region.setAttribute('aria-live', 'assertive');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    region.textContent = message;
    
    document.body.appendChild(region);
    
    setTimeout(() => {
      if (document.body.contains(region)) {
        document.body.removeChild(region);
      }
    }, 3000);
  };

  const announceSuccess = (message: string) => {
    const region = document.createElement('div');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    region.textContent = message;
    
    document.body.appendChild(region);
    
    setTimeout(() => {
      if (document.body.contains(region)) {
        document.body.removeChild(region);
      }
    }, 2000);
  };

  return { announceError, announceSuccess };
};

export default {
  useFocusTrap,
  useKeyboardNavigation,
  useId,
  useAnnouncer,
  useRovingTabIndex,
  useFormValidation,
};