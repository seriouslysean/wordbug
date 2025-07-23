import type { LogContext } from '~types/utils';

/**
 * Track a page view in Google Analytics
 */
export function trackPageView(path?: string): void {
  if (!__GA_ENABLED__ || typeof gtag === 'undefined') {
    return;
  }
  
  gtag('config', __GA_MEASUREMENT_ID__, {
    page_path: path,
  });
}

/**
 * Track a custom event in Google Analytics
 */
export function trackEvent(eventName: string, parameters: LogContext = {}): void {
  if (!__GA_ENABLED__ || typeof gtag === 'undefined') {
    return;
  }
  
  gtag('event', eventName, parameters);
}

/**
 * Track an error event in Google Analytics
 */
export function trackError(error: Error | string, context: LogContext = {}): void {
  if (!__GA_ENABLED__ || typeof gtag === 'undefined') {
    return;
  }
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  gtag('event', 'exception', {
    description: errorMessage,
    fatal: false,
    ...context,
  });
}

// Global gtag function declaration
declare global {
  function gtag(...args: any[]): void;
}