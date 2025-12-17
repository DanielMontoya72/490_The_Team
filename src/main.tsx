import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./styles/lighthouse-optimizations.css";
import "./styles/performance-optimizations.css";
import { initSentry } from "./lib/sentry";
import { initPerformanceMonitoring } from "./lib/performanceMonitor";
import ErrorBoundary from "./components/monitoring/ErrorBoundary";
import { validateEnvironment, getEnvironmentSummary, config } from "./config";
import { logger } from "./lib/logger";

// Validate environment configuration
const envValidation = validateEnvironment();
if (!envValidation.valid) {
  console.error('Environment validation failed:', envValidation.errors);
  // In development, show errors but continue
  // In production, this would typically be caught during build
}

// Log environment summary (safe info only)
if (config.isDevelopment) {
  logger.info('Application starting', { 
    component: 'main',
    ...getEnvironmentSummary() 
  });
}

// Initialize Sentry error tracking
initSentry();

// Initialize performance monitoring (Web Vitals)
initPerformanceMonitoring();

// Initialize Lighthouse font optimization
if (typeof window !== 'undefined') {
  const optimizeFonts = () => {
    // Remove any existing font optimization styles to prevent duplicates
    const existingStyle = document.getElementById('font-display-optimization');
    if (existingStyle) existingStyle.remove();
    
    const style = document.createElement('style');
    style.id = 'font-display-optimization';
    style.textContent = `
      /* Force font-display: swap on all TypeKit fonts */
      @font-face { font-display: swap !important; }
      .tk-proxima-nova, 
      .tk-source-sans-pro, 
      .tk-adobe-clean,
      .tk-source-code-pro,
      [class*="tk-"],
      [style*="font-family"][style*="proxima-nova"],
      [style*="font-family"][style*="source-sans-pro"] { 
        font-display: swap !important; 
      }
      /* Apply to dynamically loaded TypeKit fonts */
      .typekit-loaded * { font-display: swap !important; }
    `;
    document.head.appendChild(style);
    
    // Also apply to any existing font faces
    if (document.fonts) {
      document.fonts.forEach((font) => {
        if (font.family.includes('proxima') || font.family.includes('source')) {
          // Force re-render with swap
          font.display = 'swap';
        }
      });
    }
  };
  
  // Apply immediately
  optimizeFonts();
  
  // Apply again when fonts are ready
  document.fonts?.ready.then(optimizeFonts);
  
  // Apply when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', optimizeFonts);
  }
  
  // Monitor for new TypeKit loading
  const observer = new MutationObserver(() => {
    if (document.querySelector('[class*="tk-"], .typekit-loaded')) {
      optimizeFonts();
    }
  });
  observer.observe(document.head, { childList: true, subtree: true });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
