const Module = require("node:module");
const path = require("node:path");

const eslintTypeScript = require(
  path.join(
    process.cwd(),
    "node_modules",
    "@zotero-plugin",
    "eslint-config",
    "node_modules",
    "typescript",
  ),
);
const originalLoad = Module._load;

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "typescript") {
    return eslintTypeScript;
  }
  return originalLoad.call(this, request, parent, isMain);
};
