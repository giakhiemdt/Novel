import type { BaseResponse } from "../types/api";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

const request = async <T>(path: string, options?: RequestOptions) => {
  const { headers, ...rest } = options ?? {};
  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const message = payload?.message ?? response.statusText;
    throw new Error(message || "Request failed");
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as BaseResponse<T>).data;
  }

  return payload as T;
};

const requestRaw = async <T>(path: string, options?: RequestOptions) => {
  const { headers, ...rest } = options ?? {};
  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const message = payload?.message ?? response.statusText;
    throw new Error(message || "Request failed");
  }

  return payload as T;
};

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: "GET", ...(options ?? {}) }),
  getRaw: <T>(path: string, options?: RequestOptions) =>
    requestRaw<T>(path, { method: "GET", ...(options ?? {}) }),
  post: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, { method: "POST", body, ...(options ?? {}) }),
  put: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, { method: "PUT", body, ...(options ?? {}) }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: "DELETE", ...(options ?? {}) }),
};
