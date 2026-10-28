// Calls to the Medepad Admin API. The sign-in token is kept in this browser only.
import type { Admin, AiInfo, Dashboard, Generation, Language, PromptVersion, Template, TemplateSummary } from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001").replace(/\/$/, "");
const TOKEN_KEY = "medepad-admin.token";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const tokenStore = {
  get: () => {
    try {
      return window.localStorage.getItem(TOKEN_KEY) || window.sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string, remember: boolean) => {
    try {
      (remember ? window.localStorage : window.sessionStorage).setItem(TOKEN_KEY, token);
    } catch {}
  },
  clear: () => {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
      window.sessionStorage.removeItem(TOKEN_KEY);
    } catch {}
  },
};

/** Called when the session ends (401) so the app can go back to the login page. */
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Cannot reach the Medepad Admin server. Is the backend running?");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data?.detail;
    const message = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((d) => d.msg).join(", ") : `Request failed (${res.status})`;
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, message);
  }
  return data as T;
}

const json = (body: unknown) => JSON.stringify(body);

/** Downloads a file from the API (needs the sign-in token) and saves it with the name the server gives. */
async function downloadFile(path: string, fallbackName: string) {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new ApiError(0, "Cannot reach the Medepad Admin server. Is the backend running?");
  }
  if (!res.ok) {
    const detail = await res.json().then((d) => d?.detail).catch(() => null);
    throw new ApiError(res.status, typeof detail === "string" ? detail : "Could not download the file");
  }
  const header = res.headers.get("Content-Disposition") || "";
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
  const plain = /filename="([^"]+)"/i.exec(header)?.[1];
  const name = utf8 ? decodeURIComponent(utf8) : plain || fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const api = {
  login: (email: string, password: string, remember: boolean) =>
    request<{ access_token: string; admin: Admin }>("/auth/login", { method: "POST", body: json({ email, password, remember }) }),
  me: () => request<Admin>("/auth/me"),
  changePassword: (current_password: string, new_password: string) =>
    request<void>("/auth/change-password", { method: "POST", body: json({ current_password, new_password }) }),

  dashboard: () => request<Dashboard>("/dashboard"),
  aiSettings: () => request<AiInfo & { languages: Language[] }>("/settings/ai"),

  templates: (withVersions = false) => request<TemplateSummary[]>(`/templates${withVersions ? "?with_versions=true" : ""}`),
  template: (id: number) => request<Template>(`/templates/${id}`),
  createTemplate: (data: {
    name: string;
    group_name: string;
    description: string;
    sections: string[];
    include_codes: boolean;
    is_premium: boolean;
    prompt: string;
  }) => request<Template>("/templates", { method: "POST", body: json(data) }),
  updateTemplate: (id: number, data: Partial<Pick<TemplateSummary, "name" | "group_name" | "description" | "sections" | "include_codes" | "is_premium" | "is_active">>) =>
    request<Template>(`/templates/${id}`, { method: "PATCH", body: json(data) }),
  deleteTemplate: (id: number) => request<void>(`/templates/${id}`, { method: "DELETE" }),
  savePrompt: (templateId: number, content: string, change_note: string, activate: boolean) =>
    request<PromptVersion>(`/templates/${templateId}/prompts`, { method: "POST", body: json({ content, change_note, activate }) }),
  setActivePrompt: (templateId: number, prompt_id: number) =>
    request<Template>(`/templates/${templateId}/active-prompt`, { method: "PUT", body: json({ prompt_id }) }),

  generate: (data: {
    transcript: string;
    template_id?: number | null;
    prompt_id?: number | null;
    prompt_text?: string | null;
    sections?: string[] | null;
    include_codes?: boolean | null;
    language?: string;
  }) => request<Generation>("/generate", { method: "POST", body: json(data) }),
  generations: (templateId?: number, limit = 20) =>
    request<Generation[]>(`/generations?limit=${limit}${templateId ? `&template_id=${templateId}` : ""}`),
  /** Saves the notes of one result as a Word document. */
  downloadGeneration: (id: number) => downloadFile(`/generations/${id}/download`, "notes.docx"),
  /** Saves all results (of one template, or all) as a ZIP of Word files with notes, transcript and prompt. */
  downloadResults: (templateId?: number) =>
    downloadFile(`/generations/export${templateId ? `?template_id=${templateId}` : ""}`, "medepad-results.zip"),
  deleteGeneration: (id: number) => request<void>(`/generations/${id}`, { method: "DELETE" }),

  admins: () => request<Admin[]>("/admins"),
  createAdmin: (data: { name: string; email: string; password: string }) => request<Admin>("/admins", { method: "POST", body: json(data) }),
  updateAdmin: (id: number, data: { name?: string; is_active?: boolean; password?: string }) =>
    request<Admin>(`/admins/${id}`, { method: "PATCH", body: json(data) }),
};
