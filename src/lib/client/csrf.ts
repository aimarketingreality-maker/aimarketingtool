import { CSRF_CONFIG } from '@/lib/security';

/**
 * Get CSRF token from cookies
 */
export function getCSRFToken(): string | null {
  if (typeof document === 'undefined') {
    return null; // Server-side rendering
  }

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === CSRF_CONFIG.cookieName) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

/**
 * Add CSRF token to request headers
 */
export function addCSRFToHeaders(headers: HeadersInit = {}): HeadersInit {
  const csrfToken = getCSRFToken();

  if (csrfToken) {
    return {
      ...headers,
      [CSRF_CONFIG.headerName]: csrfToken,
    };
  }

  return headers;
}

/**
 * Create fetch wrapper with CSRF protection
 */
export async function secureFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method?.toUpperCase() || 'GET';

  // Only add CSRF token to state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    options.headers = addCSRFToHeaders(options.headers);
  }

  return fetch(url, options);
}

/**
 * Hook for CSRF token (for React components)
 */
export function useCSRFToken() {
  return getCSRFToken();
}

/**
 * Check if CSRF token is available
 */
export function hasCSRFToken(): boolean {
  return !!getCSRFToken();
}

/**
 * Refresh CSRF token by making a request to a protected page
 */
export async function refreshCSRFToken(): Promise<boolean> {
  try {
    // Make a GET request to a protected page to get a new token
    const response = await fetch('/builder/templates');
    return response.ok;
  } catch (error) {
    console.error('Failed to refresh CSRF token:', error);
    return false;
  }
}

/**
 * Create an XMLHttpRequest with CSRF protection
 */
export function createSecureXMLHttpRequest(): XMLHttpRequest {
  const xhr = new XMLHttpRequest();

  // Override open method to add CSRF token
  const originalOpen = xhr.open;
  xhr.open = function(method: string, url: string | URL, async?: boolean, user?: string | null, password?: string | null) {
    const result = originalOpen.call(this, method, url, async ?? true, user, password);

    // Add CSRF token for state-changing methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
      const csrfToken = getCSRFToken();
      if (csrfToken) {
        xhr.setRequestHeader(CSRF_CONFIG.headerName, csrfToken);
      }
    }

    return result;
  };

  return xhr;
}