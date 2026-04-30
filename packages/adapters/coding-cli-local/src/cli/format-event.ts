import pc from "picocolors";

export function printCodingCliLocalStreamEvent(raw: string, debug: boolean): void {
  const line = raw.trim();
  if (!line) return;
  if (!debug) {
    console.log(line);
    return;
  }
  console.log(pc.gray(line));
}
