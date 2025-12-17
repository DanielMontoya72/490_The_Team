// Lighthouse Runtime Optimizations
// This module provides runtime optimizations to improve Lighthouse scores

/**
 * Font Display Optimization
 * Injects font-display: swap into Adobe TypeKit and other web fonts
 */
export function optimizeFontDisplay() {
  // Wait for fonts to load, then inject font-display swap
  if (typeof window !== 'undefined') {
    const injectFontDisplaySwap = () => {
      const style = document.createElement('style');
      style.textContent = `
        /* Force font-display swap on TypeKit fonts */
        @font-face {
          font-family: 'proxima-nova';
          font-display: swap !important;
        }
        
        @font-face {
          font-family: 'source-sans-pro'; 
          font-display: swap !important;
        }
        
        /* Override all loaded fonts to use swap */
        .tk-proxima-nova,
        .tk-source-sans-pro,
        .tk-adobe-clean,
        .tk-source-code-pro {
          font-display: swap !important;
        }
      `;
      document.head.appendChild(style);
    };

    // Inject immediately and after fonts load
    injectFontDisplaySwap();
    
    if (document.fonts) {
      document.fonts.ready.then(injectFontDisplaySwap);
    }
    
    // Fallback timer
    setTimeout(injectFontDisplaySwap, 1000);
  }
}

/**
 * Image Lazy Loading Optimization
 * Improves image loading performance
 */
export function optimizeImageLoading() {
  if (typeof window !== 'undefined') {
    // Add loading states for images
    const images = document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]');
    images.forEach((img) => {
      if (!img.complete) {
        img.addEventListener('load', () => {
          img.style.opacity = '1';
        });
      }
    });
  }
}

/**
 * Performance Observer for Core Web Vitals
 */
export function initializePerformanceMonitoring() {
  if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
    try {
      // Monitor LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.startTime);
      });
      
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      
      // Monitor FID
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const eventEntry = entry as PerformanceEventTiming;
          console.log('FID:', eventEntry.processingStart - entry.startTime);
        });
      });
      
      fidObserver.observe({ type: 'first-input', buffered: true });
      
    } catch (error) {
      console.log('Performance monitoring not supported');
    }
  }
}

/**
 * Initialize all optimizations
 */
export function initializeLighthouseOptimizations() {
  optimizeFontDisplay();
  optimizeImageLoading();
  initializePerformanceMonitoring();
}