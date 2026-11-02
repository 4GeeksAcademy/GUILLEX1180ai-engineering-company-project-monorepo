"use client";

export const AUTH_STATE_EVENT = "trackflow:auth-state-changed";
const TOKEN_KEY = "token";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

export interface Profile {
  id?: number;
  user_id?: number;
  name: string | null;
  phone: string | null;
  address: string | null;
}

export interface AuthMeResponse {
  email: string;
  role: "admin" | "manager" | "user";
  profile: Profile | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
}

export interface MessageResponse {
  message: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  address?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getAccessToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function saveAccessToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event(AUTH_STATE_EVENT));
}

export function clearAccessToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } finally {
    window.dispatchEvent(new Event(AUTH_STATE_EVENT));
  }
}

export function logout(): void {
  if (typeof window === "undefined") return;
  try {
    clearAccessToken();
  } finally {
    window.location.assign("/");
  }
}

function errorMessage(detail: unknown, status: number): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((issue) =>
        typeof issue === "object" && issue !== null && "msg" in issue
          ? String(issue.msg)
          : "",
      )
      .filter(Boolean)
      .join(" ");
  }
  if (typeof detail === "object" && detail !== null && "detail" in detail) {
    const nested = detail.detail;
    if (typeof nested === "string") return nested;
  }
  return `La API respondió con HTTP ${status}.`;
}

export function getApiFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !Array.isArray(error.detail)) return {};
  const fields: Record<string, string> = {};
  for (const issue of error.detail) {
    if (typeof issue !== "object" || issue === null || !("loc" in issue)) continue;
    const validationIssue = issue as { loc?: unknown[]; msg?: unknown };
    const field = validationIssue.loc?.at(-1);
    if (typeof field === "string" && typeof validationIssue.msg === "string") {
      fields[field] = validationIssue.msg;
    }
  }
  return fields;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: { authenticated?: boolean; baseUrl?: string } = {},
): Promise<T> {
  if (typeof window === "undefined") {
    throw new Error("apiRequest solo se puede usar desde el navegador.");
  }
  const baseUrl = (options.baseUrl ?? API_BASE_URL)?.replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error(
      "La URL base de la API no está configurada (NEXT_PUBLIC_API_URL / NEXT_PUBLIC_INVENTORY_API_URL).",
    );
  }

  const authenticated = options.authenticated ?? true;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (authenticated) {
    let token: string | null;
    try {
      token = getAccessToken();
    } catch {
      logout();
      throw new ApiError("No se pudo leer la sesión.", 401);
    }
    if (!token) {
      logout();
      throw new ApiError("Sesión no disponible.", 401);
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${baseUrl}${normalizedPath}`, {
    ...init,
    headers,
    cache: "no-store",
    credentials: "omit",
  });
  const body: unknown = response.status === 204
    ? undefined
    : await response.json().catch(() => undefined);

  if (!response.ok) {
    const detail =
      typeof body === "object" && body !== null && "detail" in body
        ? body.detail
        : body;
    if (response.status === 401 && authenticated) logout();
    throw new ApiError(errorMessage(detail, response.status), response.status, detail);
  }

  return body as T;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const form = new URLSearchParams({ username: email, password });
  const result = await apiRequest<TokenResponse>(
    "/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    },
    { authenticated: false },
  );
  if (!result.access_token) throw new Error("La API no devolvió access_token.");
  saveAccessToken(result.access_token);
  return result;
}

export function registerUser(payload: RegisterPayload): Promise<unknown> {
  return apiRequest(
    "/users",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { authenticated: false },
  );
}

export function getCurrentUser(signal?: AbortSignal): Promise<AuthMeResponse> {
  return apiRequest<AuthMeResponse>("/auth/me", { signal });
}

export function updateMyProfile(
  profile: Pick<Profile, "name" | "phone" | "address">,
): Promise<Profile> {
  return apiRequest<Profile>("/profiles/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
}

export function requestPasswordReset(email: string): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(
    "/auth/forgot-password",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    },
    { authenticated: false },
  );
}

export function resetPassword(
  token: string,
  newPassword: string,
): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(
    "/auth/reset-password",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: newPassword }),
    },
    { authenticated: false },
  );
}

export function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<MessageResponse> {
  return apiRequest<MessageResponse>("/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}