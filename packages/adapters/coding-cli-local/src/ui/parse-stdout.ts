import type { TranscriptEntry } from "@paperclipai/adapter-utils";

export function parseCodingCliLocalStdoutLine(line: string, ts: string): TranscriptEntry[] {
  const text = line.trim();
  if (!text) return [];
  return [{ kind: "stdout", ts, text: line }];
}
