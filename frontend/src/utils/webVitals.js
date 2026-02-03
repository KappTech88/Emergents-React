/**
 * Web Vitals Performance Monitoring
 *
 * Tracks Core Web Vitals metrics for performance monitoring:
 * - LCP (Largest Contentful Paint): Loading performance
 * - FID (First Input Delay): Interactivity
 * - CLS (Cumulative Layout Shift): Visual stability
 * - FCP (First Contentful Paint): Initial render
 * - TTFB (Time to First Byte): Server response time
 */

// Performance metrics storage
const metrics = {
  LCP: null,
  FID: null,
  CLS: null,
  FCP: null,
  TTFB: null,
  customMetrics: {}
};

// Callbacks for when metrics are collected
const callbacks = [];

/**
 * Report a metric to all registered callbacks
 */
const reportMetric = (metric) => {
  const { name, value, rating, id } = metric;

  metrics[name] = {
    value,
    rating,
    id,
    timestamp: Date.now()
  };

  // Call all registered callbacks
  callbacks.forEach(callback => {
    try {
      callback(metric);
    } catch (error) {
      console.error('Error in web vitals callback:', error);
    }
  });

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    const color = rating === 'good' ? '#10b981' : rating === 'needs-improvement' ? '#f59e0b' : '#ef4444';
    console.log(
      `%c[Web Vital] ${name}: ${value.toFixed(2)} (${rating})`,
      `color: ${color}; font-weight: bold;`
    );
  }
};

/**
 * Initialize web vitals monitoring
 * Uses the web-vitals library pattern with native Performance API fallback
 */
export const initWebVitals = (onMetric) => {
  if (onMetric) {
    callbacks.push(onMetric);
  }

  // Check if Performance API is available
  if (typeof window === 'undefined' || !('performance' in window)) {
    console.warn('Performance API not available');
    return;
  }

  // Observe Largest Contentful Paint (LCP)
  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];

      reportMetric({
        name: 'LCP',
        value: lastEntry.startTime,
        rating: lastEntry.startTime <= 2500 ? 'good' : lastEntry.startTime <= 4000 ? 'needs-improvement' : 'poor',
        id: `lcp-${Date.now()}`
      });
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {
    // LCP not supported
  }

  // Observe First Input Delay (FID)
  try {
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry) => {
        const fid = entry.processingStart - entry.startTime;

        reportMetric({
          name: 'FID',
          value: fid,
          rating: fid <= 100 ? 'good' : fid <= 300 ? 'needs-improvement' : 'poor',
          id: `fid-${Date.now()}`
        });
      });
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch (e) {
    // FID not supported
  }

  // Observe Cumulative Layout Shift (CLS)
  try {
    let clsValue = 0;
    let clsEntries = [];

    const clsObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();

      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push(entry);
        }
      });

      reportMetric({
        name: 'CLS',
        value: clsValue,
        rating: clsValue <= 0.1 ? 'good' : clsValue <= 0.25 ? 'needs-improvement' : 'poor',
        id: `cls-${Date.now()}`
      });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
    // CLS not supported
  }

  // Observe First Contentful Paint (FCP)
  try {
    const fcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');

      if (fcpEntry) {
        reportMetric({
          name: 'FCP',
          value: fcpEntry.startTime,
          rating: fcpEntry.startTime <= 1800 ? 'good' : fcpEntry.startTime <= 3000 ? 'needs-improvement' : 'poor',
          id: `fcp-${Date.now()}`
        });
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch (e) {
    // FCP not supported
  }

  // Calculate Time to First Byte (TTFB)
  try {
    const navigationEntry = performance.getEntriesByType('navigation')[0];
    if (navigationEntry) {
      const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;

      reportMetric({
        name: 'TTFB',
        value: ttfb,
        rating: ttfb <= 800 ? 'good' : ttfb <= 1800 ? 'needs-improvement' : 'poor',
        id: `ttfb-${Date.now()}`
      });
    }
  } catch (e) {
    // TTFB not supported
  }
};

/**
 * Track custom performance metric
 */
export const trackCustomMetric = (name, value, unit = 'ms') => {
  metrics.customMetrics[name] = {
    value,
    unit,
    timestamp: Date.now()
  };

  if (process.env.NODE_ENV === 'development') {
    console.log(`%c[Custom Metric] ${name}: ${value}${unit}`, 'color: #a855f7;');
  }
};

/**
 * Measure time for an async operation
 */
export const measureAsync = async (name, asyncFn) => {
  const start = performance.now();

  try {
    const result = await asyncFn();
    const duration = performance.now() - start;
    trackCustomMetric(name, duration);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    trackCustomMetric(`${name}_error`, duration);
    throw error;
  }
};

/**
 * Get all collected metrics
 */
export const getMetrics = () => ({
  ...metrics,
  timestamp: Date.now()
});

/**
 * Track Three.js/WebGL specific metrics
 */
export const trackThreeJSMetrics = (renderer) => {
  if (!renderer || !renderer.info) return null;

  const info = renderer.info;
  const threeMetrics = {
    drawCalls: info.render?.calls || 0,
    triangles: info.render?.triangles || 0,
    points: info.render?.points || 0,
    lines: info.render?.lines || 0,
    geometries: info.memory?.geometries || 0,
    textures: info.memory?.textures || 0,
    programs: info.programs?.length || 0
  };

  metrics.customMetrics.threejs = {
    ...threeMetrics,
    timestamp: Date.now()
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('%c[Three.js Metrics]', 'color: #22d3ee;', threeMetrics);
  }

  return threeMetrics;
};

/**
 * Create a performance mark
 */
export const mark = (name) => {
  if (performance.mark) {
    performance.mark(name);
  }
};

/**
 * Measure between two marks
 */
export const measure = (name, startMark, endMark) => {
  if (performance.measure) {
    try {
      performance.measure(name, startMark, endMark);
      const entries = performance.getEntriesByName(name, 'measure');
      if (entries.length > 0) {
        trackCustomMetric(name, entries[entries.length - 1].duration);
      }
    } catch (e) {
      // Marks may not exist
    }
  }
};

const webVitals = {
  initWebVitals,
  trackCustomMetric,
  measureAsync,
  getMetrics,
  trackThreeJSMetrics,
  mark,
  measure
};

export default webVitals;
