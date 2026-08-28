const API_BASE_URL = "http://localhost:3000/api";

import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "./tokenStore";

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refreshToken`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        clearAccessToken();
        return null;
      }

      const data = (await response.json()) as { accessToken?: string };

      if (!data.accessToken) {
        clearAccessToken();
        return null;
      }

      setAccessToken(data.accessToken);
      return data.accessToken;
    } catch {
      clearAccessToken();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(
  endpoint: string,
  options: ApiRequestOptions,
  accessToken: string | null,
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

export async function apiClient<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  let response = await request(endpoint, options, getAccessToken());

  if (response.status === 401 && endpoint !== "/auth/refreshToken") {
    const newAccessToken = await refreshAccessToken();

    if (newAccessToken) {
      response = await request(endpoint, options, newAccessToken);
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data as T;
}
