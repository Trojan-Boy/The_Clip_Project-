import type { UIAdapterModule } from "../types";
import { parseCodingCliLocalStdoutLine, buildCodingCliLocalConfig } from "@paperclipai/adapter-coding-cli-local/ui";
import { CodingCliLocalConfigFields } from "./config-fields";

export const codingCliLocalUIAdapter: UIAdapterModule = {
  type: "coding_cli_local",
  label: "Coding CLI (local)",
  parseStdoutLine: parseCodingCliLocalStdoutLine,
  ConfigFields: CodingCliLocalConfigFields,
  buildAdapterConfig: buildCodingCliLocalConfig,
};
