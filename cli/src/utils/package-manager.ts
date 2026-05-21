export function resolvePnpmExecutable(): string {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function quoteWindowsShellArg(value: string): string {
  if (value.length === 0) return '""';
  if (!/[\s"]/u.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

export function resolvePnpmInvocation(args: string[]): { command: string; args: string[] } {
  if (process.platform !== "win32") {
    return {
      command: resolvePnpmExecutable(),
      args,
    };
  }

  const commandLine = ["pnpm", ...args].map(quoteWindowsShellArg).join(" ");
  return {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", commandLine],
  };
}
