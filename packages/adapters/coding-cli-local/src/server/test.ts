import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@paperclipai/adapter-utils";
import {
  asString,
  ensureAbsoluteDirectory,
  ensureCommandResolvable,
  ensurePathInEnv,
  parseObject,
} from "@paperclipai/adapter-utils/server-utils";

function summarizeStatus(checks: AdapterEnvironmentCheck[]): AdapterEnvironmentTestResult["status"] {
  if (checks.some((check) => check.level === "error")) return "fail";
  if (checks.some((check) => check.level === "warn")) return "warn";
  return "pass";
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const config = parseObject(ctx.config);
  const command = asString(config.command, "").trim();
  const cwd = asString(config.cwd, process.cwd());

  if (!command) {
    checks.push({
      code: "coding_cli_command_missing",
      level: "error",
      message: "coding_cli_local requires adapterConfig.command.",
      hint: "Set adapterConfig.command to your local coding CLI executable.",
    });
  } else {
    checks.push({
      code: "coding_cli_command_present",
      level: "info",
      message: `Configured command: ${command}`,
    });
  }

  try {
    await ensureAbsoluteDirectory(cwd);
    checks.push({
      code: "coding_cli_cwd_valid",
      level: "info",
      message: `Working directory is valid: ${cwd}`,
    });
  } catch (err) {
    checks.push({
      code: "coding_cli_cwd_invalid",
      level: "error",
      message: err instanceof Error ? err.message : "Invalid working directory",
      detail: cwd,
    });
  }

  if (command) {
    const envConfig = parseObject(config.env);
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(envConfig)) {
      if (typeof value === "string") env[key] = value;
    }
    const runtimeEnv = ensurePathInEnv({ ...process.env, ...env });
    try {
      await ensureCommandResolvable(command, cwd, runtimeEnv);
      checks.push({
        code: "coding_cli_command_resolvable",
        level: "info",
        message: `Command is executable: ${command}`,
      });
    } catch (err) {
      checks.push({
        code: "coding_cli_command_unresolvable",
        level: "error",
        message: err instanceof Error ? err.message : "Command is not executable",
        detail: command,
      });
    }
  }

  return {
    adapterType: ctx.adapterType,
    status: summarizeStatus(checks),
    checks,
    testedAt: new Date().toISOString(),
  };
}
