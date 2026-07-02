const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const BASE = API_ORIGIN ? `${API_ORIGIN}/api` : "/api";

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

export async function apiFetch(path, options = {}) {
  const token = getCookie("token");
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  if (!isFormData && options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
  if (res.status === 401) {
    document.cookie = "token=; Max-Age=0; path=/";
    document.cookie = "user=; Max-Age=0; path=/";
    window.location.href = "/login";
    return;
  }
  if (res.status === 204) return null;
  try {
    const data = await res.json();
    if (!res.ok) {
      const errorMessage =
        data.message ||
        data.error ||
        data.details ||
        `Request failed with status ${res.status}`;
      throw new Error(errorMessage);
    }
    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      if (res.ok) return { success: true };
      throw new Error(`Server returned non-JSON`);
    }
    throw error;
  }
}

export function getUser() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(^| )user=([^;]+)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[2]));
  } catch {
    return null;
  }
}

export function logout() {
  document.cookie = "token=; Max-Age=0; path=/";
  document.cookie = "user=; Max-Age=0; path=/";
  window.location.href = "/login";
}

export function getMediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return API_ORIGIN ? `${API_ORIGIN}${normalizedPath}` : normalizedPath;
}
