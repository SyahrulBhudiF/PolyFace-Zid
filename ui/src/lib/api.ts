export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1];
}

function withCsrf(headers?: HeadersInit): HeadersInit {
  const csrf = getCookie("csrf_access_token");
  return {
    ...headers,
    ...(csrf ? { "X-CSRF-TOKEN": csrf } : {}),
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  let body: any = null;

  if (contentType?.includes("application/json")) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof body === "string"
        ? body
        : body?.message ||
          body?.error?.message ||
          body?.error ||
          "Request failed";

    throw new ApiError(message, response.status, body);
  }

  return body as T;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: withCsrf({
      "Content-Type": "application/json",
      ...options?.headers,
    }),
  });

  return handleResponse<T>(response);
}

export const api = {
  get: <T>(endpoint: string): Promise<T> =>
    request<T>(endpoint, { method: "GET" }),

  post: <T>(
    endpoint: string,
    _token?: string | null,
    data?: unknown,
  ): Promise<T> =>
    request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(
    endpoint: string,
    _token?: string | null,
    data?: unknown,
  ): Promise<T> =>
    request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string): Promise<T> =>
    request<T>(endpoint, { method: "DELETE" }),

  upload: async <T>(
    endpoint: string,
    _token?: string | null,
    formData: FormData,
  ): Promise<T> => {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${API_BASE}${endpoint}`;

    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: withCsrf(), // ⚠️ NO Content-Type
      body: formData,
    });

    return handleResponse<T>(response);
  },

  download: async (endpoint: string): Promise<Blob> => {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${API_BASE}${endpoint}`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: withCsrf(),
    });

    if (!response.ok) {
      throw new ApiError("Download failed", response.status);
    }

    return response.blob();
  },
};

export function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | undefined>,
): string {
  if (!params) return endpoint;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.append(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `${endpoint}?${query}` : endpoint;
}
