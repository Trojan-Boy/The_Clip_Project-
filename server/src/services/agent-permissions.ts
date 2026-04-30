export type NormalizedAgentPermissions = Record<string, unknown> & {
  canCreateAgents: boolean;
};

const LEADERSHIP_ROLES = new Set([
  "ceo",
  "cto",
  "cmo",
  "cfo",
  "pm",
]);

export function roleDefaultsToAgentCreation(role: string): boolean {
  return LEADERSHIP_ROLES.has(role.toLowerCase());
}

export function defaultPermissionsForRole(role: string): NormalizedAgentPermissions {
  return {
    canCreateAgents: roleDefaultsToAgentCreation(role),
  };
}

export function normalizeAgentPermissions(
  permissions: unknown,
  role: string,
): NormalizedAgentPermissions {
  const defaults = defaultPermissionsForRole(role);
  if (typeof permissions !== "object" || permissions === null || Array.isArray(permissions)) {
    return defaults;
  }

  const record = permissions as Record<string, unknown>;
  return {
    canCreateAgents:
      typeof record.canCreateAgents === "boolean"
        ? record.canCreateAgents
        : defaults.canCreateAgents,
  };
}
