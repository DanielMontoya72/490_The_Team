import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { initSentry } from "./lib/sentry";
import { initPerformanceMonitoring } from "./lib/performanceMonitor";
import ErrorBoundary from "./components/monitoring/ErrorBoundary";

// Initialize Sentry error tracking
initSentry();

// Initialize performance monitoring (Web Vitals)
initPerformanceMonitoring();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
