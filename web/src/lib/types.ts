// Shapes returned by the Medepad Admin API (/api/v1).

export interface Admin {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface PromptVersion {
  id: number;
  template_id: number;
  version: number;
  content: string;
  change_note: string;
  created_at: string;
  created_by_name: string | null;
}

export interface TemplateSummary {
  id: number;
  name: string;
  description: string;
  group_name: string;
  sections: string[];
  include_codes: boolean;
  is_premium: boolean;
  is_active: boolean;
  active_prompt_id: number | null;
  active_version: number | null;
  prompt_count: number;
  updated_at: string;
  /** only when asked for (Settings page) */
  versions: { id: number; version: number; change_note: string; created_at: string }[];
}

export interface Template extends TemplateSummary {
  prompts: PromptVersion[];
}

export interface NoteResult {
  title?: string;
  summary: string;
  sections: { title: string; content: string }[];
  diagnostic_codes: { code: string; description: string; verified: boolean }[];
  provider: string;
  model: string;
}

export interface Generation {
  id: number;
  template_id: number | null;
  template_name: string | null;
  prompt_id: number | null;
  prompt_version: number | null;
  prompt_text: string;
  transcript: string;
  language: string;
  result: NoteResult | null;
  provider: string;
  model: string;
  latency_ms: number;
  success: boolean;
  error: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface AiInfo {
  provider: "gemini" | "openai" | "azure_openai" | "mock";
  model: string;
  ready: boolean;
}

export interface Dashboard {
  templates: number;
  active_templates: number;
  prompts: number;
  admins: number;
  generations_total: number;
  generations_today: number;
  groups: { name: string; count: number }[];
  recently_changed: { id: number; name: string; group_name: string; updated_at: string; active_version: number | null }[];
  ai: AiInfo;
}

export interface Language {
  code: string;
  name: string;
}
