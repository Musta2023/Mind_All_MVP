export const API_URL = (function() {
  let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  // Ensure protocol
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  // Ensure trailing slash for base URL
  return url.endsWith('/') ? url : `${url}/`;
})();

export interface ApiOptions extends RequestInit {
  searchParams?: Record<string, string | number | boolean>;
}

export class ApiClient {
  static async request<T = any>(
    endpoint: string,
    options: ApiOptions = {},
  ): Promise<T> {
    const { searchParams, ...fetchOptions } = options;

    // Remove leading slash from endpoint since API_URL already has a trailing slash
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = new URL(cleanEndpoint, API_URL);

    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    // Use the Headers API for robust header management
    const headers = new Headers(fetchOptions.headers);
    
    // Only set default content-type if not using FormData
    const isFormData = fetchOptions.body?.constructor?.name === 'FormData';
    if (!headers.has('Content-Type') && !isFormData) {
      headers.set('Content-Type', 'application/json');
    }

    // Add auth token if available
    const token = await getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url.toString(), {
      ...fetchOptions,
      headers,
      credentials: 'include',
    });

    if (response.status === 401) {
      // Token expired, try refresh
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Retry with new token
        return this.request<T>(endpoint, options);
      }
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    const text = await response.text();
    return text as unknown as T;
  }

  static get<T = any>(endpoint: string, options?: ApiOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  static post<T = any>(endpoint: string, data?: any, options?: ApiOptions) {
    const body = data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined);
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body,
    });
  }

  static patch<T = any>(endpoint: string, data?: any, options?: ApiOptions) {
    const body = data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined);
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body,
    });
  }

  static delete<T = any>(endpoint: string, options?: ApiOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Token management
let accessToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export async function setAccessToken(token: string) {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (accessToken) return accessToken;

  if (typeof window !== 'undefined') {
    accessToken = localStorage.getItem('accessToken');
  }

  return accessToken;
}

export async function clearAccessToken() {
  accessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribeTokenRefresh((token) => {
        resolve(token);
      });
    });
  }

  isRefreshing = true;

  try {
    const refreshUrl = new URL('auth/refresh', API_URL).toString();
    const response = await fetch(refreshUrl, {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      const newToken = data.accessToken;

      if (newToken) {
        await setAccessToken(newToken);
        onTokenRefreshed(newToken);
        return newToken;
      }
    }

    // If we reach here, refresh failed
    await clearAccessToken();
    return null;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    await clearAccessToken();
    return null;
  } finally {
    isRefreshing = false;
  }
}
