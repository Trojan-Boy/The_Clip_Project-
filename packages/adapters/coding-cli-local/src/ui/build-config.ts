import type { CreateConfigValues } from "@paperclipai/adapter-utils";

function parseCommaArgs(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildCodingCliLocalConfig(v: CreateConfigValues): Record<string, unknown> {
  const ac: Record<string, unknown> = {};
  if (v.cwd) ac.cwd = v.cwd;
  if (v.command) ac.command = v.command;
  if (v.args) ac.args = parseCommaArgs(v.args);
  ac.timeoutSec = 0;
  ac.graceSec = 20;
  return ac;
}
