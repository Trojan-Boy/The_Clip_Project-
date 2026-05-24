import type {
  PersonalOperatorAction,
  PersonalOperatorCompanyPermission,
  PersonalOperatorProfile,
  PersonalOperatorRun,
  PersonalOperatorAdapterType,
} from "@paperclipai/shared";
import { api } from "./client";

export interface PersonalOperatorProfilePatch {
  enabled?: boolean;
  defaultAdapterType?: PersonalOperatorAdapterType;
  defaultAdapterConfig?: Record<string, unknown>;
  daemonEnabled?: boolean;
  browserControlEnabled?: boolean;
  desktopControlEnabled?: boolean;
  screenshotVisionEnabled?: boolean;
}

export interface PersonalOperatorPermissionPatch {
  readEnabled?: boolean;
  writeEnabled?: boolean;
  browserControlEnabled?: boolean;
  desktopControlEnabled?: boolean;
  approvalRequired?: boolean;
}

export const personalOperatorApi = {
  profile: () => api.get<PersonalOperatorProfile>("/personal-operator/profile"),
  updateProfile: (patch: PersonalOperatorProfilePatch) =>
    api.patch<PersonalOperatorProfile>("/personal-operator/profile", patch),
  permissions: () => api.get<PersonalOperatorCompanyPermission[]>("/personal-operator/permissions"),
  updatePermission: (companyId: string, patch: PersonalOperatorPermissionPatch) =>
    api.put<PersonalOperatorCompanyPermission>(`/personal-operator/permissions/${companyId}`, patch),
  createSession: (daemonBaseUrl?: string) =>
    api.post<{ id: string; daemonBaseUrl: string }>("/personal-operator/sessions", { daemonBaseUrl }),
  createDaemonToken: (sessionId: string) =>
    api.post<{ token: string; expiresAt: string }>(`/personal-operator/sessions/${sessionId}/daemon-token`, {}),
  daemonHealth: (baseUrl?: string) => {
    const suffix = baseUrl ? `?baseUrl=${encodeURIComponent(baseUrl)}` : "";
    return api.get<{ ok: boolean; daemon: Record<string, unknown> }>(`/personal-operator/daemon/health${suffix}`);
  },
  runs: () => api.get<PersonalOperatorRun[]>("/personal-operator/runs"),
  createRun: (data: {
    companyId?: string | null;
    prompt: string;
    adapterType?: PersonalOperatorAdapterType;
    adapterConfig?: Record<string, unknown>;
  }) => api.post<PersonalOperatorRun>("/personal-operator/runs", data),
  recordAction: (runId: string, data: Omit<PersonalOperatorAction, "id" | "runId" | "userId" | "createdAt" | "updatedAt">) =>
    api.post<PersonalOperatorAction>(`/personal-operator/runs/${runId}/actions`, data),
};
