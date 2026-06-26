import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

if (!existsSync("package.json")) {
  console.error(
    "Release must be run from the repository root: zotero-AI-Butler-Fang.",
  );
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const repoUrl = packageJson.repository?.url ?? "";

if (!repoUrl.includes("zotero-AI-Butler-Fang")) {
  console.error(
    `Refusing to release: package.json repository is not Fang (${repoUrl}).`,
  );
  process.exit(1);
}

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(
  command,
  ["zotero-plugin", "release", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

process.exit(result.status ?? 1);
