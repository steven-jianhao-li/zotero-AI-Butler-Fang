import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const [, , ...args] = process.argv;

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    stdio: options.capture ? "pipe" : "inherit",
    shell: process.platform === "win32",
    encoding: "utf8",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result.stdout?.trim() ?? "";
}

function normalizeBaseVersion(version) {
  return version.replace(/-fang\.\d+$/, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function listFangTags(baseVersion) {
  run("git", ["fetch", "origin", "--tags", "--prune"]);
  const tags = run("git", ["tag", "--list", `v${baseVersion}-fang.*`], {
    capture: true,
  });
  if (!tags) {
    return [];
  }
  return tags
    .split(/\r?\n/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getNextFangVersion(baseVersion) {
  const escapedBaseVersion = escapeRegExp(baseVersion);
  const suffixes = listFangTags(baseVersion)
    .map((tag) =>
      tag.match(new RegExp(`^v${escapedBaseVersion}-fang\\.(\\d+)$`)),
    )
    .filter(Boolean)
    .map((match) => Number(match[1]))
    .filter(Number.isFinite);
  const nextSuffix = suffixes.length === 0 ? 1 : Math.max(...suffixes) + 1;
  return `${baseVersion}-fang.${nextSuffix}`;
}

function runScaffoldRelease(scaffoldArgs) {
  const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
  run(npxCommand, ["zotero-plugin", "release", ...scaffoldArgs]);
}

if (process.env.CI) {
  runScaffoldRelease(args);
  process.exit(0);
}

const explicitVersion = args.find((arg) => !arg.startsWith("-"));
const scaffoldArgs = [...args];

if (!explicitVersion) {
  const baseVersion = normalizeBaseVersion(packageJson.version);
  const nextVersion = getNextFangVersion(baseVersion);
  console.log(
    `Fang release: ${packageJson.version} -> ${nextVersion} (${basename(process.cwd())})`,
  );
  scaffoldArgs.unshift(nextVersion);
}

runScaffoldRelease(scaffoldArgs);
