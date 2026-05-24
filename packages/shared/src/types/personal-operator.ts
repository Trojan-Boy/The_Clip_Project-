export type PersonalOperatorAdapterType = "hermes_local" | "openclaw_gateway" | "openrouter" | "ollama";

export type PersonalOperatorRunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type PersonalOperatorActionStatus = "queued" | "running" | "succeeded" | "failed" | "blocked";
export type PersonalOperatorActionMethod =
  | "paperclip_api"
  | "browser_dom"
  | "browser_accessibility"
  | "screenshot_vision"
  | "desktop_mouse_keyboard";

export interface PersonalOperatorSecretRef {
  type: "secret_ref";
  secretId: string;
  version?: "latest" | number;
}

export interface PersonalOperatorProfile {
  id: string | null;
  userId: string;
  enabled: boolean;
  defaultAdapterType: PersonalOperatorAdapterType;
  defaultAdapterConfig: Record<string, unknown>;
  daemonEnabled: boolean;
  browserControlEnabled: boolean;
  desktopControlEnabled: boolean;
  screenshotVisionEnabled: boolean;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface PersonalOperatorCompanyPermission {
  id: string;
  userId: string;
  companyId: string;
  readEnabled: boolean;
  writeEnabled: boolean;
  browserControlEnabled: boolean;
  desktopControlEnabled: boolean;
  approvalRequired: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PersonalOperatorRun {
  id: string;
  userId: string;
  sessionId: string | null;
  companyId: string | null;
  status: PersonalOperatorRunStatus;
  adapterType: PersonalOperatorAdapterType;
  adapterConfig: Record<string, unknown>;
  prompt: string;
  summary: string | null;
  error: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  startedAt: Date | string | null;
  finishedAt: Date | string | null;
}

export interface PersonalOperatorAction {
  id: string;
  runId: string;
  userId: string;
  companyId: string | null;
  kind: string;
  method: PersonalOperatorActionMethod;
  target: string | null;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  status: PersonalOperatorActionStatus;
  requiresApproval: boolean;
  approvalId: string | null;
  error: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}
