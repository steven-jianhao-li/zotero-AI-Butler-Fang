import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: options.capture ? "pipe" : "inherit",
    shell: process.platform === "win32",
    encoding: "utf8",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result.stdout?.trim() ?? "";
}

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

const localTags = run("git", ["tag", "--list"], { capture: true })
  .split(/\r?\n/)
  .map((tag) => tag.trim())
  .filter(Boolean);
const nonFangTags = localTags.filter((tag) => !tag.startsWith("Fang_v"));

for (const tag of nonFangTags) {
  run("git", ["tag", "-d", tag]);
}

if (nonFangTags.length > 0) {
  console.log(
    `Removed ${nonFangTags.length} non-Fang local tags before release.`,
  );
}

const command = process.platform === "win32" ? "npx.cmd" : "npx";
run(command, ["zotero-plugin", "release", ...process.argv.slice(2)]);
