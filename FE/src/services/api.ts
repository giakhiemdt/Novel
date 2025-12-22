import type { BaseResponse } from "../types/api";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

const request = async <T>(path: string, options?: RequestOptions) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
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

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body }),
};
